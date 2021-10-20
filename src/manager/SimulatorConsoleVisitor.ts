import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { PoolState } from "../model/PoolState";
import { Transition } from "../model/Transition";
import { toString as printPoolConfig } from "../model/PoolConfig";

export class SimulatorConsoleVisitor implements SimulatorVisitor {
  visitTransition(
    transition: Transition,
    callback?: (transition: Transition, returnValue: string) => void
  ): Promise<string> {
    console.log(transition.toString());
    if (callback) callback(transition, transition.toString());
    return Promise.resolve("ok");
  }

  visitPoolState(
    poolState: PoolState,
    callback?: (poolState: PoolState, returnValue: string) => void
  ): Promise<string> {
    let corePool = poolState.recoverCorePool(true);
    console.log(corePool.toString());
    if (callback) callback(poolState, corePool.toString());
    return Promise.resolve("ok");
  }

  visitConfigurableCorePool(
    configurableCorePool: ConfigurableCorePool,
    callback?: (
      configurableCorePool: ConfigurableCorePool,
      returnValue: string
    ) => void
  ): Promise<string> {
    let poolConfig = configurableCorePool.poolState.poolConfig;
    console.log(printPoolConfig(poolConfig));
    if (callback) callback(configurableCorePool, printPoolConfig(poolConfig));
    return Promise.resolve("ok");
  }
}
