import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { Roadmap, toString as printRoadmap } from "../model/Roadmap";
import { toString as printPoolConfig } from "../model/PoolConfig";
import { Snapshot } from "../entity/Snapshot";
import { PoolStateContainer } from "../interface/PoolStateContainer";
import { SimulatorRoadmapManager as ISimulatorRoadmapManager } from "../interface/SimulatorRoadmapManager";
import { PoolState } from "../model/PoolState";
import { PoolStateHelper } from "../util/PoolStateHelper";
import { SimulationDataManager } from "../interface/SimulationDataManager";

export class SimulatorRoadmapManager
  implements ISimulatorRoadmapManager, PoolStateContainer
{
  private simulationDataManager: SimulationDataManager;
  private poolStates: Map<string, PoolState>;
  private configurableCorePools: Map<string, ConfigurableCorePool> = new Map();

  constructor(dbManager: SimulationDataManager) {
    this.poolStates = new Map();
    this.simulationDataManager = dbManager;
  }

  addPoolState(poolState: PoolState): string {
    this.poolStates.set(poolState.id, poolState);
    return poolState.id;
  }

  getPoolState(poolStateId: string): PoolState | undefined {
    return this.poolStates.get(poolStateId);
  }

  hasPoolState(poolStateId: string): boolean {
    return this.poolStates.has(poolStateId);
  }

  addRoute(configurableCorePool: ConfigurableCorePool) {
    this.configurableCorePools.set(
      configurableCorePool.id,
      configurableCorePool
    );
  }

  printRoute(configurableCorePoolId: string): Promise<void> {
    if (!this.configurableCorePools.has(configurableCorePoolId)) {
      throw new Error("Can't find CorePool, id: " + configurableCorePoolId);
    }
    let pool = this.configurableCorePools.get(configurableCorePoolId)!;
    return pool.showStateTransitionRoute(pool.poolState.id);
  }

  listRoutes(): Array<ConfigurableCorePool> {
    return [...this.configurableCorePools.values()];
  }

  persistRoute(
    configurableCorePoolId: string,
    description: string
  ): Promise<string> {
    if (!this.configurableCorePools.has(configurableCorePoolId)) {
      throw new Error("Can't find CorePool, id: " + configurableCorePoolId);
    }
    let pool = this.configurableCorePools.get(configurableCorePoolId)!;
    let roadmapId: string;
    return pool
      .persistSnapshots(pool.poolState.id)
      .then((snapshotIds) => {
        let roadmap = new Roadmap(description, snapshotIds);
        roadmapId = roadmap.id;
        return this.simulationDataManager.persistRoadmap(roadmap);
      })
      .then(() => Promise.resolve(roadmapId));
  }

  loadAndPrintRoute(roadmapId: string): Promise<void> {
    return this.simulationDataManager
      .getRoadmap(roadmapId)
      .then((roadmap: Roadmap | undefined) => {
        if (!roadmap)
          return Promise.reject(
            new Error("Can't find Roadmap, id: " + roadmapId)
          );
        console.log(printRoadmap(roadmap));
        return this.simulationDataManager.getSnapshots(roadmap.snapshots);
      })
      .then((snapshots: Snapshot[]) => {
        if (snapshots.length == 0) return Promise.resolve();
        console.log(printPoolConfig(snapshots[0].poolConfig));
        snapshots.forEach((snapshot: Snapshot) => {
          let recoveredCorePool =
            PoolStateHelper.buildCorePoolBySnapshot(snapshot);
          console.log(recoveredCorePool.toString());
        });
        return Promise.resolve();
      });
  }
}
