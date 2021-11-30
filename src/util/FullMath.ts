import JSBI from "jsbi";
import { ZERO, ONE, MaxUint256, TWO } from "../enum/InternalConstants";
import assert from "assert";

export abstract class FullMath {
  static MAX_SAFE_INTEGER: JSBI = JSBI.BigInt(Number.MAX_SAFE_INTEGER);

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
  /**
   * Computes floor(sqrt(value))
   * @param value the value for which to compute the square root, rounded down
   */
  static sqrt(value: JSBI): JSBI {
    assert(JSBI.greaterThanOrEqual(value, ZERO), "NEGATIVE");

    // rely on built in sqrt if possible
    if (JSBI.lessThan(value, FullMath.MAX_SAFE_INTEGER)) {
      return JSBI.BigInt(Math.floor(Math.sqrt(JSBI.toNumber(value))));
    }

    let z: JSBI;
    let x: JSBI;
    z = value;
    x = JSBI.add(JSBI.divide(value, TWO), ONE);
    while (JSBI.lessThan(x, z)) {
      z = x;
      x = JSBI.divide(JSBI.add(JSBI.divide(value, x), x), TWO);
    }
    return z;
  }

  static incrTowardInfinity(value: JSBI): JSBI {
    assert(JSBI.notEqual(value, ZERO), "ZERO");
    return JSBI.greaterThan(value, ZERO)
      ? JSBI.add(value, ONE)
      : JSBI.subtract(value, ONE);
  }
}
