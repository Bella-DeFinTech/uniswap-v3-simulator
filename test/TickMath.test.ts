import { expect } from "chai";
import JSBI from "jsbi";
import { ONE, MaxUint256, TWO } from "../src/enum/InternalConstants";
import { TickMath } from "../src/util/TickMath";

describe("TickMath", () => {
  describe("#MIN_TICK", () => {
    it("eqls correct value", () => {
      expect(TickMath.MIN_TICK).eql(-887272);
    });
  });

  describe("#MAX_TICK", () => {
    it("eqls correct value", () => {
      expect(TickMath.MAX_TICK).eql(887272);
    });
  });

  describe("#getSqrtRatioAtTick", () => {
    it("throws for non integer", () => {
      expect(() => TickMath.getSqrtRatioAtTick(1.5)).throw("TICK");
    });

    it("throws for tick too small", () => {
      expect(() => TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK - 1)).throw(
        "TICK"
      );
    });

    it("throws for tick too large", () => {
      expect(() => TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK + 1)).throw(
        "TICK"
      );
    });

    it("returns the correct value for min tick", () => {
      expect(TickMath.getSqrtRatioAtTick(TickMath.MIN_TICK)).eql(
        TickMath.MIN_SQRT_RATIO
      );
    });

    it("returns the correct value for tick 0", () => {
      expect(TickMath.getSqrtRatioAtTick(0)).eql(
        JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(96))
      );
    });

    it("returns the correct value for max tick", () => {
      expect(TickMath.getSqrtRatioAtTick(TickMath.MAX_TICK)).eql(
        TickMath.MAX_SQRT_RATIO
      );
    });
  });

  describe("#getTickAtSqrtRatio", () => {
    it("returns the correct value for sqrt ratio at min tick", () => {
      expect(TickMath.getTickAtSqrtRatio(TickMath.MIN_SQRT_RATIO)).eql(
        TickMath.MIN_TICK
      );
    });
    it("returns the correct value for sqrt ratio at max tick", () => {
      expect(
        TickMath.getTickAtSqrtRatio(JSBI.subtract(TickMath.MAX_SQRT_RATIO, ONE))
      ).eql(TickMath.MAX_TICK - 1);
    });
  });

  describe("mostSignificantBit", () => {
    it("throws for zero", () => {
      expect(() => TickMath.mostSignificantBit(JSBI.BigInt(0))).throw("ZERO");
    });
    it("correct value for every power of 2", () => {
      for (let i = 1; i < 256; i++) {
        const x = JSBI.exponentiate(TWO, JSBI.BigInt(i));
        expect(TickMath.mostSignificantBit(x)).equal(i);
      }
    });
    it("correct value for every power of 2 - 1", () => {
      for (let i = 2; i < 256; i++) {
        const x = JSBI.subtract(
          JSBI.exponentiate(TWO, JSBI.BigInt(i)),
          JSBI.BigInt(1)
        );
        expect(TickMath.mostSignificantBit(x)).equal(i - 1);
      }
    });

    it("succeeds for MaxUint256", () => {
      expect(TickMath.mostSignificantBit(MaxUint256)).equal(255);
    });

    it("throws for MaxUint256 + 1", () => {
      expect(() =>
        TickMath.mostSignificantBit(JSBI.add(MaxUint256, ONE))
      ).throw("MAX");
    });
  });
});
