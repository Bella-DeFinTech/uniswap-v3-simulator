import { EventType } from "../enum/EventType";
import { EventDBManager } from "../manager/EventDBManager";
import { BigNumber, providers } from "ethers";
import { UniswapV3Pool2__factory as UniswapV3PoolFactory } from "../typechain/factories/UniswapV3Pool2__factory";
import { UniswapV3Pool2 as UniswapV3Pool } from "../typechain/UniswapV3Pool2";
import {
  ConfigurableCorePool,
  PoolConfig,
  convertTokenStr,
  exists,
  getDatabaseNameFromPath,
} from "..";
import { LiquidityEvent } from "../entity/LiquidityEvent";
import { SwapEvent } from "../entity/SwapEvent";
import { SQLiteSimulationDataManager } from "../manager/SQLiteSimulationDataManager";
import { SimulationDataManager } from "../interface/SimulationDataManager";
import { printParams } from "../util/Serializer";
import JSBI from "jsbi";
import {
  BSC_PANCAKE_V3_SUBGRAPH_ENDPOINT,
  SUBGRAPH_API_KEY,
  ZERO,
} from "../enum/InternalConstants";
import { EventDataSourceType } from "../enum/EventDataSourceType";
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
import { request, gql } from "graphql-request";
import { PositionManager } from "../manager/PositionManager";
import * as log4js from "log4js";
import { TypedEvent } from "../typechain/common";

const logger = log4js.getLogger("BSCDataDownloader");

const headers = {
  Authorization: `Bearer ${SUBGRAPH_API_KEY}`,
};

export class BSCDataDownloader {
  private RPCProvider: providers.JsonRpcProvider;

  private eventDataSourceType: EventDataSourceType;

  constructor(
    RPCProviderUrl: string | undefined,
    eventDataSourceType: EventDataSourceType
  ) {
    if (RPCProviderUrl == undefined) {
      let tunerConfig = loadConfig(undefined);
      RPCProviderUrl = tunerConfig.RPCProviderUrl;
    }
    this.RPCProvider = new providers.JsonRpcProvider(RPCProviderUrl);
    this.eventDataSourceType = eventDataSourceType;
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
    let initializationEvent = await this.queryFilterWithRetry(
      uniswapV3Pool,
      initializeTopic
    );
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
    let databaseName = getDatabaseNameFromPath(filePath, ".db");
    let nameArr = databaseName.split("_");
    return { poolName: nameArr[0], poolAddress: nameArr[1] };
  }

