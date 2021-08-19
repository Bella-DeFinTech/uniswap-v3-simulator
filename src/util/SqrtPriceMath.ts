import JSBI from "jsbi";
import { SqrtPriceMath as SqrtPriceMathLibrary } from "@uniswap/v3-sdk";

export abstract class SqrtPriceMath {
  static getAmount0Delta(
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    liquidity: JSBI
  ): JSBI {
    return JSBI.lessThan(liquidity, JSBI.BigInt(0))
      ? JSBI.unaryMinus(
          SqrtPriceMathLibrary.getAmount0Delta(
            sqrtRatioAX96,
            sqrtRatioBX96,
            JSBI.unaryMinus(liquidity),
            false
          )
        )
      : SqrtPriceMathLibrary.getAmount0Delta(
          sqrtRatioAX96,
          sqrtRatioBX96,
          liquidity,
          true
        );
  }

  static getAmount1Delta(
    sqrtRatioAX96: JSBI,
    sqrtRatioBX96: JSBI,
    liquidity: JSBI
  ): JSBI {
    return JSBI.lessThan(liquidity, JSBI.BigInt(0))
      ? JSBI.unaryMinus(
          SqrtPriceMathLibrary.getAmount1Delta(
            sqrtRatioAX96,
            sqrtRatioBX96,
            JSBI.unaryMinus(liquidity),
            false
          )
        )
      : SqrtPriceMathLibrary.getAmount1Delta(
          sqrtRatioAX96,
          sqrtRatioBX96,
          liquidity,
          true
        );
  }

  static getNextSqrtPriceFromInput(
    sqrtRatioAX96: JSBI,
    liquidity: JSBI,
    amountIn: JSBI,
    zeroForOne: boolean
  ): JSBI {
    return SqrtPriceMathLibrary.getNextSqrtPriceFromInput(
      sqrtRatioAX96,
      liquidity,
      amountIn,
      zeroForOne
    );
  }

  static getNextSqrtPriceFromOutput(
    sqrtRatioAX96: JSBI,
    liquidity: JSBI,
    amountOut: JSBI,
    zeroForOne: boolean
  ): JSBI {
    return SqrtPriceMathLibrary.getNextSqrtPriceFromOutput(
      sqrtRatioAX96,
      liquidity,
      amountOut,
      zeroForOne
    );
  }
}
