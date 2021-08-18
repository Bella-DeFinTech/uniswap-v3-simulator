import BN from "bn.js";

export class Position {
  private _liquidity: BN = new BN(0);
  private _feeGrowthInside0LastX128: BN = new BN(0);
  private _feeGrowthInside1LastX128: BN = new BN(0);
  private _tokensOwed0: BN = new BN(0);
  private _tokensOwed1: BN = new BN(0);

  public get liquidity(): BN {
    return this._liquidity;
  }

  public get feeGrowthInside0LastX128(): BN {
    return this._feeGrowthInside0LastX128;
  }

  public get feeGrowthInside1LastX128(): BN {
    return this._feeGrowthInside1LastX128;
  }

  public get tokensOwed0(): BN {
    return this._tokensOwed0;
  }

  public get tokensOwed1(): BN {
    return this._tokensOwed1;
  }

  update(
    liquidityDelta: BN,
    feeGrowthInside0X128: BN,
    feeGrowthInside1X128: BN
  ) {
    // TODO
  }
}
