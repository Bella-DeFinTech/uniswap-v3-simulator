import { EventType } from "../enum/EventType";
import { EventDBManager } from "../manager/EventDBManager";
import { providers } from "ethers";
import { accessSync, constants } from "fs";
import { basename } from "path";
import { UniswapV3Pool2__factory as UniswapV3PoolFactory } from "../typechain/factories/UniswapV3Pool2__factory";
import { UniswapV3Pool2 as UniswapV3Pool } from "../typechain/UniswapV3Pool2";
import { ConfigurableCorePool, PoolConfig } from "..";
import { LiquidityEvent } from "../entity/LiquidityEvent";
import { SwapEvent } from "../entity/SwapEvent";
import { SQLiteSimulationDataManager } from "../manager/SQLiteSimulationDataManager";
import { SimulationDataManager } from "../interface/SimulationDataManager";
import { printParams } from "../util/Serializer";
import JSBI from "jsbi";
import { ZERO } from "../enum/InternalConstants";
import { PoolState } from "../model/PoolState";
import { ConfigurableCorePool as ConfigurableCorePoolImpl } from "../core/ConfigurableCorePool";
import { SimulatorConsoleVisitor } from "../manager/SimulatorConsoleVisitor";
import { SimulatorPersistenceVisitor } from "../manager/SimulatorPersistenceVisitor";
import { SimulatorRoadmapManager } from "../manager/SimulatorRoadmapManager";
import {
  EndBlockTypeWhenInit,
  EndBlockTypeWhenRecover,
} from "../entity/EndBlockType";
import { loadConfig } from "../config/TunerConfig";

export class MainnetDataDownloader {
  private RPCProvider: providers.JsonRpcProvider;

  constructor(RPCProviderUrl?: string) {
    if (RPCProviderUrl == undefined) {
      let tunerConfig = loadConfig(undefined);
      RPCProviderUrl = tunerConfig.RPCProviderUrl;
    }
    this.RPCProvider = new providers.JsonRpcProvider(RPCProviderUrl);
  }

  async queryDeploymentBlockNumber(poolAddress: string): Promise<number> {
    // TODO how to know accurate block number on contract deployment?
    // Maybe use etherscan API or scan back mainnet trxs through the first event the contract emitted.
    // BTW, for most cases, it's the same as Initialization event block number. Let's take this now.
    return this.queryInitializationBlockNumber(poolAddress);
  }

  async queryInitializationBlockNumber(poolAddress: string): Promise<number> {
    let uniswapV3Pool = await this.getCorePoolContarct(poolAddress);
    let initializeTopic = uniswapV3Pool.filters.Initialize();
    let initializationEvent = await uniswapV3Pool.queryFilter(initializeTopic);
    return initializationEvent[0].blockNumber;
  }

  async parseEndBlockTypeWhenInit(
    toBlock: EndBlockTypeWhenInit,
    poolAddress: string
  ): Promise<number> {
    switch (toBlock) {
      case "latest":
        return (await this.RPCProvider.getBlock("latest")).number;
      case "afterDeployment":
        return await this.queryDeploymentBlockNumber(poolAddress);
      case "afterInitialization":
        return await this.queryInitializationBlockNumber(poolAddress);
      default:
        let latestOnChain = (await this.RPCProvider.getBlock("latest")).number;
        return toBlock > latestOnChain ? latestOnChain : toBlock;
    }
  }

  async parseEndBlockTypeWhenRecover(
    latestDownloadedEventBlockNumber: number,
    toBlock: EndBlockTypeWhenRecover,
    poolAddress: string
  ): Promise<number> {
    switch (toBlock) {
      case "latestOnChain":
        return (await this.RPCProvider.getBlock("latest")).number;
      case "latestDownloaded":
        return latestDownloadedEventBlockNumber;
      case "afterDeployment":
        return await this.queryDeploymentBlockNumber(poolAddress);
      case "afterInitialization":
        return await this.queryInitializationBlockNumber(poolAddress);
      default:
        let latestOnChain = (await this.RPCProvider.getBlock("latest")).number;
        return toBlock > latestOnChain ? latestOnChain : toBlock;
    }
  }

