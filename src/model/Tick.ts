import JSBI from "jsbi";
import { jsonMember, jsonObject } from "typedjson";

@jsonObject
export class Tick {
  @jsonMember
  private _liquidityGross: JSBI = JSBI.BigInt(0);
  @jsonMember
  private _liquidityNet: JSBI = JSBI.BigInt(0);
  @jsonMember
  private _feeGrowthOutside0X128: JSBI = JSBI.BigInt(0);
  @jsonMember
  private _feeGrowthOutside1X128: JSBI = JSBI.BigInt(0);
  @jsonMember
  private _initialized: boolean = false;

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
    return this._initialized;
  }

  update(
    liquidityDelta: JSBI,
    tickCurrent: number,
    feeGrowthGlobal0X128: JSBI,
    feeGrowthGlobal1X128: JSBI,
    leftToRight: boolean
  ): boolean {
    // TODO
    return false;
  }

  cross(feeGrowthGlobal0X128: JSBI, feeGrowthGlobal1X128: JSBI): JSBI {
    // TODO
    let liquidityNet = JSBI.BigInt(0);
    return liquidityNet;
  }
}
