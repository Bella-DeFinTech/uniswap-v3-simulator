import JSBI from "jsbi";
import { ZERO, ONE } from "../enum/InternalConstants";

export abstract class FullMath {
  static mulDiv(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    return JSBI.divide(product, denominator);
  }

  static mulDivRoundingUp(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    let result = JSBI.divide(product, denominator);
    if (JSBI.notEqual(JSBI.remainder(product, denominator), ZERO))
      result = JSBI.add(result, ONE);
    return result;
  }
}
