import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { PoolState } from "../model/PoolState";
import { Transition } from "../model/Transition";

export class SimulatorConsoleVisitor implements SimulatorVisitor {
  visitOnTransition(
    transition: Transition,
    callback?: (transition: Transition, returnValue: string) => void
  ): Promise<string> {
    console.log(transition.toString());
    if (callback) callback(transition, transition.toString());
    return Promise.resolve("ok");
  }

  visitOnPoolState(
    poolState: PoolState,
    callback?: (poolState: PoolState, returnValue: string) => void
  ): Promise<string> {
    // take snapshot during PoolStates to speed up
    let corePool = poolState.recoverCorePool(true);
    console.log(corePool.toString());
    if (callback) callback(poolState, corePool.toString());
    return Promise.resolve("ok");
  }

  visitOnConfigurableCorePool(
    configurableCorePool: ConfigurableCorePool,
    callback?: (
      configurableCorePool: ConfigurableCorePool,
      returnValue: string
    ) => void
  ): Promise<string> {
    let poolConfig = configurableCorePool.poolState.poolConfig;
    console.log(poolConfig.toString());
    if (callback) callback(configurableCorePool, poolConfig.toString());
    return Promise.resolve("ok");
  }
}