  generateMainnetEventDBFilePath(
    poolName: string,
    poolAddress: string
  ): string {
    return `${poolName}_${poolAddress}.db`;
  }

  parseFromMainnetEventDBFilePath(filePath: string): {
    poolName: string;
    poolAddress: string;
  } {
    let fileName = basename(filePath, ".db");
    let nameArr = fileName.split("_");
    return { poolName: nameArr[0], poolAddress: nameArr[1] };
  }

  async download(
    poolName: string = "",
    poolAddress: string,
    toBlock: EndBlockTypeWhenInit,
    batchSize: number = 500
  ) {
    // check toBlock first
    let toBlockAsNumber = await this.parseEndBlockTypeWhenInit(
      toBlock,
      poolAddress
    );

    let uniswapV3Pool = await this.getCorePoolContarct(poolAddress);
    let deploymentBlockNumber = await this.queryDeploymentBlockNumber(
      poolAddress
    );
    if (toBlockAsNumber < deploymentBlockNumber)
      throw new Error(
        `The pool does not exist at block height: ${toBlockAsNumber}, it was deployed at block height: ${deploymentBlockNumber}`
      );

    let initializeTopic = uniswapV3Pool.filters.Initialize();
    let initializationEvent = await uniswapV3Pool.queryFilter(initializeTopic);
    let initializationSqrtPriceX96 = initializationEvent[0].args.sqrtPriceX96;
    let initializationEventBlockNumber = initializationEvent[0].blockNumber;

    // check db file then
    let filePath = this.generateMainnetEventDBFilePath(poolName, poolAddress);
    let dbExists = false;
    try {
      accessSync(filePath, constants.F_OK);
      dbExists = true;
    } catch (err) {}
    if (dbExists)
      throw new Error(
        `The database file: ${filePath} already exists. You can either try to update or delete the database file.`
      );

    let eventDB = await EventDBManager.buildInstance(filePath);
    try {
      // query and record poolConfig
      let poolConfig = new PoolConfig(
        await uniswapV3Pool.tickSpacing(),
        await uniswapV3Pool.token0(),
        await uniswapV3Pool.token1(),
        await uniswapV3Pool.fee()
      );
      await eventDB.addPoolConfig(poolConfig);
      await eventDB.saveLatestEventBlockNumber(deploymentBlockNumber);

      if (toBlock == "afterDeployment") return;

      // record initialize event
      await eventDB.addInitialSqrtPriceX96(
        initializationSqrtPriceX96.toString()
      );
      await eventDB.saveInitializationEventBlockNumber(
        initializationEventBlockNumber
      );
      await eventDB.saveLatestEventBlockNumber(initializationEventBlockNumber);

      if (toBlock == "afterInitialization") return;

      // download events after initialization
      await this.downloadEvents(
        uniswapV3Pool,
        eventDB,
        initializationEventBlockNumber,
        toBlockAsNumber,
        batchSize
      );

      await this.preProcessSwapEvent(eventDB);
    } finally {
      await eventDB.close();
    }
  }

