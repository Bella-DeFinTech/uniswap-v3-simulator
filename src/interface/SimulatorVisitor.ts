import { PoolState } from "../model/PoolState";
import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { Transition } from "../model/Transition";

export interface SimulatorVisitor {
  visitTransition(
    transition: Transition,
    callback?: (transition: Transition, returnValue: any) => void
  ): Promise<string>;
  visitPoolState(
    poolState: PoolState,
    callback?: (poolState: PoolState, returnValue: any) => void
  ): Promise<string>;
  visitConfigurableCorePool(
    configurableCorePool: ConfigurableCorePool,
    callback?: (
      configurableCorePool: ConfigurableCorePool,
      returnValue: any
    ) => void
  ): Promise<string>;
}
