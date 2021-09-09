import { PoolState } from "../model/PoolState";
import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { Transition } from "../model/Transition";

export interface SimulatorVisitor {
  visitOnTransition(
    transition: Transition,
    callback?: (transition: Transition, returnValue: any) => void
  ): Promise<string>;
  visitOnPoolState(
    poolState: PoolState,
    callback?: (poolState: PoolState, returnValue: any) => void
  ): Promise<string>;
  visitOnConfigurableCorePool(
    configurableCorePool: ConfigurableCorePool,
    callback?: (
      configurableCorePool: ConfigurableCorePool,
      returnValue: any
    ) => void
  ): Promise<string>;
}
