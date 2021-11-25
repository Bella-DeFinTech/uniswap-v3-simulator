import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { PoolState } from "../model/PoolState";
import { Transition } from "../model/Transition";
import { SimulationDataManager } from "../interface/SimulationDataManager";

export class SimulatorPersistenceVisitor implements SimulatorVisitor {
  private simulationDataManager: SimulationDataManager;

  constructor(dbManager: SimulationDataManager) {
    this.simulationDataManager = dbManager;
  }

  visitTransition(transition: Transition): Promise<string> {
    return Promise.resolve("not implemented.");
  }

  visitPoolState(
    poolState: PoolState,
    callback?: (poolState: PoolState, returnValue: number) => void
  ): Promise<string> {
    poolState.recoverCorePool(true);
    return this.simulationDataManager
      .persistSnapshot(poolState)
      .then((returnValue) => {
        if (callback) callback(poolState, returnValue);
        return Promise.resolve("ok");
      });
  }

  visitConfigurableCorePool(
    configurableCorePool: ConfigurableCorePool
  ): Promise<string> {
    return Promise.resolve("not implemented.");
  }
}
