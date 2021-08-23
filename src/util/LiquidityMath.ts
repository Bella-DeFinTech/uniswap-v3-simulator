import JSBI from "jsbi";
import { NEGATIVE_ONE, ZERO } from "../enum/InternalConstants";

export abstract class LiquidityMath {
  static addDelta(x: JSBI, y: JSBI): JSBI {
    if (JSBI.lessThan(y, ZERO)) {
      return JSBI.subtract(x, JSBI.multiply(y, NEGATIVE_ONE));
    } else {
      return JSBI.add(x, y);
    }
  }
}
