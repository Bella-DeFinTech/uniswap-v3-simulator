import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { FeeAmount } from "../src/enum/FeeAmount";
import { PoolConfig } from "../src/model/PoolConfig";
import { ConfigurableCorePool as IConfigurableCorePool } from "../src/interface/ConfigurableCorePool";
import { ConfigurableCorePool } from "../src/core/ConfigurableCorePool";
import { SQLiteSimulationDataManager } from "../src/manager/SQLiteSimulationDataManager";
import { PoolState } from "../src/model/PoolState";
import { SimulatorRoadmapManager } from "../src/manager/SimulatorRoadmapManager";
import { IdGenerator } from "../src/util/IdGenerator";
import { CorePool } from "../src/core/CorePool";
import { TickMath } from "../src/util/TickMath";
import JSBI from "jsbi";
import { ZERO } from "../src/enum/InternalConstants";
import { Transition } from "../src/interface/Transition";
import { getDate, getTomorrow, format } from "../src/util/DateUtils";
import { EventDBManager } from "../src/manager/EventDBManager";
import { EventType } from "../src/enum/EventType";
import { LiquidityEvent } from "../src/entity/LiquidityEvent";
import { SwapEvent } from "../src/entity/SwapEvent";
import { printParams } from "../src/util/Serializer";
import { SimulatorConsoleVisitor } from "../src/manager/SimulatorConsoleVisitor";
import { SimulatorPersistenceVisitor } from "../src/manager/SimulatorPersistenceVisitor";
import { SimulationDataManager } from "../src/interface/SimulationDataManager";
chai.use(chaiAsPromised);
const expect = chai.expect;
const testUser = "0x01";

