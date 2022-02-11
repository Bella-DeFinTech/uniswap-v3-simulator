import JSBI from "jsbi";
import { NEGATIVE_ONE, ZERO, MaxUint128, Q96 } from "../enum/InternalConstants";
import assert from "assert";
import { SqrtPriceMath } from "./SqrtPriceMath";

export abstract class LiquidityMath {
  static addDelta(x: JSBI, y: JSBI): JSBI {
    assert(JSBI.lessThanOrEqual(x, MaxUint128), "OVERFLOW");
    assert(JSBI.lessThanOrEqual(y, MaxUint128), "OVERFLOW");
    if (JSBI.lessThan(y, ZERO)) {
      const negatedY = JSBI.multiply(y, NEGATIVE_ONE);
      assert(JSBI.greaterThanOrEqual(x, negatedY), "UNDERFLOW");
      return JSBI.subtract(x, negatedY);
    } else {
      assert(JSBI.lessThanOrEqual(JSBI.add(x, y), MaxUint128), "OVERFLOW");
      return JSBI.add(x, y);
    }
  }

  static getAmountsForLiquidity(
    sqrtRatioX96: JSBI,
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    liquidity: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    let amount0: JSBI = ZERO;
    let amount1: JSBI = ZERO;
    if (JSBI.greaterThan(sqrtRatioAX96, sqrtRatioBX96)) {
      [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    if (JSBI.lessThanOrEqual(sqrtRatioX96, sqrtRatioAX96)) {
      amount0 = SqrtPriceMath.getAmount0Delta(
        sqrtRatioAX96,
        sqrtRatioBX96,
        liquidity
      );
    } else if (JSBI.lessThan(sqrtRatioX96, sqrtRatioBX96)) {
      amount0 = SqrtPriceMath.getAmount0Delta(
        sqrtRatioX96,
        sqrtRatioBX96,
        liquidity
      );
      amount1 = SqrtPriceMath.getAmount1Delta(
        sqrtRatioAX96,
        sqrtRatioX96,
        liquidity
      );
    } else {
      amount1 = SqrtPriceMath.getAmount1Delta(
        sqrtRatioAX96,
        sqrtRatioBX96,
        liquidity
      );
    }
    return { amount0, amount1 };
  }

  /**
   * Computes the maximum amount of liquidity received for a given amount of token0, token1,
   * and the prices at the tick boundaries.
   * @param sqrtRatioCurrentX96 the current price
   * @param sqrtRatioAX96 price at lower boundary
   * @param sqrtRatioBX96 price at upper boundary
   * @param amount0 token0 amount
   * @param amount1 token1 amount
   * @param useFullPrecision if false, liquidity will be maximized according to what the router can calculate,
   * not what core can theoretically support
   */
  static maxLiquidityForAmounts(
    sqrtRatioCurrentX96: JSBI,
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    amount0: JSBI,
    amount1: JSBI,
    useFullPrecision: boolean
  ): JSBI {
    if (JSBI.greaterThan(sqrtRatioAX96, sqrtRatioBX96)) {
      [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    const maxLiquidityForAmount0 = useFullPrecision
      ? LiquidityMath.maxLiquidityForAmount0Precise
      : LiquidityMath.maxLiquidityForAmount0Imprecise;

    if (JSBI.lessThanOrEqual(sqrtRatioCurrentX96, sqrtRatioAX96)) {
      return maxLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, amount0);
    } else if (JSBI.lessThan(sqrtRatioCurrentX96, sqrtRatioBX96)) {
      const liquidity0 = maxLiquidityForAmount0(
        sqrtRatioCurrentX96,
        sqrtRatioBX96,
        amount0
      );
      const liquidity1 = LiquidityMath.maxLiquidityForAmount1(
        sqrtRatioAX96,
        sqrtRatioCurrentX96,
        amount1
      );
      return JSBI.lessThan(liquidity0, liquidity1) ? liquidity0 : liquidity1;
    } else {
      return LiquidityMath.maxLiquidityForAmount1(
        sqrtRatioAX96,
        sqrtRatioBX96,
        amount1
      );
    }
  }

  private static maxLiquidityForAmount0Imprecise(
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    amount0: JSBI
  ): JSBI {
    if (JSBI.greaterThan(sqrtRatioAX96, sqrtRatioBX96)) {
      [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }
    const intermediate = JSBI.divide(
      JSBI.multiply(sqrtRatioAX96, sqrtRatioBX96),
      Q96
    );
    return JSBI.divide(
      JSBI.multiply(amount0, intermediate),
      JSBI.subtract(sqrtRatioBX96, sqrtRatioAX96)
    );
  }

  /**
   * Returns a precise maximum amount of liquidity received for a given amount of token 0 by dividing by Q64 instead of Q96 in the intermediate step,
   * and shifting the subtracted ratio left by 32 bits.
   * @param sqrtRatioAX96 The price at the lower boundary
   * @param sqrtRatioBX96 The price at the upper boundary
   * @param amount0 The token0 amount
   * @returns liquidity for amount0, precise
   */
  private static maxLiquidityForAmount0Precise(
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    amount0: JSBI
  ): JSBI {
    if (JSBI.greaterThan(sqrtRatioAX96, sqrtRatioBX96)) {
      [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }

    const numerator = JSBI.multiply(
      JSBI.multiply(amount0, sqrtRatioAX96),
      sqrtRatioBX96
    );
    const denominator = JSBI.multiply(
      Q96,
      JSBI.subtract(sqrtRatioBX96, sqrtRatioAX96)
    );

    return JSBI.divide(numerator, denominator);
  }

  /**
   * Computes the maximum amount of liquidity received for a given amount of token1
   * @param sqrtRatioAX96 The price at the lower tick boundary
   * @param sqrtRatioBX96 The price at the upper tick boundary
   * @param amount1 The token1 amount
   * @returns liquidity for amount1
   */
  private static maxLiquidityForAmount1(
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    amount1: JSBI
  ): JSBI {
    if (JSBI.greaterThan(sqrtRatioAX96, sqrtRatioBX96)) {
      [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
    }
    return JSBI.divide(
      JSBI.multiply(amount1, Q96),
      JSBI.subtract(sqrtRatioBX96, sqrtRatioAX96)
    );
  }
}
