import { expect } from "chai";
import JSBI from "jsbi";
import { MaxUint256 } from "../src/enum/InternalConstants";
import { LiquidityMath } from "../src/util/LiquidityMath";
import { FullMath } from "../src/util/FullMath";

describe("#maxLiquidityForAmounts", () => {
  const maxLiquidityForAmounts = LiquidityMath.maxLiquidityForAmounts;

  function encodeSqrtRatioX96(amount1: number, amount0: number): JSBI {
    const numerator = JSBI.leftShift(JSBI.BigInt(amount1), JSBI.BigInt(192));
    const denominator = JSBI.BigInt(amount0);
    const ratioX192 = JSBI.divide(numerator, denominator);
    return FullMath.sqrt(ratioX192);
  }

  describe("imprecise", () => {
    describe("price inside", () => {
      it("100 token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(1, 1),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            JSBI.BigInt("200"),
            false
          )
        ).to.eql(JSBI.BigInt(2148));
      });

      it("100 token0, max token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(1, 1),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            MaxUint256,
            false
          )
        ).to.eql(JSBI.BigInt(2148));
      });

      it("max token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(1, 1),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            MaxUint256,
            JSBI.BigInt("200"),
            false
          )
        ).to.eql(JSBI.BigInt(4297));
      });
    });

    describe("price below", () => {
      it("100 token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(99, 110),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            JSBI.BigInt("200"),
            false
          )
        ).to.eql(JSBI.BigInt(1048));
      });

      it("100 token0, max token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(99, 110),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            MaxUint256,
            false
          )
        ).to.eql(JSBI.BigInt(1048));
      });

      it("max token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(99, 110),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            MaxUint256,
            JSBI.BigInt("200"),
            false
          )
        ).to.eql(
          JSBI.BigInt(
            "1214437677402050006470401421068302637228917309992228326090730924516431320489727"
          )
        );
      });
    });

    describe("price above", () => {
      it("100 token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(111, 100),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            JSBI.BigInt("200"),
            false
          )
        ).to.eql(JSBI.BigInt(2097));
      });

      it("100 token0, max token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(111, 100),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            MaxUint256,
            false
          )
        ).to.eql(
          JSBI.BigInt(
            "1214437677402050006470401421098959354205873606971497132040612572422243086574654"
          )
        );
      });

      it("max token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(111, 100),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            MaxUint256,
            JSBI.BigInt("200"),
            false
          )
        ).to.eql(JSBI.BigInt(2097));
      });
    });
  });

  describe("precise", () => {
    describe("price inside", () => {
      it("100 token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(1, 1),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            JSBI.BigInt("200"),
            true
          )
        ).to.eql(JSBI.BigInt(2148));
      });

      it("100 token0, max token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(1, 1),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            MaxUint256,
            true
          )
        ).to.eql(JSBI.BigInt(2148));
      });

      it("max token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(1, 1),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            MaxUint256,
            JSBI.BigInt("200"),
            true
          )
        ).to.eql(JSBI.BigInt(4297));
      });
    });

    describe("price below", () => {
      it("100 token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(99, 110),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            JSBI.BigInt("200"),
            true
          )
        ).to.eql(JSBI.BigInt(1048));
      });

      it("100 token0, max token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(99, 110),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            MaxUint256,
            true
          )
        ).to.eql(JSBI.BigInt(1048));
      });

      it("max token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(99, 110),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            MaxUint256,
            JSBI.BigInt("200"),
            true
          )
        ).to.eql(
          JSBI.BigInt(
            "1214437677402050006470401421082903520362793114274352355276488318240158678126184"
          )
        );
      });
    });

    describe("price above", () => {
      it("100 token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(111, 100),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            JSBI.BigInt("200"),
            true
          )
        ).to.eql(JSBI.BigInt(2097));
      });

      it("100 token0, max token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(111, 100),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            JSBI.BigInt("100"),
            MaxUint256,
            true
          )
        ).to.eql(
          JSBI.BigInt(
            "1214437677402050006470401421098959354205873606971497132040612572422243086574654"
          )
        );
      });

      it("max token0, 200 token1", () => {
        expect(
          maxLiquidityForAmounts(
            encodeSqrtRatioX96(111, 100),
            encodeSqrtRatioX96(100, 110),
            encodeSqrtRatioX96(110, 100),
            MaxUint256,
            JSBI.BigInt("200"),
            true
          )
        ).to.eql(JSBI.BigInt(2097));
      });
    });
  });
});
