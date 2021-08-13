import BN from "bn.js";
import { ConfigurableCorePool } from "../core/configurablePool";

export class PoolConfig {
    id: string;
    tickSpacing: number;
    token0: string;
    token1: string;
    fee: number;
}

export class Record {
    id: string;
    eventId: number;
    actionName: string;
    actionParams: object;
    timestamp: Date;
}

export class Snapshot {
    id: string;
    nonce: number;
    baseSnapshot: Snapshot;
    poolConfig: PoolConfig;
    records: Record[];
    baseRecordId: string;
    lastRecordId: string;
    used: boolean;
    timestamp: Date;
    snapshotStorage: SnapshotStorage;

    static from(id: string): Snapshot {
        // TODO
        return new Snapshot();
    }

    private persist(configurableCorePool: ConfigurableCorePool): string {
        // TODO
        return '0';
    }

}

export class SnapshotStorage {
    token0Balance: BN;
    token1Balance: BN;
    sqrtPriceX96: BN;
    tickCurrent: number
    feeGrowthGlobal0X128: BN;
    feeGrowthGlobal1X128: BN;
    ticks_json: object;
    positions_json: object;
}

