import BN from "bn.js";

export class Tick {
  private _liquidityGross: BN = new BN(0);
  private _liquidityNet: BN = new BN(0);
  private _feeGrowthOutside0X128: BN = new BN(0);
  private _feeGrowthOutside1X128: BN = new BN(0);
  private _initialized: boolean = false;

  public get liquidityGross(): BN {
    return this._liquidityGross;
  }

  public get liquidityNet(): BN {
    return this._liquidityNet;
  }

  public get feeGrowthOutside0X128(): BN {
    return this._feeGrowthOutside0X128;
  }

  public get feeGrowthOutside1X128(): BN {
    return this._feeGrowthOutside1X128;
  }

  public get initialized(): boolean {
    return this._initialized;
  }

  update(
    liquidityDelta: BN,
    tickCurrent: number,
    feeGrowthGlobal0X128: BN,
    feeGrowthGlobal1X128: BN,
    leftToRight: boolean
  ) {
    // TODO
  }

  cross(feeGrowthGlobal0X128: BN, feeGrowthGlobal1X128: BN): BN {
    // TODO
    let liquidityNet = new BN(0);
    return liquidityNet;
  }
}
