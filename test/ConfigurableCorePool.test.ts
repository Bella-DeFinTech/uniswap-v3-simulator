import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { FeeAmount } from "../src/enum/FeeAmount";
import { PoolConfig } from "../src/model/PoolConfig";
import { ConfigurableCorePool as IConfigurableCorePool } from "../src/interface/ConfigurableCorePool";
import { ConfigurableCorePool } from "../src/core/ConfigurableCorePool";
import { DBManager } from "../src/manager/DBManager";
import { PoolState } from "../src/model/PoolState";
import { SimulatorRoadmapManager } from "../src/manager/SimulatorRoadmapManager";
import { IdGenerator } from "../src/util/IdGenerator";
import { CorePool } from "../src/core/CorePool";
import { TickMath } from "../src/util/TickMath";
import JSBI from "jsbi";
import { ZERO } from "../src/enum/InternalConstants";
import { Transition } from "../src/interface/Transition";
import { getDate, getTomorrow, format } from "./DateUtils";
import { EventDBManager } from "./EventDBManager";
import { EventType } from "./EventType";
import { LiquidityEvent } from "./LiquidityEvent";
import { SwapEvent } from "./SwapEvent";
import { printParams } from "../src/util/Serializer";
chai.use(chaiAsPromised);
const expect = chai.expect;
const testUser = "0x01";

