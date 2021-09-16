import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { PoolState } from "../model/PoolState";
import { Transition } from "../model/Transition";
import { DBManager } from "./DBManager";
import { ActionType } from "../enum/ActionType";

export class SimulatorPersistenceVisitor implements SimulatorVisitor {
  visitOnTransition(transition: Transition): Promise<string> {
    return Promise.resolve("not implemented.");
  }

  visitOnPoolState(
    poolState: PoolState,
    callback?: (poolState: PoolState, returnValue: number) => void
  ): Promise<string> {
    // avoid saving duplicate snapshot as well as not neglecting anyone
    let persistencePromise: Promise<number>;
    if (
      poolState.fromTransition &&
      poolState.fromTransition.record.actionType == ActionType.SNAPSHOT
    ) {
      persistencePromise = Promise.resolve(0);
    } else {
      poolState.recoverCorePool(true);
      persistencePromise = DBManager.instance.persistSnapshot(poolState);
    }
    return persistencePromise.then((returnValue) => {
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
