import JSBI from "jsbi";
import { FullMath } from "./FullMath";
import { SqrtPriceMath } from "./SqrtPriceMath";
import { FeeAmount } from "../enum/FeeAmount";
import { ZERO, NEGATIVE_ONE, MAX_FEE } from "../enum/InternalConstants";

export abstract class SwapMath {
  static computeSwapStep(
    sqrtRatioCurrentX96: JSBI,
    sqrtRatioTargetX96: JSBI,
    liquidity: JSBI,
    amountRemaining: JSBI,
    feePips: FeeAmount
  ): [JSBI, JSBI, JSBI, JSBI] {
    const returnValues: Partial<{
      sqrtRatioNextX96: JSBI;
      amountIn: JSBI;
      amountOut: JSBI;
      feeAmount: JSBI;
    }> = {};

    const zeroForOne = JSBI.greaterThanOrEqual(
      sqrtRatioCurrentX96,
      sqrtRatioTargetX96
    );
    const exactIn = JSBI.greaterThanOrEqual(amountRemaining, ZERO);

    if (exactIn) {
      const amountRemainingLessFee = JSBI.divide(
        JSBI.multiply(
          amountRemaining,
          JSBI.subtract(MAX_FEE, JSBI.BigInt(feePips))
        ),
        MAX_FEE
      );
      returnValues.amountIn = zeroForOne
        ? SqrtPriceMath.getAmount0DeltaWithRoundUp(
            sqrtRatioTargetX96,
            sqrtRatioCurrentX96,
            liquidity,
            true
          )
        : SqrtPriceMath.getAmount1DeltaWithRoundUp(
            sqrtRatioCurrentX96,
            sqrtRatioTargetX96,
            liquidity,
            true
          );
      if (
        JSBI.greaterThanOrEqual(amountRemainingLessFee, returnValues.amountIn!)
      ) {
        returnValues.sqrtRatioNextX96 = sqrtRatioTargetX96;
      } else {
        returnValues.sqrtRatioNextX96 = SqrtPriceMath.getNextSqrtPriceFromInput(
          sqrtRatioCurrentX96,
          liquidity,
          amountRemainingLessFee,
          zeroForOne
        );
      }
    } else {
      returnValues.amountOut = zeroForOne
        ? SqrtPriceMath.getAmount1DeltaWithRoundUp(
            sqrtRatioTargetX96,
            sqrtRatioCurrentX96,
            liquidity,
            false
          )
        : SqrtPriceMath.getAmount0DeltaWithRoundUp(
            sqrtRatioCurrentX96,
            sqrtRatioTargetX96,
            liquidity,
            false
          );
      if (
        JSBI.greaterThanOrEqual(
          JSBI.multiply(amountRemaining, NEGATIVE_ONE),
          returnValues.amountOut
        )
      ) {
        returnValues.sqrtRatioNextX96 = sqrtRatioTargetX96;
      } else {
        returnValues.sqrtRatioNextX96 =
          SqrtPriceMath.getNextSqrtPriceFromOutput(
            sqrtRatioCurrentX96,
            liquidity,
            JSBI.multiply(amountRemaining, NEGATIVE_ONE),
            zeroForOne
          );
      }
    }

    const max = JSBI.equal(sqrtRatioTargetX96, returnValues.sqrtRatioNextX96);

    if (zeroForOne) {
      returnValues.amountIn =
        max && exactIn
          ? returnValues.amountIn
          : SqrtPriceMath.getAmount0DeltaWithRoundUp(
              returnValues.sqrtRatioNextX96,
              sqrtRatioCurrentX96,
              liquidity,
              true
            );
      returnValues.amountOut =
        max && !exactIn
          ? returnValues.amountOut
          : SqrtPriceMath.getAmount1DeltaWithRoundUp(
              returnValues.sqrtRatioNextX96,
              sqrtRatioCurrentX96,
              liquidity,
              false
            );
    } else {
      returnValues.amountIn =
        max && exactIn
          ? returnValues.amountIn
          : SqrtPriceMath.getAmount1DeltaWithRoundUp(
              sqrtRatioCurrentX96,
              returnValues.sqrtRatioNextX96,
              liquidity,
              true
            );
      returnValues.amountOut =
        max && !exactIn
          ? returnValues.amountOut
          : SqrtPriceMath.getAmount0DeltaWithRoundUp(
              sqrtRatioCurrentX96,
              returnValues.sqrtRatioNextX96,
              liquidity,
              false
            );
    }

    if (
      !exactIn &&
      JSBI.greaterThan(
        returnValues.amountOut!,
        JSBI.multiply(amountRemaining, NEGATIVE_ONE)
      )
    ) {
      returnValues.amountOut = JSBI.multiply(amountRemaining, NEGATIVE_ONE);
    }

    if (
      exactIn &&
      JSBI.notEqual(returnValues.sqrtRatioNextX96, sqrtRatioTargetX96)
    ) {
      // we didn't reach the target, so take the remainder of the maximum input as fee
      returnValues.feeAmount = JSBI.subtract(
        amountRemaining,
        returnValues.amountIn!
      );
    } else {
      returnValues.feeAmount = FullMath.mulDivRoundingUp(
        returnValues.amountIn!,
        JSBI.BigInt(feePips),
        JSBI.subtract(MAX_FEE, JSBI.BigInt(feePips))
      );
    }

    return [
      returnValues.sqrtRatioNextX96!,
      returnValues.amountIn!,
      returnValues.amountOut!,
      returnValues.feeAmount!,
    ];
  }
}
