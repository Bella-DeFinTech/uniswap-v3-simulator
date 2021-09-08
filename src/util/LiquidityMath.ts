import JSBI from "jsbi";
import { NEGATIVE_ONE, ZERO, MaxUint128 } from "../enum/InternalConstants";
import assert from "assert";

export abstract class LiquidityMath {
  static addDelta(x: JSBI, y: JSBI): JSBI {
    assert(JSBI.lessThanOrEqual(x, MaxUint128), "OVERFLOW");
    assert(JSBI.lessThanOrEqual(y, MaxUint128), "OVERFLOW");
    if (JSBI.lessThan(y, ZERO)) {
      const negatedY = JSBI.multiply(y, NEGATIVE_ONE);
      assert(JSBI.greaterThanOrEqual(x, negatedY), "UNDERFLOW");
      return JSBI.subtract(x, negatedY);
    } else {
      assert(JSBI.lessThanOrEqual(JSBI.add(x, y), MaxUint128), "OVERFLOW");
      return JSBI.add(x, y);
    }
  }
}
