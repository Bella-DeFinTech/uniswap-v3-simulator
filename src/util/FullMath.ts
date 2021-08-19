import JSBI from "jsbi";
import { FullMath as MathLibrary } from "@uniswap/v3-sdk";

export abstract class FullMath {
  static mulDiv(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    return JSBI.divide(product, denominator);
  }

  static mulDivRoundingUp(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    MathLibrary.mulDivRoundingUp(a, b, denominator);
    return JSBI.BigInt(0);
  }
}
