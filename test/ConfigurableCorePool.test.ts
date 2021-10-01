import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { FeeAmount } from "../src/enum/FeeAmount";
import { PoolConfig } from "../src/model/PoolConfig";
import { ConfigurableCorePool as IConfigurableCorePool } from "../src/interface/ConfigurableCorePool";
import { ConfigurableCorePool } from "../src/core/ConfigurableCorePool";
import { DBManager } from "../src/manager/DBManager";
import { PoolState } from "../src/model/PoolState";
import { SimulatorRoadmapManager } from "../src/manager/SimulatorRoadmapManager";
import { IDGenerator } from "../src/util/IDGenerator";
import { CorePool } from "../src/core/CorePool";
import { TickMath } from "../src/util/TickMath";
import JSBI from "jsbi";
import {
  BurnParams,
  GeneralReturnParams,
  MintParams,
  SwapParams,
} from "../src/interface/ActionParams";
import { ActionType } from "../src/enum/ActionType";
import { ZERO } from "../src/enum/InternalConstants";
import { Transition } from "../src/interface/Transition";
chai.use(chaiAsPromised);
const expect = chai.expect;
const testUser = "0x01";
const paramArr = [
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 192180,
    tickUpper: 193380,
    amount: JSBI.BigInt("10860507277202"),
  } as MintParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 192660,
    tickUpper: 199800,
    amount: JSBI.BigInt("4303369674465501"),
  } as MintParams,
  {
    type: ActionType.SWAP,
    zeroForOne: false,
    amountSpecified: JSBI.BigInt("100000000000000"),
  } as SwapParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 195060,
    tickUpper: 195540,
    amount: JSBI.BigInt("229985723604286"),
  } as MintParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 195060,
    tickUpper: 195540,
    amount: JSBI.BigInt("13730002828"),
  } as MintParams,
  {
    type: ActionType.BURN,
    owner: testUser,
    tickLower: 195060,
    tickUpper: 195540,
    amount: JSBI.BigInt("229999453607114"),
  } as BurnParams,
  {
    type: ActionType.SWAP,
    zeroForOne: false,
    amountSpecified: JSBI.BigInt("50000000000000000"),
  } as SwapParams,
  {
    type: ActionType.SWAP,
    zeroForOne: false,
    amountSpecified: JSBI.BigInt("100000000000000"),
  } as SwapParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 177120,
    tickUpper: 276300,
    amount: JSBI.BigInt("1576573627845"),
  } as MintParams,
  {
    type: ActionType.SWAP,
    zeroForOne: true,
    amountSpecified: JSBI.BigInt("2"), // -329169 both ok
  } as SwapParams,
  {
    type: ActionType.SWAP,
    zeroForOne: true,
    amountSpecified: JSBI.BigInt("1559137299"),
  } as SwapParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 194700,
    tickUpper: 196260,
    amount: JSBI.BigInt("247361127027156"),
  } as MintParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 193260,
    tickUpper: 196620,
    amount: JSBI.BigInt("573779487242257"),
  } as MintParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 195120,
    tickUpper: 195180,
    amount: JSBI.BigInt("166744297244932"),
  } as MintParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 194460,
    tickUpper: 195900,
    amount: JSBI.BigInt("41272289018451860"),
  } as MintParams,
  {
    type: ActionType.MINT,
    recipient: testUser,
    tickLower: 194040,
    tickUpper: 195720,
    amount: JSBI.BigInt("6411574257011212"),
  } as MintParams,
  {
    type: ActionType.SWAP,
    zeroForOne: false,
    amountSpecified: JSBI.BigInt("300000000000000"),
  } as SwapParams,
];

