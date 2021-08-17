import BN from "bn.js";

export class Tick {
  liquidityGross: BN = new BN(0);
  liquidityNet: BN = new BN(0);
  feeGrowthOutside0X128: BN = new BN(0);
  feeGrowthOutside1X128: BN = new BN(0);
  initialized: boolean = false;

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