describe("Test ConfigurableCorePool", function () {
  let simulationDataManager: SimulationDataManager;
  let configurableCorePool: IConfigurableCorePool;
  let simulatorRoadmapManager: SimulatorRoadmapManager;
  let eventDB: EventDBManager;
  let sqrtPriceX96ForInitialization = JSBI.BigInt(
    "0x43efef20f018fdc58e7a5cf0416a"
  );
  let tickCurrentForInitialization = 195285;

  async function getAndSortEventByDate(
    startDate: Date,
    endDate: Date
  ): Promise<(LiquidityEvent | SwapEvent)[]> {
    let events: (LiquidityEvent | SwapEvent)[] = [];
    let mintEvents: LiquidityEvent[] = await eventDB.getLiquidityEventsByDate(
      EventType.MINT,
      format(startDate, "yyyy-MM-dd HH:mm:ss"),
      format(endDate, "yyyy-MM-dd HH:mm:ss")
    );
    let burnEvents: LiquidityEvent[] = await eventDB.getLiquidityEventsByDate(
      EventType.BURN,
      format(startDate, "yyyy-MM-dd HH:mm:ss"),
      format(endDate, "yyyy-MM-dd HH:mm:ss")
    );
    let swapEvents: SwapEvent[] = await eventDB.getSwapEventsByDate(
      format(startDate, "yyyy-MM-dd HH:mm:ss"),
      format(endDate, "yyyy-MM-dd HH:mm:ss")
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

  async function replayEventsAndAssertReturnValues(
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
            testUser,
            param.tickLower,
            param.tickUpper,
            param.liquidity
          ));
          expect(amount0.toString()).to.eql(param.amount0.toString());
          expect(amount1.toString()).to.eql(param.amount1.toString());
          break;
        case EventType.BURN:
          ({ amount0, amount1 } = await configurableCorePool.burn(
            testUser,
            param.tickLower,
            param.tickUpper,
            param.liquidity
          ));
          expect(amount0.toString()).to.eql(param.amount0.toString());
          expect(amount1.toString()).to.eql(param.amount1.toString());
          break;
        case EventType.SWAP:
          // try-error to find `amountSpecified` and `sqrtPriceLimitX96` to resolve to the same result as swap event records
          let errArr: Error[] = [];
          if (
            !JSBI.equal(
              param.sqrtPriceX96,
              configurableCorePool.getCorePool().sqrtPriceX96
            )
          ) {
            if (
              await tryAndSwap(errArr, param, param.amount0, param.sqrtPriceX96)
            )
              break;
            else if (
              await tryAndSwap(errArr, param, param.amount1, param.sqrtPriceX96)
            )
              break;
          }
          if (await tryAndSwap(errArr, param, param.amount0)) break;
          else if (await tryAndSwap(errArr, param, param.amount1)) break;

          if (errArr.length != 0) {
            console.log(param.id);
            return Promise.reject(
              `Swap failed. Event index: ${index}. Event: ${printParams(
                param
              )}. ${errArr}`
            );
          }
          break;
        default:
          // @ts-ignore: ExhaustiveCheck
          const exhaustiveCheck: never = param;
      }
    }

    async function swapWithDryRun(
      errArr: Error[],
      param: SwapEvent,
      amountSpecified: JSBI,
      sqrtPriceLimitX96?: JSBI
    ): Promise<boolean> {
      let zeroForOne: boolean = JSBI.greaterThan(param.amount0, ZERO)
        ? true
        : false;
      let { amount0, amount1, sqrtPriceX96 } =
        await configurableCorePool.querySwap(
          zeroForOne,
          amountSpecified,
          sqrtPriceLimitX96
        );
      let dryRunRes =
        JSBI.equal(amount0, param.amount0) &&
        JSBI.equal(amount1, param.amount1) &&
        JSBI.equal(sqrtPriceX96, param.sqrtPriceX96);

      if (!dryRunRes) {
        errArr.push(
          new Error(
            `Result is not match. amount0: ${amount0}, amount1: ${amount1}, actual sqrtPriceX96: ${sqrtPriceX96}`
          )
        );
      }
      return Promise.resolve(dryRunRes);
    }

    async function tryAndSwap(
      errArr: Error[],
      param: SwapEvent,
      amountSpecified: JSBI,
      sqrtPriceLimitX96?: JSBI
    ): Promise<boolean> {
      let zeroForOne: boolean = JSBI.greaterThan(param.amount0, ZERO)
        ? true
        : false;
      let trySwapRes = await swapWithDryRun(
        errArr,
        param,
        amountSpecified,
        sqrtPriceLimitX96
      );
      if (trySwapRes) {
        await configurableCorePool.swap(
          zeroForOne,
          amountSpecified,
          sqrtPriceLimitX96
        );

        // add AmountSpecified column to swap event database
        // await swapEventDB.addAmountSpecified(
        //   param.id,
        //   amountSpecified.toString()
        // );
      }
      return trySwapRes;
    }
  }

  beforeEach(async function () {
    simulationDataManager = await SQLiteSimulationDataManager.buildInstance(
      "./test/database.db"
    );
    eventDB = await EventDBManager.buildInstance(
      "events_0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8.db"
    );
    simulatorRoadmapManager = new SimulatorRoadmapManager(
      simulationDataManager
    );
    configurableCorePool = new ConfigurableCorePool(
      new PoolState(new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)),
      simulatorRoadmapManager,
      new SimulatorConsoleVisitor(),
      new SimulatorPersistenceVisitor(simulationDataManager)
    );
  });

  afterEach(async function () {
    await simulationDataManager.close();
    await eventDB.close();
  });

  describe("Test get method", function () {
    it("can get id", async function () {
      expect(IdGenerator.validate(configurableCorePool.id)).to.be.true;
    });

    it("can get poolStateId", async function () {
      expect(IdGenerator.validate(configurableCorePool.getPoolState().id)).to.be
        .true;
    });

    it("can get corePool", async function () {
      expect(configurableCorePool.getCorePool()).to.be.an.instanceOf(CorePool);
    });
  });

  describe("Test initialize method", function () {
    it("can initialize", async function () {
      await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
      expect(configurableCorePool.getCorePool().tickCurrent).to.eql(
        tickCurrentForInitialization
      );
      expect(configurableCorePool.getCorePool().sqrtPriceX96).to.eql(
        sqrtPriceX96ForInitialization
      );
    });
  });

  describe("Test business interaction method", function () {
    beforeEach(async function () {
      await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
    });

    it("can mint", async function () {
      let liquidityToMint = JSBI.BigInt("10860507277202");
      await configurableCorePool.mint(
        testUser,
        192180,
        193380,
        liquidityToMint
      );
      expect(
        configurableCorePool.getCorePool().getPosition(testUser, 192180, 193380)
          .liquidity
      ).to.eql(liquidityToMint);
    });

    it("can be interacted by user(mint, burn, swap)", async function () {
      let events = await getAndSortEventByDate(
        getDate(2021, 5, 4),
        getDate(2021, 5, 6)
      );
      return expect(replayEventsAndAssertReturnValues(events)).to.eventually.be
        .fulfilled;
    });

    it("can be updated with PostProcessor by user", async function () {
      let count = 0;
      configurableCorePool.updatePostProcessor(
        (pool: IConfigurableCorePool, transition: Transition) => {
          if (pool.getPoolState().id && transition.getRecord().id) count++;
          return Promise.resolve();
        }
      );
      let events = await getAndSortEventByDate(
        getDate(2021, 5, 4),
        getDate(2021, 5, 6)
      );
      await replayEventsAndAssertReturnValues(events);
      expect(count).to.eql(events.length);
    });
  });

  describe("Test state machine method", function () {
    beforeEach(async function () {
      await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
    });

    it("can fork", async function () {
      await configurableCorePool.mint(
        testUser,
        TickMath.MIN_TICK,
        TickMath.MAX_TICK,
        JSBI.BigInt("10860507277202")
      );
      let liquidityAfterEvent1 = configurableCorePool.getCorePool().liquidity;
      expect(JSBI.greaterThan(liquidityAfterEvent1, ZERO)).to.be.true;
      let forkedConfigurableCorePool = configurableCorePool.fork();
      expect(forkedConfigurableCorePool.getCorePool().tickCurrent).to.eql(
        configurableCorePool.getCorePool().tickCurrent
      );
      await configurableCorePool.swap(true, JSBI.BigInt("1000000"));
      expect(forkedConfigurableCorePool.getCorePool().tickCurrent).to.not.eql(
        configurableCorePool.getCorePool().tickCurrent
      );
    });

    it("can take snapshot", async function () {
      await configurableCorePool.mint(
        testUser,
        TickMath.MIN_TICK,
        TickMath.MAX_TICK,
        JSBI.BigInt("10860507277202")
      );
      configurableCorePool.takeSnapshot("for test");
      let snapshot = configurableCorePool.getPoolState().snapshot;
      expect(snapshot).to.not.be.undefined;
      expect(snapshot!.description).to.eql("for test");
      expect(
        JSBI.equal(
          snapshot!.liquidity,
          configurableCorePool.getCorePool().liquidity
        )
      ).to.be.true;
    });

    it("can step back", async function () {
      await configurableCorePool.mint(
        testUser,
        TickMath.MIN_TICK,
        TickMath.MAX_TICK,
        JSBI.BigInt("10860507277202")
      );
      let liquidityAfterEvent1 = configurableCorePool.getCorePool().liquidity;
      expect(JSBI.greaterThan(liquidityAfterEvent1, ZERO)).to.be.true;
      await configurableCorePool.mint(
        testUser,
        TickMath.MIN_TICK,
        TickMath.MAX_TICK,
        JSBI.BigInt("10860507277202")
      );
      configurableCorePool.stepBack();
      let liquidityAfterEvent2 = configurableCorePool.getCorePool().liquidity;
      expect(JSBI.equal(liquidityAfterEvent1, liquidityAfterEvent2)).to.be.true;
    });

    it("can recover from snapshot", async function () {
      await configurableCorePool.mint(
        testUser,
        TickMath.MIN_TICK,
        TickMath.MAX_TICK,
        JSBI.BigInt("10860507277202")
      );
      configurableCorePool.takeSnapshot("for test");
      let snapshot = configurableCorePool.getPoolState().snapshot;
      expect(snapshot).to.not.be.undefined;
      expect(snapshot!.description).to.eql("for test");
      expect(
        JSBI.equal(
          snapshot!.liquidity,
          configurableCorePool.getCorePool().liquidity
        )
      ).to.be.true;

      await configurableCorePool.mint(
        testUser,
        TickMath.MIN_TICK,
        TickMath.MAX_TICK,
        JSBI.BigInt("10860507277202")
      );
      await configurableCorePool.swap(true, JSBI.BigInt("1000000"));
      expect(
        JSBI.notEqual(
          configurableCorePool.getCorePool().liquidity,
          snapshot!.liquidity
        )
      ).to.be.true;
      configurableCorePool.recover(snapshot!.id);
      expect(
        JSBI.equal(
          configurableCorePool.getCorePool().liquidity,
          snapshot!.liquidity
        )
      ).to.be.true;
      expect(configurableCorePool.getPoolState().id).to.eql(snapshot!.id);

      let newConfigurableCorePool = new ConfigurableCorePool(
        new PoolState(new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)),
        simulatorRoadmapManager,
        new SimulatorConsoleVisitor(),
        new SimulatorPersistenceVisitor(simulationDataManager)
      );
      newConfigurableCorePool.recover(snapshot!.id);
      expect(
        JSBI.equal(
          snapshot!.liquidity,
          newConfigurableCorePool.getCorePool().liquidity
        )
      ).to.be.true;
      expect(configurableCorePool.getPoolState().id).to.eql(snapshot!.id);
    });

    it("can persist snapshot", async function () {
      await configurableCorePool.mint(
        testUser,
        TickMath.MIN_TICK,
        TickMath.MAX_TICK,
        JSBI.BigInt("10860507277202")
      );
      configurableCorePool.takeSnapshot("for test");
      let snapshotId = await configurableCorePool.persistSnapshot();
      let snapshotInPersistence = await simulationDataManager.getSnapshot(
        snapshotId
      );
      expect(snapshotInPersistence).to.not.be.undefined;
      expect(snapshotInPersistence!.id).to.eql(snapshotId);
      expect(snapshotInPersistence!.description).to.eql("for test");
      expect(JSBI.greaterThan(snapshotInPersistence!.liquidity, ZERO)).to.be
        .true;
    });
  });

  describe("Test tricky method", function () {
    beforeEach(async function () {
      await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
    });

    it("can replay events on mainnet exactly as contract do", async function () {
      let startDate = getDate(2021, 5, 4);
      let endDate = getDate(2021, 11, 6);
      let currDate = startDate;

      // configurableCorePool.updatePostProcessor(
      //   (
      //     configurableCorePool: IConfigurableCorePool,
      //     transition: Transition
      //   ) => {
      //     if (
      //       JSBI.equal(
      //         configurableCorePool.getCorePool().sqrtPriceX96,
      //         JSBI.BigInt("xxxxx")
      //       )
      //     ) {
      //       configurableCorePool.takeSnapshot(
      //         "for check error in event id xxx"
      //       );
      //       return configurableCorePool
      //         .persistSnapshot()
      //         .then(() => Promise.resolve());
      //     }
      //     return Promise.resolve();
      //   }
      // );

      while (currDate < endDate) {
        let events = await getAndSortEventByDate(
          currDate,
          getTomorrow(currDate)
        );
        if (events.length > 0) {
          await replayEventsAndAssertReturnValues(events);
        }
        currDate = getTomorrow(currDate);
      }
    });

    it("can test any problem", async function () {
      let snapshot = await simulationDataManager.getSnapshot(
        "9577f400-5012-4492-8f1f-44c6dcb5980c"
      );
      let testPool = new ConfigurableCorePool(
        PoolState.from(snapshot!),
        simulatorRoadmapManager,
        new SimulatorConsoleVisitor(),
        new SimulatorPersistenceVisitor(simulationDataManager)
      );
      let { amount0, amount1 } = await testPool.swap(
        false,
        JSBI.BigInt("500000000000000000000")
      );
      console.log("amount0: " + amount0.toString());
      console.log("amount1: " + amount1.toString());
      console.log(
        "sqrtPriceX96: " + testPool.getCorePool().sqrtPriceX96.toString()
      );
      console.log("tick: " + testPool.getCorePool().tickCurrent);
      console.log("liquidity: " + testPool.getCorePool().liquidity.toString());
    });
  });
});
