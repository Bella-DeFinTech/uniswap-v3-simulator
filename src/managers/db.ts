import BN from "bn.js";
import { Snapshot } from "../model/config";
import { PositionManager, TickManager } from "./pool";

export class DBManager {

    static persistSnapshot(snapshot: Snapshot, token0Balance: BN, token1Balance: BN, sqrtPriceX96: BN, tickCurrent: number,
        feeGrowthGlobal0X128: BN, feeGrowthGlobal1X128: BN, tickManager: TickManager, positionManager: PositionManager) {
        // TODO
    }

    static readSnapshot(snapshotId: string): Snapshot {
        // TODO
        return new Snapshot();
    }

}