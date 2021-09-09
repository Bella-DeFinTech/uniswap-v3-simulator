import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { Roadmap } from "../model/Roadmap";
import { Snapshot } from "../entity/Snapshot";
import { PoolStateContainer } from "../interface/PoolStateContainer";
import { PoolState } from "../model/PoolState";
import { DBManager } from "./DBManager";
import { PoolStateHelper } from "../util/PoolStateHelper";

export class SimulatorRoadmapManager implements PoolStateContainer {
  private poolStates: Map<string, PoolState>;
  private static _instance: SimulatorRoadmapManager;
  private configurableCorePools: Map<string, ConfigurableCorePool> = new Map();

  constructor() {
    this.poolStates = new Map();
  }

  public static get instance(): SimulatorRoadmapManager {
    if (!SimulatorRoadmapManager._instance) {
      throw new Error("Please build an instance first!");
    }
    return SimulatorRoadmapManager._instance;
  }

  static buildInstance(): SimulatorRoadmapManager {
    return new SimulatorRoadmapManager();
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
        return DBManager.instance.persistRoadmap(roadmap);
      })
      .then(() => Promise.resolve(roadmapId));
  }

  loadAndPrintRoute(roadmapId: string): Promise<void> {
    return DBManager.instance
      .getRoadmap(roadmapId)
      .then((roadmap: Roadmap | undefined) => {
        if (!roadmap)
          return Promise.reject(
            new Error("Can't find Roadmap, id: " + roadmapId)
          );
        console.log(roadmap.toString());
        return DBManager.instance
          .getSnapshots(roadmap!.snapshots)
          .then((snapshots: Snapshot[]) => {
            if (snapshots.length == 0) return Promise.resolve();
            console.log(snapshots[0].poolConfig.toString());
            snapshots.forEach((snapshot: Snapshot) => {
              let recoveredCorePool =
                PoolStateHelper.buildCorePoolBySnapshot(snapshot);
              console.log(recoveredCorePool.toString());
            });
            return Promise.resolve();
          });
      });
  }
}
