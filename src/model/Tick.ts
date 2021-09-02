import JSBI from "jsbi";
import assert from "assert";
import { TickMath } from "../util/TickMath";
import { jsonMember, jsonObject } from "typedjson";
import { JSBIDeserializer, JSBISerializer } from "../util/Serializer";
import { LiquidityMath } from "../util/LiquidityMath";
import { ZERO } from "../enum/InternalConstants";

@jsonObject
export class Tick {
  @jsonMember(Number)
  private _tickIndex: number = 0;
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _liquidityGross: JSBI = ZERO;
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _liquidityNet: JSBI = ZERO;
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _feeGrowthOutside0X128: JSBI = ZERO;
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _feeGrowthOutside1X128: JSBI = ZERO;

  constructor(tickIndex: number) {
    assert(
      tickIndex >= TickMath.MIN_TICK && tickIndex <= TickMath.MAX_TICK,
      "TICK"
    );
    this._tickIndex = tickIndex;
  }

  public get tickIndex(): number {
    return this._tickIndex;
  }

  public get liquidityGross(): JSBI {
    return this._liquidityGross;
  }

  public get liquidityNet(): JSBI {
    return this._liquidityNet;
  }

  public get feeGrowthOutside0X128(): JSBI {
    return this._feeGrowthOutside0X128;
  }

  public get feeGrowthOutside1X128(): JSBI {
    return this._feeGrowthOutside1X128;
  }

  public get initialized(): boolean {
    return JSBI.notEqual(this.liquidityGross, ZERO);
  }

  update(
    liquidityDelta: JSBI,
    tickCurrent: number,
    feeGrowthGlobal0X128: JSBI,
    feeGrowthGlobal1X128: JSBI,
    leftToRight: boolean
  ): boolean {
    const liquidityGrossBefore = this.liquidityGross;
    const liquidityGrossAfter = LiquidityMath.addDelta(
      liquidityGrossBefore,
      liquidityDelta
    );
    //assert(liquidityGrossAfter <= maxLiquidity)
    const flipped =
      JSBI.equal(liquidityGrossAfter, ZERO) !=
      JSBI.equal(liquidityGrossBefore, ZERO);
    if (JSBI.equal(liquidityGrossBefore, ZERO)) {
      if (this.tickIndex <= tickCurrent) {
        this._feeGrowthOutside0X128 = feeGrowthGlobal0X128;
        this._feeGrowthOutside1X128 = feeGrowthGlobal1X128;
      }
    }
    this._liquidityGross = liquidityGrossAfter;
    this._liquidityNet = leftToRight
      ? JSBI.subtract(this._liquidityNet, liquidityDelta)
      : JSBI.add(this._liquidityNet, liquidityDelta);
    return flipped;
  }

  cross(feeGrowthGlobal0X128: JSBI, feeGrowthGlobal1X128: JSBI): JSBI {
    this._feeGrowthOutside0X128 = JSBI.subtract(
      feeGrowthGlobal0X128,
      this._feeGrowthOutside0X128
    );
    this._feeGrowthOutside1X128 = JSBI.subtract(
      feeGrowthGlobal1X128,
      this._feeGrowthOutside1X128
    );
    return this._liquidityNet;
  }
}
