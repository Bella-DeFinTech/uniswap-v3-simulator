import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { PoolState } from "../model/PoolState";
import { PoolConfig } from "../model/PoolConfig";
import { DBManager } from "../manager/DBManager";
import { Snapshot } from "../entity/Snapshot";
import { FeeAmount } from "../enum/FeeAmount";
import { SimulatorRoadmapManager } from "../manager/SimulatorRoadmapManager";
import { SnapshotProfile } from "../entity/SnapshotProfile";
import { SimulatorRoadmapManager as ISimulatorRoadmapManager } from "../interface/SimulatorRoadmapManager";
import { ConfigurableCorePool as IConfigurableCorePool } from "../interface/ConfigurableCorePool";

export class SimulatorClient {
  private dbManager: DBManager;
  readonly simulatorRoadmapManager: ISimulatorRoadmapManager;

  constructor(dbManager: DBManager) {
    this.dbManager = dbManager;
    this.simulatorRoadmapManager = SimulatorRoadmapManager.buildInstance();
  }

  static buildInstance(dbPath?: string): Promise<SimulatorClient> {
    const actualDBPath = dbPath ? dbPath : ":memory:";
    return DBManager.buildInstance(actualDBPath).then(
      (dbManager: DBManager) => new SimulatorClient(dbManager)
    );
  }

  static buildPoolConfig(
    tickSpacing: number,
    token0: string,
    token1: string,
    fee: FeeAmount
  ) {
    return new PoolConfig(tickSpacing, token0, token1, fee);
  }

  initCorePoolFromConfig(poolConfig: PoolConfig): IConfigurableCorePool {
    return new ConfigurableCorePool(new PoolState(poolConfig));
  }

  recoverCorePoolFromSnapshot(
    snapshotId: string
  ): Promise<IConfigurableCorePool> {
    return this.getSnapshot(snapshotId).then((snapshot: Snapshot | undefined) =>
      !snapshot
        ? Promise.reject("This snapshot doesn't exist!")
        : Promise.resolve(new ConfigurableCorePool(PoolState.from(snapshot)))
    );
  }

  listSnapshotProfiles(): Promise<SnapshotProfile[]> {
    return this.dbManager.getSnapshotProfiles();
  }

  shutdown() : Promise<void>{
    return this.dbManager.close();
  }

  private getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    return this.dbManager.getSnapshot(snapshotId);
  }
}
