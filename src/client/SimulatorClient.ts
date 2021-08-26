import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { PoolState } from "../model/PoolState";
import { PoolConfig } from "../entity/PoolConfig";

export class SimulatorClient {
  static initCorePoolFromConfig(poolConfig: PoolConfig): ConfigurableCorePool {
    return new ConfigurableCorePool(new PoolState(poolConfig));
  }

  static async recoverCorePoolFromSnapshot(snapshotId: string): Promise<ConfigurableCorePool> {
    return new ConfigurableCorePool(await PoolState.from(snapshotId));
  }

  static staticizeCurrentSnapshotPersistence(poolStates: Array<PoolState>) {
    // TODO
  }

  static clearSnapshotPersistence(snapshotId: string) {
    // TODO
  }
}
