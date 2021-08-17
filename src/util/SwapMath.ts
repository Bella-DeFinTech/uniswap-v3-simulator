import BN from "bn.js";

export abstract class SwapMath {
  static computeSwapStep(
    sqrtRatioCurrentX96: BN,
    sqrtRatioTargetX96: BN,
    liquidity: BN,
    amountRemaining: BN,
    feePips: number
  ): { sqrtRatioNextX96: BN; amountIn: BN; amountOut: BN; feeAmount: BN } {
    // TODO
    return {
      sqrtRatioNextX96: new BN(0),
      amountIn: new BN(0),
      amountOut: new BN(0),
      feeAmount: new BN(0),
    };
  }
}