  async update(
    mainnetEventDBFilePath: string,
    toBlock: EndBlockTypeWhenRecover,
    batchSize: number = 500
  ) {
    // check dbfile first
    let { poolAddress } = this.parseFromMainnetEventDBFilePath(
      mainnetEventDBFilePath
    );
    let dbExists = false;
    try {
      accessSync(mainnetEventDBFilePath, constants.F_OK);
      dbExists = true;
    } catch (err) {}
    if (!dbExists)
      throw new Error(
        `The database file: ${mainnetEventDBFilePath} does not exist. Please download the data first.`
      );

    // check toBlock then
    let eventDB = await EventDBManager.buildInstance(mainnetEventDBFilePath);
    try {
      let latestEventBlockNumber = await eventDB.getLatestEventBlockNumber();
      let deploymentBlockNumber = await this.queryDeploymentBlockNumber(
        poolAddress
      );
      let toBlockAsNumber = await this.parseEndBlockTypeWhenRecover(
        latestEventBlockNumber,
        toBlock,
        poolAddress
      );
      if (toBlockAsNumber < deploymentBlockNumber)
        throw new Error("toBlock is too small, the pool hasn't been deployed.");

      if (toBlockAsNumber < latestEventBlockNumber) {
        console.log("It's already up to date.");
        return;
      }

      let uniswapV3Pool = await this.getCorePoolContarct(poolAddress);

      // check and record initialize event if needed
      let updateInitializationEvent = false;
      let initializationEventBlockNumber =
        await eventDB.getInitializationEventBlockNumber();
      if (0 == initializationEventBlockNumber) {
        updateInitializationEvent = true;
        let initializeTopic = uniswapV3Pool.filters.Initialize();
        let initializationEvent = await uniswapV3Pool.queryFilter(
          initializeTopic
        );
        await eventDB.addInitialSqrtPriceX96(
          initializationEvent[0].args.sqrtPriceX96.toString()
        );
        initializationEventBlockNumber = initializationEvent[0].blockNumber;
        await eventDB.saveInitializationEventBlockNumber(
          initializationEventBlockNumber
        );
        await eventDB.saveLatestEventBlockNumber(
          initializationEventBlockNumber
        );
      }

      if (
        !updateInitializationEvent &&
        toBlockAsNumber == latestEventBlockNumber
      ) {
        console.log("It's already up to date.");
        return;
      }

      // download events after initialization
      await this.downloadEvents(
        uniswapV3Pool,
        eventDB,
        updateInitializationEvent
          ? initializationEventBlockNumber
          : latestEventBlockNumber + 1,
        toBlockAsNumber,
        batchSize
      );

      await this.preProcessSwapEvent(eventDB);
    } finally {
      await eventDB.close();
    }
  }

  async initializeAndReplayEvents(
    eventDB: EventDBManager,
    configurableCorePool: ConfigurableCorePool,
    endBlock: number,
    onlyInitialize: boolean = false
  ): Promise<ConfigurableCorePool> {
    let initializationEventBlockNumber =
      await eventDB.getInitializationEventBlockNumber();

    let initialSqrtPriceX96 = await eventDB.getInitialSqrtPriceX96();
    await configurableCorePool.initialize(initialSqrtPriceX96);

    if (onlyInitialize) return configurableCorePool;

    // replay events to find swap input param we need
    let startBlock = initializationEventBlockNumber;
    let currBlock = startBlock;

    while (currBlock <= endBlock) {
      let nextEndBlock =
        this.nextBatch(currBlock) > endBlock
          ? endBlock
          : this.nextBatch(currBlock);
      let events = await this.getAndSortEventByBlock(
        eventDB,
        currBlock,
        nextEndBlock
      );
      if (events.length > 0) {
        await this.replayEventsAndAssertReturnValues(
          eventDB,
          configurableCorePool,
          events
        );
      }
      currBlock = nextEndBlock + 1;
    }
    return configurableCorePool;
  }

  private async downloadEvents(
    uniswapV3Pool: UniswapV3Pool,
    eventDB: EventDBManager,
    fromBlock: number,
    toBlock: number,
    batchSize: number
  ) {
    while (fromBlock <= toBlock) {
      let endBlock =
        fromBlock + batchSize > toBlock ? toBlock : fromBlock + batchSize;
      let latestEventBlockNumber = Math.max(
        await this.saveEvents(
          uniswapV3Pool,
          eventDB,
          EventType.MINT,
          fromBlock,
          endBlock
        ),
        await this.saveEvents(
          uniswapV3Pool,
          eventDB,
          EventType.BURN,
          fromBlock,
          endBlock
        ),
        await this.saveEvents(
          uniswapV3Pool,
          eventDB,
          EventType.SWAP,
          fromBlock,
          endBlock
        )
      );
      await eventDB.saveLatestEventBlockNumber(latestEventBlockNumber);
      fromBlock += batchSize + 1;
    }
  }

