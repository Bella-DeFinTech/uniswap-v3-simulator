import JSBI from "jsbi";
import { ZERO, ONE, MaxUint256 } from "../enum/InternalConstants";
import assert from "assert";

export abstract class FullMath {
  static mulDiv(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    return JSBI.divide(product, denominator);
  }

  static mulDivRoundingUp(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    let result = JSBI.divide(product, denominator);
    if (JSBI.greaterThan(JSBI.remainder(product, denominator), ZERO)){
      assert(JSBI.lessThan(result, MaxUint256), "OVERFLOW");
      result = JSBI.add(result, ONE);
    }
    return result;
  }

  
  static isEqualApproximately(a: JSBI, b: JSBI, errorInMinimumUnit: JSBI) {
    return (
      JSBI.greaterThanOrEqual(
        JSBI.subtract(a, b),
        JSBI.BigInt(
          JSBI.greaterThan(errorInMinimumUnit, ZERO)
            ? JSBI.unaryMinus(errorInMinimumUnit)
            : errorInMinimumUnit
        )
      ) &&
      JSBI.lessThanOrEqual(
        JSBI.subtract(a, b),
        JSBI.BigInt(
          JSBI.greaterThan(errorInMinimumUnit, ZERO)
            ? errorInMinimumUnit
            : JSBI.unaryMinus(errorInMinimumUnit)
        )
      )
    );
  }
}