const returnArr = [
  {
    amount0: JSBI.BigInt("0"),
    amount1: JSBI.BigInt("9999999999999134"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("50000000000"),
    amount1: JSBI.BigInt("9205484119256534384"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("-329608"),
    amount1: JSBI.BigInt("100000000000000"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("167505955"),
    amount1: JSBI.BigInt("44749767902513838"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("10000"),
    amount1: JSBI.BigInt("2671532955285"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("167515954"),
    amount1: JSBI.BigInt("44752439435469122"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("-164694492"),
    amount1: JSBI.BigInt("50000000000000000"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("-329169"),
    amount1: JSBI.BigInt("100000000000000"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("89010654"),
    amount1: JSBI.BigInt("16381087522243596"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("2"),
    amount1: JSBI.BigInt("-329169"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("1559137299"),
    amount1: JSBI.BigInt("-467880854065813753"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("756510965"),
    amount1: JSBI.BigInt("99999999941867355"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("2315303330"),
    amount1: JSBI.BigInt("905186710720813962"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("3338242"),
    amount1: JSBI.BigInt("7642207233159560"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("85174887119"),
    amount1: JSBI.BigInt("24999999999730009000"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("10000000000"),
    amount1: JSBI.BigInt("6107241784235783020"),
  } as GeneralReturnParams,
  {
    amount0: JSBI.BigInt("-999956"),
    amount1: JSBI.BigInt("300000000000000"),
  } as GeneralReturnParams,
];

describe("Test ConfigurableCorePool", async function () {
  let dbManager: DBManager;
  let configurableCorePool: IConfigurableCorePool;
  let sqrtPriceX96ForInitialization = JSBI.BigInt(
    "0x43efef20f018fdc58e7a5cf0416a"
  );
  let tickCurrentForInitialization = 195285;

  function replayEventsAndAssertReturnValues(
    paramArr: (MintParams | BurnParams | SwapParams)[],
    returnArr: GeneralReturnParams[]
  ): Promise<void> {
    return paramArr.reduce(async (last, param, index) => {
      if (last) await last;
      return Promise.resolve().then(() => {
        switch (param.type) {
          case ActionType.MINT:
            return configurableCorePool
              .mint(
                param.recipient,
                param.tickLower,
                param.tickUpper,
                param.amount
              )
              .then(({ amount0, amount1 }) => {
                expect(amount0.toString()).to.eql(
                  returnArr[index].amount0.toString()
                );
                expect(amount1.toString()).to.eql(
                  returnArr[index].amount1.toString()
                );
                return Promise.resolve();
              });

          case ActionType.BURN:
            return configurableCorePool
              .burn(param.owner, param.tickLower, param.tickUpper, param.amount)
              .then(({ amount0, amount1 }) => {
                expect(amount0.toString()).to.eql(
                  returnArr[index].amount0.toString()
                );
                expect(amount1.toString()).to.eql(
                  returnArr[index].amount1.toString()
                );
                return Promise.resolve();
              });

          case ActionType.SWAP:
            let zeroForOne: boolean = JSBI.greaterThan(
              returnArr[index].amount0,
              ZERO
            )
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
                  return JSBI.equal(amount0, returnArr[index].amount0) &&
                    JSBI.equal(amount1, returnArr[index].amount1)
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
                  expect(amount0.toString()).to.eql(
                    returnArr[index].amount0.toString()
                  );
                  expect(amount1.toString()).to.eql(
                    returnArr[index].amount1.toString()
                  );
                  return Promise.resolve();
                });
            let errArr: Error[] = [];
            return tryWithDryRun(returnArr[index].amount0)
              .then(() => trySwap(returnArr[index].amount0))
              .catch((err) => {
                errArr.push(err);
                return tryWithDryRun(returnArr[index].amount1).then(() =>
                  trySwap(returnArr[index].amount1)
                );
              })
              .catch((err) => {
                errArr.push(err);
                return Promise.reject(
                  `Swap failed. Event index: ${index}. Expected return amounts: ${JSON.stringify(
                    returnArr[index],
                    null,
                    4
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
    await SimulatorRoadmapManager.buildInstance();
    configurableCorePool = new ConfigurableCorePool(
      new PoolState(new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM))
    );
  });

  afterEach(async function () {
    await dbManager.close();
  });

  describe("Test get method", async function () {
    it("can get id", async function () {
      expect(IDGenerator.validate(configurableCorePool.id)).to.be.true;
    });

    it("can get poolStateId", async function () {
      expect(IDGenerator.validate(configurableCorePool.getPoolState().id)).to.be
        .true;
    });

    it("can get corePool", async function () {
      expect(configurableCorePool.getCorePool()).to.be.an.instanceOf(CorePool);
    });
  });

  describe("Test initialize method", async function () {
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

  describe("Test business interaction method", async function () {
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
      return expect(replayEventsAndAssertReturnValues(paramArr, returnArr)).to
        .eventually.be.fulfilled;
    });

    it("can be updated with PostProcessor by user", async function () {
      let count = 0;
      configurableCorePool.updatePostProcessor(
        (pool: IConfigurableCorePool, transition: Transition) => {
          if (pool.getPoolState().id && transition.getRecord().id) count++;
          return Promise.resolve();
        }
      );
      await replayEventsAndAssertReturnValues(paramArr, returnArr);
      expect(count).to.eql(paramArr.length);
    });
  });

  describe("Test state machine method", async function () {
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
        new PoolState(new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM))
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

  // describe("Test tricky method", async function () {
  //   beforeEach(async function () {
  //     await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
  //   });

  //   it.only("can swap exactly as contract do", async function () {
  //     // TODO
  //     let liquidityToMint = TickMath.tickSpacingToMaxLiquidityPerTick(60);

  //     let amount0: JSBI, amount1: JSBI;
  //     ({ amount0, amount1 } = await configurableCorePool.mint(
  //       testUser,
  //       TickMath.MIN_TICK,
  //       TickMath.MAX_TICK,
  //       liquidityToMint
  //     ));
  //     console.log(amount0.toString());
  //     console.log(amount1.toString());
  //     ({ amount0, amount1 } = await configurableCorePool.swap(
  //       false,
  //       JSBI.unaryMinus(JSBI.subtract(amount0, JSBI.BigInt(10600000000000000)))
  //     ));
  //     console.log(amount0.toString());
  //     console.log(amount1.toString());
  //     console.log("-----------------------");
  //     console.log(configurableCorePool.getCorePool().tickCurrent);
  //   });
  // });
});
