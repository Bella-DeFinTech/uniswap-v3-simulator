import JSBI from "jsbi";
import { Tick } from "../../src/model/Tick";

export class MockableTick extends Tick {
  // [CAUTION] this is for testing only
  // specifically for easily setting up test cases
  // DO NOT use this function since it will break the data integrity of the tick
  updateProperties(
    liquidityGross: JSBI,
    liquidityNet: JSBI,
    feeGrowthOutside0X128: JSBI,
    feeGrowthOutside1X128: JSBI
  ): Tick {
    this._liquidityGross = liquidityGross;
    this._liquidityNet = liquidityNet;
    this._feeGrowthOutside0X128 = feeGrowthOutside0X128;
    this._feeGrowthOutside1X128 = feeGrowthOutside1X128;
    return this;
  }
}
