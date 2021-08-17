import BN from "bn.js";

export abstract class TickMath {
  static getSqrtRatioAtTick(tick: number): BN {
    // TODO
    return new BN(0);
  }
  static getTickAtSqrtRatio(sqrtPriceX96: BN): number {
    // TODO
    return 0;
  }
}
