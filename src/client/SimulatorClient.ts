import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { PoolState } from "../model/PoolState";
import { PoolConfig } from "../entity/PoolConfig";

export class SimulatorClient {
  static initCorePoolFromConfig(poolConfig: PoolConfig): ConfigurableCorePool {
    return new ConfigurableCorePool(poolConfig);
  }

  static recoverCorePoolFromSnapshot(snapshotId: string): ConfigurableCorePool {
    let poolState = PoolState.from(snapshotId);
    return new ConfigurableCorePool(poolState.poolConfig, poolState);
  }

  static staticizeCurrentSnapshotPersistence(poolStates: Array<PoolState>) {
    // TODO
  }

  static clearSnapshotPersistence(snapshotId: string) {
    // TODO
  }
}
