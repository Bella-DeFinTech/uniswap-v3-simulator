import JSBI from "jsbi";
import { ZERO, ONE, MaxUint256, TWO } from "../enum/InternalConstants";
import assert from "assert";

export abstract class FullMath {
  static mulDiv(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    return JSBI.divide(product, denominator);
  }

  static mulDivRoundingUp(a: JSBI, b: JSBI, denominator: JSBI): JSBI {
    const product = JSBI.multiply(a, b);
    let result = JSBI.divide(product, denominator);
    if (JSBI.greaterThan(JSBI.remainder(product, denominator), ZERO)) {
      assert(JSBI.lessThan(result, MaxUint256), "OVERFLOW");
      result = JSBI.add(result, ONE);
    }
    return result;
  }

  // simulates EVM uint256 "a - b" underflow behavior
  static mod256Sub(a: JSBI, b: JSBI): JSBI {
    assert(
      JSBI.greaterThanOrEqual(a, ZERO) &&
        JSBI.greaterThanOrEqual(b, ZERO) &&
        JSBI.lessThanOrEqual(a, MaxUint256) &&
        JSBI.lessThanOrEqual(b, MaxUint256)
    );
    return JSBI.remainder(
      JSBI.subtract(JSBI.add(a, JSBI.exponentiate(TWO, JSBI.BigInt(256))), b),
      JSBI.exponentiate(TWO, JSBI.BigInt(256))
    );
  }

  static equalsWithTolerance(
    a: JSBI,
    b: JSBI,
    toleranceInMinUnit: JSBI
  ): boolean {
    return (
      JSBI.greaterThanOrEqual(
        JSBI.subtract(a, b),
        JSBI.BigInt(
          JSBI.greaterThan(toleranceInMinUnit, ZERO)
            ? JSBI.unaryMinus(toleranceInMinUnit)
            : toleranceInMinUnit
        )
      ) &&
      JSBI.lessThanOrEqual(
        JSBI.subtract(a, b),
        JSBI.BigInt(
          JSBI.greaterThan(toleranceInMinUnit, ZERO)
            ? toleranceInMinUnit
            : JSBI.unaryMinus(toleranceInMinUnit)
        )
      )
    );
  }
}
