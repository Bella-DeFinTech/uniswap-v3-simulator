import JSBI from "jsbi";
import { NEGATIVE_ONE, ZERO } from "../enum/InternalConstants";
import assert from "assert";

export abstract class LiquidityMath {
  static addDelta(x: JSBI, y: JSBI): JSBI {
    if (JSBI.lessThan(y, ZERO)) {
      const negatedY = JSBI.multiply(y, NEGATIVE_ONE);
      assert(JSBI.greaterThanOrEqual(x, negatedY), "UNDERFLOW");
      return JSBI.subtract(x, negatedY);
    } else {
      return JSBI.add(x, y);
    }
  }
}