  private async saveEvents(
    uniswapV3Pool: UniswapV3Pool,
    eventDB: EventDBManager,
    eventType: EventType,
    fromBlock: number,
    toBlock: number
  ): Promise<number> {
    let latestEventBlockNumber = fromBlock;
    if (eventType == EventType.MINT) {
      let topic = uniswapV3Pool.filters.Mint();
      let events = await uniswapV3Pool.queryFilter(topic, fromBlock, toBlock);
      for (let event of events) {
        let block = await this.RPCProvider.getBlock(event.blockNumber);
        let date = new Date(block.timestamp * 1000);
        await eventDB.insertLiquidityEvent(
          eventType,
          event.args.sender,
          event.args.owner,
          event.args.amount.toString(),
          event.args.amount0.toString(),
          event.args.amount1.toString(),
          event.args.tickLower,
          event.args.tickUpper,
          event.blockNumber,
          event.transactionIndex,
          event.logIndex,
          date
        );
        if (event.blockNumber > latestEventBlockNumber)
          latestEventBlockNumber = event.blockNumber;
      }
    } else if (eventType == EventType.BURN) {
      let topic = uniswapV3Pool.filters.Burn();
      let events = await uniswapV3Pool.queryFilter(topic, fromBlock, toBlock);
      for (let event of events) {
        let block = await this.RPCProvider.getBlock(event.blockNumber);
        let date = new Date(block.timestamp * 1000);
        await eventDB.insertLiquidityEvent(
          eventType,
          event.args.owner,
          "",
          event.args.amount.toString(),
          event.args.amount0.toString(),
          event.args.amount1.toString(),
          event.args.tickLower,
          event.args.tickUpper,
          event.blockNumber,
          event.transactionIndex,
          event.logIndex,
          date
        );
        if (event.blockNumber > latestEventBlockNumber)
          latestEventBlockNumber = event.blockNumber;
      }
    } else if (eventType == EventType.SWAP) {
      let topic = uniswapV3Pool.filters.Swap();
      let events = await uniswapV3Pool.queryFilter(topic, fromBlock, toBlock);
      for (let event of events) {
        let block = await this.RPCProvider.getBlock(event.blockNumber);
        let date = new Date(block.timestamp * 1000);
        await eventDB.insertSwapEvent(
          event.args.sender,
          event.args.recipient,
          event.args.amount0.toString(),
          event.args.amount1.toString(),
          event.args.sqrtPriceX96.toString(),
          event.args.liquidity.toString(),
          event.args.tick,
          event.blockNumber,
          event.transactionIndex,
          event.logIndex,
          date
        );
        if (event.blockNumber > latestEventBlockNumber)
          latestEventBlockNumber = event.blockNumber;
      }
    }
    return latestEventBlockNumber;
  }

  private async preProcessSwapEvent(eventDB: EventDBManager) {
    // initialize configurableCorePool
    let simulatorDBManager: SimulationDataManager =
      await SQLiteSimulationDataManager.buildInstance();
    let poolConfig = await eventDB.getPoolConfig();
    let configurableCorePool: ConfigurableCorePool =
      new ConfigurableCorePoolImpl(
        new PoolState(poolConfig),
        new SimulatorRoadmapManager(simulatorDBManager),
        new SimulatorConsoleVisitor(),
        new SimulatorPersistenceVisitor(simulatorDBManager)
      );
    await this.initializeAndReplayEvents(
      eventDB,
      configurableCorePool,
      await eventDB.getLatestEventBlockNumber()
    );
    await simulatorDBManager.close();
  }

