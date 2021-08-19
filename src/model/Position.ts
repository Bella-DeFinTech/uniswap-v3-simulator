import JSBI from 'jsbi';

export class Position {
  private _liquidity: JSBI = JSBI.BigInt(0);
  private _feeGrowthInside0LastX128: JSBI = JSBI.BigInt(0);
  private _feeGrowthInside1LastX128: JSBI = JSBI.BigInt(0);
  private _tokensOwed0: JSBI = JSBI.BigInt(0);
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
