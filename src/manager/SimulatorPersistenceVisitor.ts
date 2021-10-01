import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { PoolState } from "../model/PoolState";
import { Transition } from "../model/Transition";
import { DBManager } from "./DBManager";

export class SimulatorPersistenceVisitor implements SimulatorVisitor {
  visitOnTransition(transition: Transition): Promise<string> {
    return Promise.resolve("not implemented.");
  }

  visitOnPoolState(
    poolState: PoolState,
    callback?: (poolState: PoolState, returnValue: number) => void
  ): Promise<string> {
    poolState.recoverCorePool(true);
    return DBManager.instance.persistSnapshot(poolState).then((returnValue) => {
      if (callback) callback(poolState, returnValue);
      return Promise.resolve("ok");
    });
  }

  visitOnConfigurableCorePool(
    configurableCorePool: ConfigurableCorePool
  ): Promise<string> {
    return Promise.resolve("not implemented.");
  }
}