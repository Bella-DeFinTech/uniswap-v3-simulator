import JSBI from 'jsbi';

export abstract class TickMath {
  static getSqrtRatioAtTick(tick: number): JSBI {
    // TODO
    return JSBI.BigInt(0);
  }
  static getTickAtSqrtRatio(sqrtPriceX96: JSBI): number {
    // TODO
    return 0;
  }
}
