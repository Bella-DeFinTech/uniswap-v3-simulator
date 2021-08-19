import JSBI from 'jsbi';

export abstract class SqrtPriceMath {
  static getAmount0Delta(
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    liquidity: JSBI
  ): JSBI {
    //TODO
    return JSBI.BigInt(0);
  }
  static getAmount1Delta(
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    liquidity: JSBI
  ): JSBI {
    //TODO
    return JSBI.BigInt(0);
  }
  static getNextSqrtPriceFromInput(
    sqrtRatioAX96: JSBI,
    liquidity: JSBI,
    amountIn: JSBI,
    zeroForOne: boolean
  ): JSBI {
    //TODO
    return JSBI.BigInt(0);
  }
  static getNextSqrtPriceFromOutput(
    sqrtRatioAX96: JSBI,
    liquidity: JSBI,
    amountOut: JSBI,
    zeroForOne: boolean
  ): JSBI {
    //TODO
    return JSBI.BigInt(0);
  }
}
