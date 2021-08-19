import JSBI from "jsbi";
import { TickMath as TickMathLibrary } from "@uniswap/v3-sdk";

export abstract class TickMath {
  /**
   * The minimum tick that can be used on any pool.
   */
  static MIN_TICK: number = -887272;
  /**
   * The maximum tick that can be used on any pool.
   */
  static MAX_TICK: number = -TickMath.MIN_TICK;

  /**
   * The sqrt ratio corresponding to the minimum tick that could be used on any pool.
   */
  static MIN_SQRT_RATIO: JSBI = JSBI.BigInt("4295128739");
  /**
   * The sqrt ratio corresponding to the maximum tick that could be used on any pool.
   */
  static MAX_SQRT_RATIO: JSBI = JSBI.BigInt(
    "1461446703485210103287273052203988822378723970342"
  );

  static getSqrtRatioAtTick(tick: number): JSBI {
    return TickMathLibrary.getSqrtRatioAtTick(tick);
  }
  static getTickAtSqrtRatio(sqrtPriceX96: JSBI): number {
    return TickMathLibrary.getTickAtSqrtRatio(sqrtPriceX96);
  }
}
