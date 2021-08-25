import JSBI from "jsbi";
import { jsonMember, jsonObject } from "typedjson";
import { JSBIDeserializer, JSBISerializer } from "../util/Serializer";

@jsonObject
export class Position {
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _liquidity: JSBI = JSBI.BigInt(0);
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _feeGrowthInside0LastX128: JSBI = JSBI.BigInt(0);
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _feeGrowthInside1LastX128: JSBI = JSBI.BigInt(0);
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _tokensOwed0: JSBI = JSBI.BigInt(0);
  @jsonMember({ deserializer: JSBIDeserializer, serializer: JSBISerializer })
  private _tokensOwed1: JSBI = JSBI.BigInt(0);

  public get liquidity(): JSBI {
    return this._liquidity;
  }

  public get feeGrowthInside0LastX128(): JSBI {
    return this._feeGrowthInside0LastX128;
  }

  public get feeGrowthInside1LastX128(): JSBI {
    return this._feeGrowthInside1LastX128;
  }

  public get tokensOwed0(): JSBI {
    return this._tokensOwed0;
  }

  public get tokensOwed1(): JSBI {
    return this._tokensOwed1;
  }

  update(
    liquidityDelta: JSBI,
    feeGrowthInside0X128: JSBI,
    feeGrowthInside1X128: JSBI
  ) {
    // TODO
  }
}
