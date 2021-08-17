import BN from "bn.js";

export class Position {
  liquidity: BN = new BN(0);
  feeGrowthInside0LastX128: BN = new BN(0);
  feeGrowthInside1LastX128: BN = new BN(0);
  tokensOwed0: BN = new BN(0);
  tokensOwed1: BN = new BN(0);

  update(
    liquidityDelta: BN,
    feeGrowthInside0X128: BN,
    feeGrowthInside1X128: BN
  ) {
    // TODO
  }
}
