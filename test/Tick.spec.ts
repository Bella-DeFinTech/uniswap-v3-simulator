import { TickTest } from "./stubs/TickTest";
import { expect } from "./shared/expect";
import {
  FeeAmount,
  getMaxLiquidityPerTick,
  TICK_SPACINGS,
} from "./shared/utilities";
import { TickManager } from "../src/manager/TickManager";
import {
  MaxUint128,
  MaxUint256,
  ONE,
  TWO,
  ZERO,
} from "../src/enum/InternalConstants";
import JSBI from "jsbi";
import { Tick } from "../src/model/Tick";

describe("Tick", () => {
  let tickManager: TickManager;
  let tickTest: TickTest;

  beforeEach("deploy TickTest", async () => {
    tickManager = new TickManager();
    tickTest = new TickTest(tickManager);
  });

  describe("#tickSpacingToMaxLiquidityPerTick", () => {
    it("returns the correct value for low fee", async () => {
      const maxLiquidityPerTick =
        await tickTest.tickSpacingToMaxLiquidityPerTick(
          TICK_SPACINGS[FeeAmount.LOW]
        );
      expect(maxLiquidityPerTick.toString()).to.eql(
        "1917569901783203986719870431555990"
      ); // 110.8 bits
      expect(maxLiquidityPerTick.toString()).to.eql(
        getMaxLiquidityPerTick(TICK_SPACINGS[FeeAmount.LOW]).toString()
      );
    });
    it("returns the correct value for medium fee", async () => {
      const maxLiquidityPerTick =
        await tickTest.tickSpacingToMaxLiquidityPerTick(
          TICK_SPACINGS[FeeAmount.MEDIUM]
        );
      expect(maxLiquidityPerTick.toString()).to.eql(
        "11505743598341114571880798222544994"
      ); // 113.1 bits
      expect(maxLiquidityPerTick.toString()).to.eql(
        getMaxLiquidityPerTick(TICK_SPACINGS[FeeAmount.MEDIUM]).toString()
      );
    });
    it("returns the correct value for high fee", async () => {
      const maxLiquidityPerTick =
        await tickTest.tickSpacingToMaxLiquidityPerTick(
          TICK_SPACINGS[FeeAmount.HIGH]
        );
      expect(maxLiquidityPerTick.toString()).to.eql(
        "38350317471085141830651933667504588"
      ); // 114.7 bits
      expect(maxLiquidityPerTick.toString()).to.eql(
        getMaxLiquidityPerTick(TICK_SPACINGS[FeeAmount.HIGH]).toString()
      );
    });
    it("returns the correct value for entire range", async () => {
      const maxLiquidityPerTick =
        await tickTest.tickSpacingToMaxLiquidityPerTick(887272);
      expect(maxLiquidityPerTick.toString()).to.eql(
        JSBI.divide(MaxUint128, JSBI.BigInt(3)).toString()
      ); // 126 bits
      expect(maxLiquidityPerTick.toString()).to.eql(
        getMaxLiquidityPerTick(887272).toString()
      );
    });
    it("returns the correct value for 2302", async () => {
      const maxLiquidityPerTick =
        await tickTest.tickSpacingToMaxLiquidityPerTick(2302);
      expect(maxLiquidityPerTick.toString()).to.eql(
        "441351967472034323558203122479595605"
      ); // 118 bits
      expect(maxLiquidityPerTick.toString()).to.eql(
        getMaxLiquidityPerTick(2302).toString()
      );
    });
  });

  describe("#getFeeGrowthInside", () => {
    beforeEach("initialize 2 ticks: 2 and -2", async () => {
      tickManager.set(new Tick(-2));
      tickManager.set(new Tick(2));
    });
    it("returns all for two uninitialized ticks if tick is inside", async () => {
      const { feeGrowthInside0X128, feeGrowthInside1X128 } =
        await tickTest.getFeeGrowthInside(
          -2,
          2,
          0,
          JSBI.BigInt(15),
          JSBI.BigInt(15)
        );
      expect(feeGrowthInside0X128.toString()).to.eql("15");
      expect(feeGrowthInside1X128.toString()).to.eql("15");
    });
    it("returns 0 for two uninitialized ticks if tick is above", async () => {
      const { feeGrowthInside0X128, feeGrowthInside1X128 } =
        await tickTest.getFeeGrowthInside(
          -2,
          2,
          4,
          JSBI.BigInt(15),
          JSBI.BigInt(15)
        );
      expect(feeGrowthInside0X128.toString()).to.eql("0");
      expect(feeGrowthInside1X128.toString()).to.eql("0");
    });
    it("returns 0 for two uninitialized ticks if tick is below", async () => {
      const { feeGrowthInside0X128, feeGrowthInside1X128 } =
        await tickTest.getFeeGrowthInside(
          -2,
          2,
          -4,
          JSBI.BigInt(15),
          JSBI.BigInt(15)
        );
      expect(feeGrowthInside0X128.toString()).to.eql("0");
      expect(feeGrowthInside1X128.toString()).to.eql("0");
    });

    it("subtracts upper tick if below", async () => {
      await tickTest.setTick(2, {
        feeGrowthOutside0X128: TWO,
        feeGrowthOutside1X128: JSBI.BigInt(3),
        liquidityGross: ZERO,
        liquidityNet: ZERO,
      });
      const { feeGrowthInside0X128, feeGrowthInside1X128 } =
        await tickTest.getFeeGrowthInside(
          -2,
          2,
          0,
          JSBI.BigInt(15),
          JSBI.BigInt(15)
        );
      expect(feeGrowthInside0X128.toString()).to.eql("13");
      expect(feeGrowthInside1X128.toString()).to.eql("12");
    });

    it("subtracts lower tick if above", async () => {
      await tickTest.setTick(-2, {
        feeGrowthOutside0X128: TWO,
        feeGrowthOutside1X128: JSBI.BigInt(3),
        liquidityGross: ZERO,
        liquidityNet: ZERO,
      });
      const { feeGrowthInside0X128, feeGrowthInside1X128 } =
        await tickTest.getFeeGrowthInside(
          -2,
          2,
          0,
          JSBI.BigInt(15),
          JSBI.BigInt(15)
        );
      expect(feeGrowthInside0X128.toString()).to.eql("13");
      expect(feeGrowthInside1X128.toString()).to.eql("12");
    });

    it("subtracts upper and lower tick if inside", async () => {
      await tickTest.setTick(-2, {
        feeGrowthOutside0X128: TWO,
        feeGrowthOutside1X128: JSBI.BigInt(3),
        liquidityGross: ZERO,
        liquidityNet: ZERO,
      });
      await tickTest.setTick(2, {
        feeGrowthOutside0X128: JSBI.BigInt(4),
        feeGrowthOutside1X128: JSBI.BigInt(1),
        liquidityGross: ZERO,
        liquidityNet: ZERO,
      });
      const { feeGrowthInside0X128, feeGrowthInside1X128 } =
        await tickTest.getFeeGrowthInside(
          -2,
          2,
          0,
          JSBI.BigInt(15),
          JSBI.BigInt(15)
        );
      expect(feeGrowthInside0X128.toString()).to.eql("9");
      expect(feeGrowthInside1X128.toString()).to.eql("11");
    });

    it("works correctly with overflow on inside tick", async () => {
      await tickTest.setTick(-2, {
        feeGrowthOutside0X128: JSBI.subtract(MaxUint256, JSBI.BigInt(3)),
        feeGrowthOutside1X128: JSBI.subtract(MaxUint256, TWO),
        liquidityGross: ZERO,
        liquidityNet: ZERO,
      });
      await tickTest.setTick(2, {
        feeGrowthOutside0X128: JSBI.BigInt(3),
        feeGrowthOutside1X128: JSBI.BigInt(5),
        liquidityGross: ZERO,
        liquidityNet: ZERO,
      });
      const { feeGrowthInside0X128, feeGrowthInside1X128 } =
        await tickTest.getFeeGrowthInside(
          -2,
          2,
          0,
          JSBI.BigInt(15),
          JSBI.BigInt(15)
        );
      expect(feeGrowthInside0X128.toString()).to.eql("16");
      expect(feeGrowthInside1X128.toString()).to.eql("13");
    });
  });

  describe("#update", async () => {
    beforeEach("initialize 3 ticks: 0, 1, and 2", async () => {
      tickManager.set(new Tick(0));
      tickManager.set(new Tick(1));
      tickManager.set(new Tick(2));
    });
    it("flips from zero to nonzero", async () => {
      expect(
        await tickTest.update(0, 0, ONE, ZERO, ZERO, false, JSBI.BigInt(3))
      ).to.eql(true);
    });
    it("does not flip from nonzero to greater nonzero", async () => {
      await tickTest.update(0, 0, ONE, ZERO, ZERO, false, JSBI.BigInt(3));
      expect(
        await tickTest.update(0, 0, ONE, ZERO, ZERO, false, JSBI.BigInt(3))
      ).to.eql(false);
    });
    it("flips from nonzero to zero", async () => {
      await tickTest.update(0, 0, ONE, ZERO, ZERO, false, JSBI.BigInt(3));
      expect(
        await tickTest.update(
          0,
          0,
          JSBI.unaryMinus(ONE),
          ZERO,
          ZERO,
          false,
          JSBI.BigInt(3)
        )
      ).to.eql(true);
    });
    it("does not flip from nonzero to lesser nonzero", async () => {
      await tickTest.update(0, 0, TWO, ZERO, ZERO, false, JSBI.BigInt(3));
      expect(
        await tickTest.update(
          0,
          0,
          JSBI.unaryMinus(ONE),
          ZERO,
          ZERO,
          false,
          JSBI.BigInt(3)
        )
      ).to.eql(false);
    });
    it("does not flip from nonzero to lesser nonzero", async () => {
      await tickTest.update(0, 0, TWO, ZERO, ZERO, false, JSBI.BigInt(3));
      expect(
        await tickTest.update(
          0,
          0,
          JSBI.unaryMinus(ONE),
          ZERO,
          ZERO,
          false,
          JSBI.BigInt(3)
        )
      ).to.eql(false);
    });
    it("reverts if total liquidity gross is greater than max", async () => {
      await tickTest.update(0, 0, TWO, ZERO, ZERO, false, JSBI.BigInt(3));
      await tickTest.update(0, 0, ONE, ZERO, ZERO, true, JSBI.BigInt(3));
      expect(() =>
        tickTest.update(0, 0, ONE, ZERO, ZERO, false, JSBI.BigInt(3))
      ).to.throw("LO");
    });
    it("nets the liquidity based on upper flag", async () => {
      await tickTest.update(0, 0, TWO, ZERO, ZERO, false, JSBI.BigInt(10));
      await tickTest.update(0, 0, ONE, ZERO, ZERO, true, JSBI.BigInt(10));
      await tickTest.update(
        0,
        0,
        JSBI.BigInt(3),
        ZERO,
        ZERO,
        true,
        JSBI.BigInt(10)
      );
      await tickTest.update(0, 0, ONE, ZERO, ZERO, false, JSBI.BigInt(10));
      const { liquidityGross, liquidityNet } = await tickTest.ticks(0);
      expect(liquidityGross.toString()).to.eql((2 + 1 + 3 + 1).toString());
      expect(liquidityNet.toString()).to.eql((2 - 1 - 3 + 1).toString());
    });
    it("reverts on overflow liquidity net", async () => {
      await tickTest.update(
        0,
        0,
        JSBI.subtract(JSBI.divide(MaxUint128, TWO), ONE),
        ZERO,
        ZERO,
        false,
        MaxUint128
      );
      expect(() =>
        tickTest.update(
          0,
          0,
          JSBI.subtract(JSBI.divide(MaxUint128, TWO), ONE),
          ZERO,
          ZERO,
          false,
          MaxUint128
        )
      ).to.throw();
    });
    it("assumes all growth happens below ticks lte current tick", async () => {
      await tickTest.update(1, 1, ONE, ONE, TWO, false, MaxUint128);
      const { feeGrowthOutside0X128, feeGrowthOutside1X128, initialized } =
        await tickTest.ticks(1);
      expect(feeGrowthOutside0X128.toString()).to.eql("1");
      expect(feeGrowthOutside1X128.toString()).to.eql("2");
      expect(initialized).to.eql(true);
    });
    it("does not set any growth fields if tick is already initialized", async () => {
      await tickTest.update(1, 1, ONE, ONE, TWO, false, MaxUint128);
      await tickTest.update(
        1,
        1,
        ONE,
        JSBI.BigInt(6),
        JSBI.BigInt(7),
        false,
        MaxUint128
      );
      const { feeGrowthOutside0X128, feeGrowthOutside1X128, initialized } =
        await tickTest.ticks(1);
      expect(feeGrowthOutside0X128.toString()).to.eql("1");
      expect(feeGrowthOutside1X128.toString()).to.eql("2");
      expect(initialized).to.eql(true);
    });
    it("does not set any growth fields for ticks gt current tick", async () => {
      await tickTest.update(2, 1, ONE, ONE, TWO, false, MaxUint128);
      const { feeGrowthOutside0X128, feeGrowthOutside1X128, initialized } =
        await tickTest.ticks(2);
      expect(feeGrowthOutside0X128.toString()).to.eql("0");
      expect(feeGrowthOutside1X128.toString()).to.eql("0");
      expect(initialized).to.eql(true);
    });
  });

  describe("#clear", async () => {
    beforeEach("initialize 1 tick: 2", async () => {
      tickManager.set(new Tick(2));
    });
    it("deletes all the data in the tick", async () => {
      await tickTest.setTick(2, {
        feeGrowthOutside0X128: ONE,
        feeGrowthOutside1X128: TWO,
        liquidityGross: JSBI.BigInt(3),
        liquidityNet: JSBI.BigInt(4),
      });
      await tickTest.clear(2);
      const {
        feeGrowthOutside0X128,
        feeGrowthOutside1X128,
        liquidityGross,
        liquidityNet,
        initialized,
      } = await tickTest.ticks(2);
      expect(feeGrowthOutside0X128.toString()).to.eql("0");
      expect(feeGrowthOutside1X128.toString()).to.eql("0");
      expect(liquidityGross.toString()).to.eql("0");
      expect(liquidityNet.toString()).to.eql("0");
      expect(initialized).to.eql(false);
    });
  });

  describe("#cross", () => {
    beforeEach("initialize 1 tick: 2", async () => {
      tickManager.set(new Tick(2));
    });
    it("flips the growth variables", async () => {
      await tickTest.setTick(2, {
        feeGrowthOutside0X128: ONE,
        feeGrowthOutside1X128: TWO,
        liquidityGross: JSBI.BigInt(3),
        liquidityNet: JSBI.BigInt(4),
      });
      await tickTest.cross(2, JSBI.BigInt(7), JSBI.BigInt(9));
      const { feeGrowthOutside0X128, feeGrowthOutside1X128 } =
        await tickTest.ticks(2);
      expect(feeGrowthOutside0X128.toString()).to.eql("6");
      expect(feeGrowthOutside1X128.toString()).to.eql("7");
    });
    it("two flips are no op", async () => {
      await tickTest.setTick(2, {
        feeGrowthOutside0X128: ONE,
        feeGrowthOutside1X128: TWO,
        liquidityGross: JSBI.BigInt(3),
        liquidityNet: JSBI.BigInt(4),
      });
      await tickTest.cross(2, JSBI.BigInt(7), JSBI.BigInt(9));
      await tickTest.cross(2, JSBI.BigInt(7), JSBI.BigInt(9));
      const { feeGrowthOutside0X128, feeGrowthOutside1X128 } =
        await tickTest.ticks(2);
      expect(feeGrowthOutside0X128.toString()).to.eql("1");
      expect(feeGrowthOutside1X128.toString()).to.eql("2");
    });
  });
});
