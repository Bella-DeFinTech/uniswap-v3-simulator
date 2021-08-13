import { ConfigurableCorePool } from "../core/configurablePool";
import { PoolConfig, Snapshot } from "../model/config";

export class SimulatorClient {
    static initCorePoolFromConfig(poolConfig: PoolConfig): ConfigurableCorePool {
        return new ConfigurableCorePool(poolConfig, undefined);
    }

    static recoverCorePoolFromSnapshot(snapshotId: string): ConfigurableCorePool {
        return new ConfigurableCorePool(undefined, Snapshot.from(snapshotId));
    }

    static staticizeCurrentSnapshotPersistence(nonceStart: number, nonceEnd: number) {
        // TODO
    }

    static clearSnapshotPersistence(snapshotId: string) {
        // TODO
    }

    static clearRedundantRecords() {
        // TODO
    }
}