  async download(
    poolName: string = "",
    poolAddress: string,
    deploymentBlockNumber: number,
    toBlock: EndBlockTypeWhenInit,
    batchSize: number = 10000
  ) {
    // check toBlock first
    let toBlockAsNumber = await this.parseEndBlockTypeWhenInit(
      toBlock,
      poolAddress
    );

    let uniswapV3Pool = await this.getCorePoolContarct(poolAddress);
    if (toBlockAsNumber < deploymentBlockNumber)
      throw new Error(
        `The pool does not exist at block height: ${toBlockAsNumber}, it was deployed at block height: ${deploymentBlockNumber}`
      );

    let initializeTopic = uniswapV3Pool.filters.Initialize();
    let initializationEvent = await this.queryFilterWithRetry(
      uniswapV3Pool,
      initializeTopic,
      deploymentBlockNumber,
      toBlockAsNumber
    );
    let initializationSqrtPriceX96 = initializationEvent[0].args.sqrtPriceX96;
    let initializationEventBlockNumber = initializationEvent[0].blockNumber;

    // check db file then
    let filePath = this.generateMainnetEventDBFilePath(poolName, poolAddress);
    if (exists(filePath))
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

      if (toBlock === "afterDeployment") return;

      // record initialize event
      await eventDB.addInitialSqrtPriceX96(
        initializationSqrtPriceX96.toString()
      );
      await eventDB.saveInitializationEventBlockNumber(
        initializationEventBlockNumber
      );
      await eventDB.saveLatestEventBlockNumber(initializationEventBlockNumber);

      if (toBlock === "afterInitialization") return;

      // download events after initialization
      if (this.eventDataSourceType === EventDataSourceType.SUBGRAPH) {
        await this.downloadEventsFromSubgraph(
          uniswapV3Pool,
          poolAddress.toLowerCase(),
          poolConfig!.token0,
          poolConfig!.token1,
          eventDB,
          initializationEventBlockNumber,
          toBlockAsNumber,
          batchSize
        );
      } else if (this.eventDataSourceType === EventDataSourceType.RPC) {
        await this.downloadEventsFromRPC(
          uniswapV3Pool,
          eventDB,
          initializationEventBlockNumber,
          toBlockAsNumber,
          batchSize
        );
      }
      // await this.preProcessEvents(poolAddress, eventDB);
    } finally {
      await eventDB.close();
    }
  }

  async replaceLiquidityEventsFromSubgraphToRPC(
    mainnetEventDBFilePath: string,
    batchSize: number = 10000
  ) {
    let eventDB = await EventDBManager.buildInstance(mainnetEventDBFilePath);

    let initializationEventBlockNumber =
      await eventDB.getInitializationEventBlockNumber();
    let latestEventBlockNumber = await eventDB.getLatestEventBlockNumber();
    // remove incomplete events
    await eventDB.deleteLiquidityEventsByBlockNumber(
      EventType.MINT,
      initializationEventBlockNumber,
      latestEventBlockNumber
    );
    await eventDB.deleteLiquidityEventsByBlockNumber(
      EventType.BURN,
      initializationEventBlockNumber,
      latestEventBlockNumber
    );

    // download events after initialization
    let { poolAddress } = this.parseFromMainnetEventDBFilePath(
      mainnetEventDBFilePath
    );

    let poolConfig = await eventDB.getPoolConfig();

    let uniswapV3Pool = await this.getCorePoolContarct(poolAddress);

    await this.downloadEventsFromSubgraph(
      uniswapV3Pool,
      poolAddress.toLowerCase(),
      poolConfig!.token0,
      poolConfig!.token1,
      eventDB,
      initializationEventBlockNumber,
      latestEventBlockNumber,
      batchSize,
      true
    );
  }

  async update(
    mainnetEventDBFilePath: string,
    toBlock: EndBlockTypeWhenRecover,
    batchSize: number = 10000
  ) {
    // check dbfile first
    let { poolAddress } = this.parseFromMainnetEventDBFilePath(
      mainnetEventDBFilePath
    );
    if (!exists(mainnetEventDBFilePath))
      throw new Error(
        `The database file: ${mainnetEventDBFilePath} does not exist. Please download the data first.`
      );

    // check toBlock then
    let eventDB = await EventDBManager.buildInstance(mainnetEventDBFilePath);
    try {
      let latestEventBlockNumber = await eventDB.getLatestEventBlockNumber();
      // let deploymentBlockNumber = await this.queryDeploymentBlockNumber(
      //   poolAddress
      // );
      let toBlockAsNumber = await this.parseEndBlockTypeWhenRecover(
        latestEventBlockNumber,
        toBlock,
        poolAddress
      );
      // if (toBlockAsNumber < deploymentBlockNumber)
      //   throw new Error("toBlock is too small, the pool hasn't been deployed.");

      if (toBlockAsNumber < latestEventBlockNumber) {
        logger.info("It's already up to date.");
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
        let initializationEvent = await this.queryFilterWithRetry(
          uniswapV3Pool,
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
        logger.info("It's already up to date.");
        return;
      }

      let fromBlockAsNumber = updateInitializationEvent
        ? initializationEventBlockNumber
        : latestEventBlockNumber + 1;

      // remove incomplete events
      await eventDB.deleteLiquidityEventsByBlockNumber(
        EventType.MINT,
        fromBlockAsNumber,
        toBlockAsNumber
      );
      await eventDB.deleteLiquidityEventsByBlockNumber(
        EventType.BURN,
        fromBlockAsNumber,
        toBlockAsNumber
      );
      await eventDB.deleteSwapEventsByBlockNumber(
        fromBlockAsNumber,
        toBlockAsNumber
      );

      // download events after initialization
      let poolConfig = await eventDB.getPoolConfig();

      if (this.eventDataSourceType === EventDataSourceType.SUBGRAPH) {
        await this.downloadEventsFromSubgraph(
          uniswapV3Pool,
          poolAddress.toLowerCase(),
          poolConfig!.token0,
          poolConfig!.token1,
          eventDB,
          fromBlockAsNumber,
          toBlockAsNumber,
          batchSize
        );
      } else if (this.eventDataSourceType === EventDataSourceType.RPC) {
        await this.downloadEventsFromRPC(
          uniswapV3Pool,
          eventDB,
          fromBlockAsNumber,
          toBlockAsNumber,
          batchSize
        );
      }

      // await this.preProcessEvents(poolAddress, eventDB);
    } finally {
      await eventDB.close();
    }
  }

  async preProcessEvents(poolAddress: string, eventDB: EventDBManager) {
    // let latestEventBlockNumber = await eventDB.getLatestEventBlockNumber();

    // for verify burn events
    // (deprecated)workaround for the bug of burn events, not working though
    // await this.fixBurnEvents(poolAddress, eventDB, latestEventBlockNumber);

    // for verify swap events
    await this.preProcessSwapEvent(eventDB);

    logger.info("Events have been pre-processed successfully.");
  }

  async fixBurnEvents(
    poolAddress: string,
    eventDB: EventDBManager,
    endBlock: number
  ): Promise<void> {
    let startBlock = await eventDB.getLatestVerifiedBurnBlockNumber();
    if (startBlock == 0) {
      let initializationEventBlockNumber =
        await eventDB.getInitializationEventBlockNumber();
      startBlock = initializationEventBlockNumber;
    }

    if (startBlock >= endBlock) {
      logger.info("No burn events to fix.");
      return;
    }

    let uniswapV3Pool = await this.getCorePoolContarct(poolAddress);

    await this.fixBurnEventsFromRPC(
      uniswapV3Pool,
      eventDB,
      startBlock,
      endBlock,
      10000
    );
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

    let startTime = Date.now();

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

        await eventDB.saveLatestVerifiedSwapBlockNumber(nextEndBlock);

        let endTime = Date.now();
        let duration = endTime - startTime;
        logger.info(
          `Replay events duration: ${duration}ms, events: ${
            events.length
          }, average duration per event: ${
            duration / events.length
          }ms, fromBlock: ${currBlock}, toBlock: ${nextEndBlock}`
        );
        startTime = endTime;
      }
      currBlock = nextEndBlock + 1;
    }
    return configurableCorePool;
  }

  private async downloadEventsFromSubgraph(
    uniswapV3Pool: UniswapV3Pool,
    poolAddress: string,
    token0: string,
    token1: string,
    eventDB: EventDBManager,
    fromBlock: number,
    toBlock: number,
    batchSize: number,
    liquidityEventsOnly: boolean = false
  ) {
    while (fromBlock <= toBlock) {
      let endBlock =
        fromBlock + batchSize > toBlock ? toBlock : fromBlock + batchSize;
      let latestEventBlockNumber = Math.max(
        fromBlock,
        // the quality of burn events from RPC is far better than from subgraph, so we use RPC to get mint and burn events
        await this.saveEventsFromRPC(
          uniswapV3Pool,
          eventDB,
          EventType.MINT,
          fromBlock,
          endBlock
        ),
        await this.saveEventsFromRPC(
          uniswapV3Pool,
          eventDB,
          EventType.BURN,
          fromBlock,
          endBlock
        ),
        liquidityEventsOnly
          ? 0
          : await this.saveEventsFromSubgraph(
              poolAddress,
              token0,
              token1,
              eventDB,
              EventType.SWAP,
              fromBlock,
              endBlock
            )
      );
      logger.info(
        `latestEventBlockNumber: ${latestEventBlockNumber}, fromBlock: ${fromBlock}, toBlock: ${toBlock}, batchSize: ${batchSize}`
      );
      if (!liquidityEventsOnly)
        await eventDB.saveLatestEventBlockNumber(latestEventBlockNumber);
      fromBlock += batchSize + 1;
    }
    logger.info(
      "Events have been downloaded successfully. Please wait for pre-process to be done..."
    );
  }

  private async fixBurnEventsFromRPC(
    uniswapV3Pool: UniswapV3Pool,
    eventDB: EventDBManager,
    fromBlock: number,
    toBlock: number,
    batchSize: number
  ) {
    while (fromBlock <= toBlock) {
      let endBlock =
        fromBlock + batchSize > toBlock ? toBlock : fromBlock + batchSize;
      let events = await this.pullBurnEventsFromRPC(
        uniswapV3Pool,
        fromBlock,
        endBlock
      );
      if (events.length > 0) {
        for (let event of events) {
          // logger.info(
          //   `Fix burn event: ${event.transactionHash}, logIndex: ${
          //     event.logIndex
          //   }, amount: ${event.args.amount.toString()}, tickLower: ${
          //     event.args.tickLower
          //   }, tickUpper: ${event.args.tickUpper}`
          // );
          let burnEvents = await eventDB.getBurnEventsByTransactionHash(
            event.transactionHash
          );
          if (burnEvents.length == 0) {
            logger.warn(
              `Burn event: ${event.transactionHash}, logIndex: ${
                event.logIndex
              }, amount: ${event.args.amount.toString()}, tickLower: ${
                event.args.tickLower
              }, tickUpper: ${event.args.tickUpper} not found`
            );
            continue;
          } else if (burnEvents.length > 1) {
            logger.warn(
              `Burn event: ${event.transactionHash}, logIndex: ${
                event.logIndex
              }, amount: ${event.args.amount.toString()}, tickLower: ${
                event.args.tickLower
              }, tickUpper: ${event.args.tickUpper} found multiple times: ${
                burnEvents.length
              }`
            );

            await eventDB.saveBurnEvent(
              event.transactionHash,
              event.logIndex,
              event.args.amount.toString(),
              event.args.amount0.toString(),
              event.args.amount1.toString(),
              event.args.tickLower,
              event.args.tickUpper
            );
          }
        }
        await eventDB.saveLatestVerifiedBurnBlockNumber(
          events[events.length - 1].blockNumber
        );
      }
      fromBlock += batchSize + 1;
    }
    logger.info("Burn events have been fixed successfully.");
  }

  private async downloadEventsFromRPC(
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
        await this.saveEventsFromRPC(
          uniswapV3Pool,
          eventDB,
          EventType.MINT,
          fromBlock,
          endBlock
        ),
        await this.saveEventsFromRPC(
          uniswapV3Pool,
          eventDB,
          EventType.BURN,
          fromBlock,
          endBlock
        ),
        await this.saveEventsFromRPC(
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
    logger.info(
      "Events have been downloaded successfully. Please wait for pre-process to be done..."
    );
  }

  private async queryFilterWithRetry(
    contract: any,
    filter: any,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    const maxRetries = 5;
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 30000; // 30 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(
          `RPC queryFilter attempt ${attempt}/${maxRetries} (${fromBlock}-${toBlock})`
        );

        const events = await contract.queryFilter(filter, fromBlock, toBlock);

        logger.info(
          `RPC queryFilter successful on attempt ${attempt}, found ${events.length} events`
        );
        return events;
      } catch (error: any) {
        logger.error(
          `RPC queryFilter attempt ${attempt} failed:`,
          error.message
        );

        // if it is the last attempt, throw an error
        if (attempt === maxRetries) {
          logger.error(
            `All ${maxRetries} RPC queryFilter attempts failed. Last error:`,
            error.message
          );
          throw new Error(
            `RPC queryFilter failed after ${maxRetries} attempts: ${error.message}`
          );
        }

        // calculate the delay time (exponential backoff)
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        logger.info(`Waiting ${delay}ms before retry...`);

        // wait and retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // this should not be reached, but for type safety
    throw new Error("RPC queryFilter failed after all retries");
  }

  private async request(query: string) {
    const maxRetries = 10;
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute

    // proxy configuration - can be set through environment variables
    const proxyConfig = {
      host: process.env.HTTP_PROXY_HOST || process.env.HTTPS_PROXY_HOST,
      port: parseInt(
        process.env.HTTP_PROXY_PORT || process.env.HTTPS_PROXY_PORT || "0"
      ),
      auth: process.env.HTTP_PROXY_AUTH || process.env.HTTPS_PROXY_AUTH,
    };

    // check if proxy is needed
    const useProxy = proxyConfig.host && proxyConfig.port > 0;

    // save original environment variables
    const originalHttpProxy = process.env.HTTP_PROXY;
    const originalHttpsProxy = process.env.HTTPS_PROXY;
    const originalHttpProxyAuth = process.env.HTTP_PROXY_AUTH;
    const originalHttpsProxyAuth = process.env.HTTPS_PROXY_AUTH;

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`GraphQL request attempt ${attempt}/${maxRetries}`);

          // if proxy is configured, add proxy settings
          if (useProxy) {
            process.env.HTTP_PROXY = `http://${proxyConfig.host}:${proxyConfig.port}`;
            process.env.HTTPS_PROXY = `http://${proxyConfig.host}:${proxyConfig.port}`;
            if (proxyConfig.auth) {
              process.env.HTTP_PROXY_AUTH = proxyConfig.auth;
              process.env.HTTPS_PROXY_AUTH = proxyConfig.auth;
            }
            logger.info(`Using proxy: ${proxyConfig.host}:${proxyConfig.port}`);
          }

          const response = await request(
            BSC_PANCAKE_V3_SUBGRAPH_ENDPOINT,
            query,
            {},
            headers
          );

          // check if the response is valid
          if (!response) {
            throw new Error("Empty response received");
          }

          // check GraphQL errors
          if (response.errors && response.errors.length > 0) {
            const errorMessages = response.errors
              .map((err: any) => err.message)
              .join(", ");
            throw new Error(`GraphQL errors: ${errorMessages}`);
          }

          logger.info(`GraphQL request successful on attempt ${attempt}`);
          return response;
        } catch (error: any) {
          logger.error(`Request attempt ${attempt} failed:`, error.message);

          // if it is the last attempt, throw an error
          if (attempt === maxRetries) {
            logger.error(
              `All ${maxRetries} attempts failed. Last error:`,
              error.message
            );
            throw new Error(
              `GraphQL request failed after ${maxRetries} attempts: ${error.message}`
            );
          }

          // calculate the delay time (exponential backoff)
          const delay = Math.min(
            baseDelay * Math.pow(2, attempt - 1),
            maxDelay
          );
          logger.info(`Waiting ${delay}ms before retry...`);

          // wait and retry
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } finally {
      // restore original environment variables
      if (originalHttpProxy !== undefined) {
        process.env.HTTP_PROXY = originalHttpProxy;
      } else {
        delete process.env.HTTP_PROXY;
      }
      if (originalHttpsProxy !== undefined) {
        process.env.HTTPS_PROXY = originalHttpsProxy;
      } else {
        delete process.env.HTTPS_PROXY;
      }
      if (originalHttpProxyAuth !== undefined) {
        process.env.HTTP_PROXY_AUTH = originalHttpProxyAuth;
      } else {
        delete process.env.HTTP_PROXY_AUTH;
      }
      if (originalHttpsProxyAuth !== undefined) {
        process.env.HTTPS_PROXY_AUTH = originalHttpsProxyAuth;
      } else {
        delete process.env.HTTPS_PROXY_AUTH;
      }
    }
  }

  private async saveEventsFromSubgraph(
    poolAddress: string,
    token0: string,
    token1: string,
    eventDB: EventDBManager,
    eventType: EventType,
    fromBlock: number,
    toBlock: number
  ): Promise<number> {
    // let token0Decimals = tokens[0].decimals;
    // let token1Decimals = tokens[1].decimals;
    // let fromTimestamp = (await this.RPCProvider.getBlock(fromBlock)).timestamp;
    // let toTimestamp = (await this.RPCProvider.getBlock(toBlock)).timestamp;
    logger.info("--------------------------------");
    logger.info(poolAddress, token0, token1, eventType);
    logger.info(fromBlock, toBlock);
    logger.info("--------------------------------");
    let latestEventBlockNumber = fromBlock;
    let skip = 0;
    while (true) {
      if (eventType === EventType.MINT) {
        const query = gql`
          query {
            liquidityPool(id: "${poolAddress}") {
              deposits(
                first: 1000
                skip: ${skip}
                where: { blockNumber_gte: ${fromBlock}, blockNumber_lte: ${toBlock} }
                orderBy: blockNumber
                orderDirection: asc
              ) {
                account {
                  id
                }
                blockNumber
                hash
                inputTokenAmounts
                liquidity
                logIndex
                tickLower
                tickUpper
                timestamp
              }
            }
          }
        `;

        logger.info("mint query: ", query);

        let data = await this.request(query);

        if (null == data.liquidityPool) {
          latestEventBlockNumber = toBlock;
          break;
        }

        let events = data.liquidityPool.deposits;

        if (events.length > 0) {
          const liquidityEvents = events.map((event) => {
            let date = new Date(event.timestamp * 1000);
            return {
              type: eventType,
              msg_sender: event.account.id,
              recipient: "",
              liquidity: convertTokenStr(event.liquidity),
              amount0: convertTokenStr(event.inputTokenAmounts[0]),
              amount1: convertTokenStr(event.inputTokenAmounts[1]),
              tick_lower: event.tickLower,
              tick_upper: event.tickUpper,
              block_number: event.blockNumber,
              transaction_hash: event.hash,
              log_index: event.logIndex,
              date: date,
            };
          });

          await eventDB.batchInsertLiquidityEvents(liquidityEvents);
          latestEventBlockNumber = events[events.length - 1].blockNumber;
        }
        if (events.length < 1000) {
          break;
        } else {
          skip += 1000;
        }
      } else if (eventType === EventType.BURN) {
        const query = gql`
          query {
            liquidityPool(id: "${poolAddress}") {
              withdraws(
                first: 1000
                skip: ${skip}
                where: { blockNumber_gte: ${fromBlock}, blockNumber_lte: ${toBlock} }
                orderBy: blockNumber
                orderDirection: asc
              ) {
                account {
                  id
                }
                blockNumber
                hash
                inputTokenAmounts
                liquidity
                logIndex
                tickLower
                tickUpper
                timestamp
              }
            }
          }
        `;

        logger.info("burn query: ", query);

        let data = await this.request(query);

        if (null == data.liquidityPool) {
          latestEventBlockNumber = toBlock;
          break;
        }

        let events = data.liquidityPool.withdraws;

        if (events.length > 0) {
          const liquidityEvents = events.map((event) => {
            let date = new Date(event.timestamp * 1000);
            return {
              type: eventType,
              msg_sender: event.account.id,
              recipient: "",
              liquidity: convertTokenStr(event.liquidity),
              amount0: convertTokenStr(event.inputTokenAmounts[0]),
              amount1: convertTokenStr(event.inputTokenAmounts[1]),
              tick_lower: event.tickLower,
              tick_upper: event.tickUpper,
              block_number: event.blockNumber,
              transaction_hash: event.hash,
              log_index: event.logIndex,
              date: date,
            };
          });

          await eventDB.batchInsertLiquidityEvents(liquidityEvents);
          latestEventBlockNumber = events[events.length - 1].blockNumber;
        }
        if (events.length < 1000) {
          break;
        } else {
          skip += 1000;
        }
      } else if (eventType === EventType.SWAP) {
        const query = gql`
          query {
            liquidityPool(id: "${poolAddress}") {
              swaps(
                first: 1000
                skip: ${skip}
                where: { blockNumber_gte: ${fromBlock}, blockNumber_lte: ${toBlock} }
                orderBy: blockNumber
                orderDirection: asc
              ) {
                amountIn
                amountOut
                blockNumber
                hash
                logIndex
                nonce
                tick
                timestamp
                account {
                  id
                }
                tokenIn {
                  id
                }
                tokenOut {
                  id
                }
              }
            }
          }
        `;

        logger.info("swap query: ", query);

        let data = await this.request(query);

        if (
          null == data.liquidityPool ||
          data.liquidityPool.swaps.length == 0
        ) {
          latestEventBlockNumber = toBlock;
          break;
        }

        let events = data.liquidityPool.swaps;

        if (events.length > 0) {
          const swapEvents = events.map((event) => {
            let amount0;
            let amount1;
            if (token0.toLowerCase() === event.tokenIn.id.toLowerCase()) {
              amount0 = event.amountIn;
              amount1 = -event.amountOut;
            } else {
              amount0 = -event.amountOut;
              amount1 = event.amountIn;
            }

            let date = new Date(event.timestamp * 1000);
            return {
              msg_sender: event.account.id,
              recipient: event.account.id,
              amount0: convertTokenStr(amount0),
              amount1: convertTokenStr(amount1),
              sqrt_price_x96: "-1",
              liquidity: "-1",
              tick: event.tick,
              block_number: event.blockNumber,
              transaction_hash: event.hash,
              log_index: event.logIndex,
              date: date,
            };
          });

          await eventDB.batchInsertSwapEvents(swapEvents);
          latestEventBlockNumber = events[events.length - 1].blockNumber;
        }
        if (events.length < 1000) {
          break;
        } else {
          skip += 1000;
        }
      }
    }
    return latestEventBlockNumber;
  }

  private async pullBurnEventsFromRPC(
    uniswapV3Pool: UniswapV3Pool,
    fromBlock: number,
    toBlock: number
  ): Promise<
    TypedEvent<
      [string, number, number, BigNumber, BigNumber, BigNumber] & {
        owner: string;
        tickLower: number;
        tickUpper: number;
        amount: BigNumber;
        amount0: BigNumber;
        amount1: BigNumber;
      }
    >[]
  > {
    let topic = uniswapV3Pool.filters.Burn();
    let events = await this.queryFilterWithRetry(
      uniswapV3Pool,
      topic,
      fromBlock,
      toBlock
    );

    return events;
  }

  private async saveEventsFromRPC(
    uniswapV3Pool: UniswapV3Pool,
    eventDB: EventDBManager,
    eventType: EventType,
    fromBlock: number,
    toBlock: number
  ): Promise<number> {
    let latestEventBlockNumber = fromBlock;
    if (eventType === EventType.MINT) {
      let topic = uniswapV3Pool.filters.Mint();
      let events = await this.queryFilterWithRetry(
        uniswapV3Pool,
        topic,
        fromBlock,
        toBlock
      );

      if (events.length > 0) {
        const liquidityEvents = await Promise.all(
          events.map(async (event) => {
            // to get better efficiency, we use local timestamp(inserted time) instead of block timestamp
            return {
              type: eventType,
              msg_sender: event.args.owner,
              recipient: "",
              liquidity: event.args.amount.toString(),
              amount0: event.args.amount0.toString(),
              amount1: event.args.amount1.toString(),
              tick_lower: event.args.tickLower,
              tick_upper: event.args.tickUpper,
              block_number: event.blockNumber,
              transaction_hash: event.transactionHash,
              log_index: event.logIndex,
              date: new Date(),
            };
          })
        );

        await eventDB.batchInsertLiquidityEvents(liquidityEvents);
        latestEventBlockNumber = Math.max(...events.map((e) => e.blockNumber));
      }
    } else if (eventType === EventType.BURN) {
      let topic = uniswapV3Pool.filters.Burn();
      let events = await this.queryFilterWithRetry(
        uniswapV3Pool,
        topic,
        fromBlock,
        toBlock
      );

      if (events.length > 0) {
        const liquidityEvents = await Promise.all(
          events.map(async (event) => {
            return {
              type: eventType,
              msg_sender: event.args.owner,
              recipient: "",
              liquidity: event.args.amount.toString(),
              amount0: event.args.amount0.toString(),
              amount1: event.args.amount1.toString(),
              tick_lower: event.args.tickLower,
              tick_upper: event.args.tickUpper,
              block_number: event.blockNumber,
              transaction_hash: event.transactionHash,
              log_index: event.logIndex,
              date: new Date(),
            };
          })
        );

        await eventDB.batchInsertLiquidityEvents(liquidityEvents);
        latestEventBlockNumber = Math.max(...events.map((e) => e.blockNumber));
      }
    } else if (eventType === EventType.SWAP) {
      let topic = uniswapV3Pool.filters.Swap();
      let events = await this.queryFilterWithRetry(
        uniswapV3Pool,
        topic,
        fromBlock,
        toBlock
      );

      if (events.length > 0) {
        const swapEvents = await Promise.all(
          events.map(async (event) => {
            return {
              msg_sender: event.args.sender,
              recipient: event.args.recipient,
              amount0: event.args.amount0.toString(),
              amount1: event.args.amount1.toString(),
              sqrt_price_x96: event.args.sqrtPriceX96.toString(),
              liquidity: event.args.liquidity.toString(),
              tick: event.args.tick,
              block_number: event.blockNumber,
              transaction_hash: event.transactionHash,
              log_index: event.logIndex,
              date: new Date(),
            };
          })
        );

        await eventDB.batchInsertSwapEvents(swapEvents);
        latestEventBlockNumber = Math.max(...events.map((e) => e.blockNumber));
      }
    }
    return latestEventBlockNumber;
  }

  async preProcessSwapEvent(eventDB: EventDBManager) {
    let latestVerifiedSwapBlockNumber =
      await eventDB.getLatestVerifiedSwapBlockNumber();
    if (latestVerifiedSwapBlockNumber == 0) {
      latestVerifiedSwapBlockNumber =
        await eventDB.getInitializationEventBlockNumber();
    }

    let latestEventBlockNumber = await eventDB.getLatestEventBlockNumber();
    if (latestVerifiedSwapBlockNumber >= latestEventBlockNumber) {
      logger.info("No swap events to pre-process.");
      return;
    }

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
    logger.info("Events have been pre-processed successfully.");
  }

  private nextBatch(currBlock: number) {
    // we take an hour as step length, consider block interval as 0.75s then 60 * 60 / 0.75 = 4800
    return currBlock + 4800;
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
            param.msgSender,
            param.tickLower,
            param.tickUpper,
            param.liquidity
          ));
          if (
            JSBI.notEqual(amount0, param.amount0) ||
            JSBI.notEqual(amount1, param.amount1)
          )
            logger.warn(
              `Mint result is not correct. We need to endure this error. Result: amount0: ${amount0}, amount1: ${amount1}. Event: ${printParams(
                param
              )}.`
            );
          logger.debug(
            `Mint success. Event txn hash: ${param.transactionHash}, log_index: ${param.logIndex}.`
          );
          break;
        case EventType.BURN:
          // let positionManager =
          //   configurableCorePool.getCorePool().positionManager;
          // let positions = positionManager.getPositionsByOwner(param.msgSender);
          // if (positions.size == 0) {
          //   logger.warn(
          //     `Burn failed. No position found. We need to endure this error. Event: ${printParams(
          //       param
          //     )}.`
          //   );
          //   continue;
          // }

          // for (let [key, position] of positions.entries()) {
          //   let { owner, tickLower, tickUpper } =
          //     PositionManager.extractFromKey(key);
          //   ({ amount0, amount1 } = await configurableCorePool.burn(
          //     owner,
          //     tickLower,
          //     tickUpper,
          //     position.liquidity
          //   ));
          // }

          if (param.tickLower == null || param.tickUpper == null) {
            logger.warn(
              `Burn failed. TickLower or TickUpper is null. We need to endure this error. Event: ${printParams(
                param
              )}.`
            );
            continue;
          }

          ({ amount0, amount1 } = await configurableCorePool.burn(
            param.msgSender,
            param.tickLower,
            param.tickUpper,
            param.liquidity
          ));
          if (
            JSBI.notEqual(amount0, param.amount0) ||
            JSBI.notEqual(amount1, param.amount1)
          )
            logger.warn(
              `Burn result is not correct. We need to endure this error. Result: amount0: ${amount0}, amount1: ${amount1}. Event: ${printParams(
                param
              )}.`
            );
          logger.debug(
            `Burn success. Event txn hash: ${param.transactionHash}, log_index: ${param.logIndex}.`
          );
          break;
        case EventType.SWAP:
          // try-error to find `amountSpecified` and `sqrtPriceLimitX96` to resolve to the same result as swap event records
          try {
            // logger.info(
            //   `try to resolve swap event, event txn hash: ${param.transactionHash}, log_index: ${param.logIndex}`
            // );
            // let { amountSpecified, sqrtPriceX96 } =
            //   await configurableCorePool.resolveInputFromSwapResultEvent(param);
            // logger.info(
            //   `amountSpecified: ${amountSpecified}, sqrtPriceX96: ${sqrtPriceX96}`
            // );

            let zeroForOne: boolean = JSBI.greaterThan(param.amount0, ZERO)
              ? true
              : false;
            let amountSpecified = param.amount0;

            await configurableCorePool.swap(
              zeroForOne,
              amountSpecified,
              undefined
            );
            // add AmountSpecified column to swap event if we need to
            // if (ZERO == param.amountSpecified) {
            //   await eventDB.addAmountSpecified(
            //     param.id,
            //     amountSpecified.toString()
            //   );
            // }
          } catch (error) {
            return Promise.reject(`Swap failed. Event: ${printParams(param)}.`);
          }
          logger.debug(`Swap success. Event: ${printParams(param)}.`);
          break;
        default:
          // @ts-ignore: ExhaustiveCheck
          const exhaustiveCheck: never = param;
      }
    }
  }
}
