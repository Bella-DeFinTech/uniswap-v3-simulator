import JSBI from "jsbi";
import { jsonMember, jsonObject } from "typedjson";
import { Q128, ZERO } from "../enum/InternalConstants";
import { FullMath } from "../util/FullMath";
import { LiquidityMath } from "../util/LiquidityMath";
import { JSBIDeserializer, JSBISerializer } from "../util/Serializer";
import assert from "assert";

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
    let liquidityNext: JSBI;
    if (JSBI.equal(liquidityDelta, ZERO)) {
      assert(JSBI.greaterThan(this.liquidity, ZERO), "NP");
      liquidityNext = this.liquidity;
    } else {
      liquidityNext = LiquidityMath.addDelta(this.liquidity, liquidityDelta);
    }

    const tokensOwed0 = FullMath.mulDiv(
      JSBI.subtract(feeGrowthInside0X128, this.feeGrowthInside0LastX128),
      this.liquidity,
      Q128
    );
    const tokensOwed1 = FullMath.mulDiv(
      JSBI.subtract(feeGrowthInside1X128, this.feeGrowthInside1LastX128),
      this.liquidity,
      Q128
    );

    if (JSBI.notEqual(liquidityDelta, ZERO)) this._liquidity = liquidityNext;
    this._feeGrowthInside0LastX128 = feeGrowthInside0X128;
    this._feeGrowthInside1LastX128 = feeGrowthInside1X128;
    if (
      JSBI.greaterThan(tokensOwed0, ZERO) ||
      JSBI.greaterThan(tokensOwed1, ZERO)
    ) {
      this._tokensOwed0 = JSBI.add(this.tokensOwed0, tokensOwed0);
      this._tokensOwed1 = JSBI.add(this.tokensOwed1, tokensOwed1);
    }
  }

  updateBurn(newTokensOwed0: JSBI, newTokensOwed1: JSBI) {
    this._tokensOwed0 = newTokensOwed0;
    this._tokensOwed1 = newTokensOwed1;
  }

  isEmpty(): boolean {
    return (
      JSBI.equal(this._liquidity, ZERO) &&
      JSBI.equal(this._tokensOwed0, ZERO) &&
      JSBI.equal(this._tokensOwed1, ZERO)
    );
  }
}
