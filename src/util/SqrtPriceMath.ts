import BN from "bn.js";

export abstract class SqrtPriceMath {
  static getAmount0Delta(
    sqrtRatioAX96: BN,
    sqrtRatioBX96: BN,
    liquidity: BN
  ): BN {
    //TODO
    return new BN(0);
  }
  static getAmount1Delta(
    sqrtRatioAX96: BN,
    sqrtRatioBX96: BN,
    liquidity: BN
  ): BN {
    //TODO
    return new BN(0);
  }
  static getNextSqrtPriceFromInput(
    sqrtRatioAX96: BN,
    liquidity: BN,
    amountIn: BN,
    zeroForOne: boolean
  ): BN {
    //TODO
    return new BN(0);
  }
  static getNextSqrtPriceFromOutput(
    sqrtRatioAX96: BN,
    liquidity: BN,
    amountOut: BN,
    zeroForOne: boolean
  ): BN {
    //TODO
    return new BN(0);
  }
}