describe("Test ConfigurableCorePool", function () {
  let dbManager: DBManager;
  let configurableCorePool: IConfigurableCorePool;
  let simulatorRoadmapManager: SimulatorRoadmapManager;
  let liquidityEventDB: EventDBManager;
  let swapEventDB: EventDBManager;
  let sqrtPriceX96ForInitialization = JSBI.BigInt(
    "0x43efef20f018fdc58e7a5cf0416a"
  );
  let tickCurrentForInitialization = 195285;
  let allowedAmount0ErrorInMinimumUnit = JSBI.BigInt(1);
  let allowedAmount1ErrorInMinimumUnit = JSBI.BigInt(14);

  async function getAndSortEventByDate(
    startDate: Date,
    endDate: Date
  ): Promise<(LiquidityEvent | SwapEvent)[]> {
    let events: (LiquidityEvent | SwapEvent)[] = [];
    let mintEvents: LiquidityEvent[] =
      await liquidityEventDB.getLiquidityEventsByDate(
        EventType.MINT,
        format(startDate, "yyyy-MM-dd HH:mm:ss"),
        format(endDate, "yyyy-MM-dd HH:mm:ss")
      );
    let burnEvents: LiquidityEvent[] =
      await liquidityEventDB.getLiquidityEventsByDate(
        EventType.BURN,
        format(startDate, "yyyy-MM-dd HH:mm:ss"),
        format(endDate, "yyyy-MM-dd HH:mm:ss")
      );
    let swapEvents: SwapEvent[] = await swapEventDB.getSwapEventsByDate(
      format(startDate, "yyyy-MM-dd HH:mm:ss"),
      format(endDate, "yyyy-MM-dd HH:mm:ss")
    );
    events.push(...mintEvents);
    events.push(...burnEvents);
    events.push(...swapEvents);
    events.sort(function (a, b) {
      return a.block_number == b.block_number
        ? a.log_index - b.log_index
        : a.block_number - b.block_number;
    });
    return events;
  }

  function isEqualApproximately(a: JSBI, b: JSBI, errorInMinimumUnit: JSBI) {
    return (
      JSBI.greaterThanOrEqual(
        JSBI.subtract(a, b),
        JSBI.BigInt(
          JSBI.greaterThan(errorInMinimumUnit, ZERO)
            ? JSBI.unaryMinus(errorInMinimumUnit)
            : errorInMinimumUnit
        )
      ) &&
      JSBI.lessThanOrEqual(
        JSBI.subtract(a, b),
        JSBI.BigInt(
          JSBI.greaterThan(errorInMinimumUnit, ZERO)
            ? errorInMinimumUnit
            : JSBI.unaryMinus(errorInMinimumUnit)
        )
      )
    );
  }

  function replayEventsAndAssertReturnValues(
    paramArr: (LiquidityEvent | SwapEvent)[]
  ): Promise<void> {
    return paramArr.reduce(async (last, param, index) => {
      if (last) await last;
      return Promise.resolve().then(() => {
        switch (param.type) {
          case EventType.MINT:
            return configurableCorePool
              .mint(
                testUser,
                param.tick_lower,
                param.tick_upper,
                param.liquidity
              )
              .then(({ amount0, amount1 }) => {
                // expect(amount0.toString()).to.eql(param.amount0.toString());
                // expect(amount1.toString()).to.eql(param.amount1.toString());
                expect(
                  isEqualApproximately(
                    amount0,
                    param.amount0,
                    allowedAmount0ErrorInMinimumUnit
                  ),
                  `id:${
                    param.id
                  }, amount0:${amount0.toString()}, expectedAmount0:${param.amount0.toString()}`
                ).to.be.true;
                expect(
                  isEqualApproximately(
                    amount1,
                    param.amount1,
                    allowedAmount1ErrorInMinimumUnit
                  ),
                  `id:${
                    param.id
                  }, amount1:${amount1.toString()}, expectedAmount1:${param.amount1.toString()}`
                ).to.be.true;
                return Promise.resolve();
              });

          case EventType.BURN:
            return configurableCorePool
              .burn(
                testUser,
                param.tick_lower,
                param.tick_upper,
                param.liquidity
              )
              .then(({ amount0, amount1 }) => {
                // expect(amount0.toString()).to.eql(param.amount0.toString());
                // expect(amount1.toString()).to.eql(param.amount1.toString());
                expect(
                  isEqualApproximately(
                    amount0,
                    param.amount0,
                    allowedAmount0ErrorInMinimumUnit
                  ),
                  `id:${
                    param.id
                  }, amount0:${amount0.toString()}, expectedAmount0:${param.amount0.toString()}`
                ).to.be.true;
                expect(
                  isEqualApproximately(
                    amount1,
                    param.amount1,
                    allowedAmount1ErrorInMinimumUnit
                  ),
                  `id:${
                    param.id
                  }, amount1:${amount1.toString()}, expectedAmount1:${param.amount1.toString()}`
                ).to.be.true;
                return Promise.resolve();
              });

          case EventType.SWAP:
            let zeroForOne: boolean = JSBI.greaterThan(param.amount0, ZERO)
              ? true
              : false;
            let tryWithDryRun: (
              amountSpecified: JSBI
            ) => Promise<{ amount0: JSBI; amount1: JSBI }> = (
              amountSpecified
            ) =>
              configurableCorePool
                .querySwap(zeroForOne, amountSpecified)
                .then(({ amount0, amount1 }) => {
                  // return JSBI.equal(amount0, param.amount0) &&
                  //   JSBI.equal(amount1, param.amount1)
                  return isEqualApproximately(
                    amount0,
                    param.amount0,
                    allowedAmount0ErrorInMinimumUnit
                  ) &&
                    isEqualApproximately(
                      amount1,
                      param.amount1,
                      allowedAmount1ErrorInMinimumUnit
                    )
                    ? Promise.resolve({
                        amount0,
                        amount1,
                      })
                    : Promise.reject(
                        new Error(
                          `Result is not match. amount0: ${amount0}, amount1: ${amount1}`
                        )
                      );
                })
                .catch((err: Error) => Promise.reject(err));

            let trySwap: (amountSpecified: JSBI) => Promise<void> = (
              amountSpecified
            ) =>
              configurableCorePool
                .swap(zeroForOne, amountSpecified)
                .then(({ amount0, amount1 }) => {
                  // expect(amount0.toString()).to.eql(param.amount0.toString());
                  // expect(amount1.toString()).to.eql(param.amount1.toString());
                  expect(
                    isEqualApproximately(
                      amount0,
                      param.amount0,
                      allowedAmount0ErrorInMinimumUnit
                    )
                  ).to.be.true;
                  expect(
                    isEqualApproximately(
                      amount1,
                      param.amount1,
                      allowedAmount1ErrorInMinimumUnit
                    )
                  ).to.be.true;
                  return Promise.resolve();
                });
            let errArr: Error[] = [];
            return tryWithDryRun(param.amount0)
              .then(() => trySwap(param.amount0))
              .catch((err) => {
                errArr.push(err);
                return tryWithDryRun(param.amount1).then(() =>
                  trySwap(param.amount1)
                );
              })
              .catch((err) => {
                errArr.push(err);
                return Promise.reject(
                  `Swap failed. Event index: ${index}. Event: ${printParams(
                    param
                  )}. ${errArr}`
                );
              });

          default:
            // @ts-ignore: ExhaustiveCheck
            const exhaustiveCheck: never = param;
            return Promise.resolve();
        }
      });
    }, Promise.resolve());
  }

  beforeEach(async function () {
    dbManager = await DBManager.buildInstance(":memory:");
    liquidityEventDB = await EventDBManager.buildInstance(
      "liquidity_events_usdc_weth_3000.db"
    );
    swapEventDB = await EventDBManager.buildInstance(
      "swap_events_usdc_weth_3000.db"
    );
    simulatorRoadmapManager = new SimulatorRoadmapManager();
    configurableCorePool = new ConfigurableCorePool(
      new PoolState(new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)),
      simulatorRoadmapManager
    );
  });

  afterEach(async function () {
    await dbManager.close();
    await liquidityEventDB.close();
    await swapEventDB.close();
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
        simulatorRoadmapManager
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
      let snapshotInPersistence = await dbManager.getSnapshot(snapshotId);
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

    // it("can swap exactly as contract do", async function () {
    //   // TODO
    //   let liquidityToMint = TickMath.tickSpacingToMaxLiquidityPerTick(60);

    //   let amount0: JSBI, amount1: JSBI;
    //   ({ amount0, amount1 } = await configurableCorePool.mint(
    //     testUser,
    //     TickMath.MIN_TICK,
    //     TickMath.MAX_TICK,
    //     liquidityToMint
    //   ));
    //   console.log(amount0.toString());
    //   console.log(amount1.toString());
    //   ({ amount0, amount1 } = await configurableCorePool.swap(
    //     false,
    //     JSBI.unaryMinus(JSBI.subtract(amount0, JSBI.BigInt(10600000000000000)))
    //   ));
    //   console.log(amount0.toString());
    //   console.log(amount1.toString());
    //   console.log("-----------------------");
    //   console.log(configurableCorePool.getCorePool().tickCurrent);
    // });

    it("can replay events on mainnet exactly as contract do", async function () {
      let startDate = getDate(2021, 5, 4);
      let endDate = getDate(2021, 7, 8);
      let currDate = startDate;
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
  });
});
