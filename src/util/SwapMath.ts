import JSBI from 'jsbi';

export abstract class SwapMath {
  static computeSwapStep(
    sqrtRatioCurrentX96: JSBI,
    sqrtRatioTargetX96: JSBI,
    liquidity: JSBI,
    amountRemaining: JSBI,
    feePips: number
  ): { sqrtRatioNextX96: JSBI; amountIn: JSBI; amountOut: JSBI; feeAmount: JSBI } {
    // TODO
    return {
      sqrtRatioNextX96: JSBI.BigInt(0),
      amountIn: JSBI.BigInt(0),
      amountOut: JSBI.BigInt(0),
      feeAmount: JSBI.BigInt(0),
    };
  }
}