  private nextBatch(currBlock: number) {
    // we take a day as step length, consider block interval as 40s then 24 * 60 * 60 / 40 = 2160
    return currBlock + 2160;
  }

  private async getCorePoolContarct(
    poolAddress: string
  ): Promise<UniswapV3Pool> {
    return UniswapV3PoolFactory.connect(poolAddress, this.RPCProvider);
  }

  private async getAndSortEventByBlock(
    eventDB: EventDBManager,
    startBlock: number,
    endBlock: number
  ): Promise<(LiquidityEvent | SwapEvent)[]> {
    let events: (LiquidityEvent | SwapEvent)[] = [];
    let mintEvents: LiquidityEvent[] =
      await eventDB.getLiquidityEventsByBlockNumber(
        EventType.MINT,
        startBlock,
        endBlock
      );
    let burnEvents: LiquidityEvent[] =
      await eventDB.getLiquidityEventsByBlockNumber(
        EventType.BURN,
        startBlock,
        endBlock
      );
    let swapEvents: SwapEvent[] = await eventDB.getSwapEventsByBlockNumber(
      startBlock,
      endBlock
    );
    events.push(...mintEvents);
    events.push(...burnEvents);
    events.push(...swapEvents);
    events.sort(function (a, b) {
      return a.blockNumber == b.blockNumber
        ? a.logIndex - b.logIndex
        : a.blockNumber - b.blockNumber;
    });
    return events;
  }

  private async replayEventsAndAssertReturnValues(
    eventDB: EventDBManager,
    configurableCorePool: ConfigurableCorePool,
    paramArr: (LiquidityEvent | SwapEvent)[]
  ): Promise<void> {
    let testUser = "";
    for (let index = 0; index < paramArr.length; index++) {
      // avoid stack overflow
      if (index % 4000 == 0) {
        configurableCorePool.takeSnapshot("");
      }

      let param = paramArr[index];
      let amount0: JSBI, amount1: JSBI;
      switch (param.type) {
        case EventType.MINT:
          ({ amount0, amount1 } = await configurableCorePool.mint(
            testUser,
            param.tickLower,
            param.tickUpper,
            param.liquidity
          ));
          if (
            JSBI.notEqual(amount0, param.amount0) ||
            JSBI.notEqual(amount1, param.amount1)
          )
            throw new Error(
              `Mint failed. Event index: ${index}. Event: ${printParams(
                param
              )}.`
            );
          break;
        case EventType.BURN:
          ({ amount0, amount1 } = await configurableCorePool.burn(
            testUser,
            param.tickLower,
            param.tickUpper,
            param.liquidity
          ));
          if (
            JSBI.notEqual(amount0, param.amount0) ||
            JSBI.notEqual(amount1, param.amount1)
          )
            throw new Error(
              `Mint failed. Event index: ${index}. Event: ${printParams(
                param
              )}.`
            );
          break;
        case EventType.SWAP:
          // try-error to find `amountSpecified` and `sqrtPriceLimitX96` to resolve to the same result as swap event records
          try {
            let { amountSpecified, sqrtPriceX96 } =
              await configurableCorePool.resolveInputFromSwapResultEvent(param);

            let zeroForOne: boolean = JSBI.greaterThan(param.amount0, ZERO)
              ? true
              : false;
            await configurableCorePool.swap(
              zeroForOne,
              amountSpecified,
              sqrtPriceX96
            );
            // add AmountSpecified column to swap event if we need to
            if (ZERO == param.amountSpecified) {
              await eventDB.addAmountSpecified(
                param.id,
                amountSpecified.toString()
              );
            }
          } catch (error) {
            return Promise.reject(
              `Swap failed. Event index: ${index}. Event: ${printParams(
                param
              )}.`
            );
          }
          break;
        default:
          // @ts-ignore: ExhaustiveCheck
          const exhaustiveCheck: never = param;
      }
    }
  }
}
