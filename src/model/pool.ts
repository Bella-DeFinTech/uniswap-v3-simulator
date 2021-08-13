import BN from 'bn.js';

export class Tick {
    liquidityGross: BN = new BN(0);
    liquidityNet: BN = new BN(0);
    feeGrowthOutside0X128: BN = new BN(0);
    feeGrowthOutside1X128: BN = new BN(0);
    initialized: boolean = false;

    update(liquidityDelta: BN, tickCurrent: number, feeGrowthGlobal0X128: BN, feeGrowthGlobal1X128: BN, leftToRight: boolean) {
        // TODO
    }

    cross(feeGrowthGlobal0X128: BN, feeGrowthGlobal1X128: BN): BN {
        // TODO
        let liquidityNet = new BN(0);
        return liquidityNet;
    }
}

export class Position {
    liquidity: BN = new BN(0);
    feeGrowthInside0LastX128: BN = new BN(0);
    feeGrowthInside1LastX128: BN = new BN(0);
    tokensOwed0: BN = new BN(0);
    tokensOwed1: BN = new BN(0);

    update(liquidityDelta: BN, feeGrowthInside0X128: BN, feeGrowthInside1X128: BN) {
        // TODO
    }

}