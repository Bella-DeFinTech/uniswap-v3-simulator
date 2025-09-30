import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { PoolState } from "../model/PoolState";
import { Transition } from "../model/Transition";
import { toString as printPoolConfig } from "../model/PoolConfig";

import * as log4js from "log4js";

const logger = log4js.getLogger("SimulatorConsoleVisitor");

export class SimulatorConsoleVisitor implements SimulatorVisitor {
  visitTransition(
    transition: Transition,
    callback?: (transition: Transition, returnValue: string) => void
  ): Promise<string> {
    logger.debug(transition.toString());
    if (callback) callback(transition, transition.toString());
    return Promise.resolve("ok");
  }

  visitPoolState(
    poolState: PoolState,
    callback?: (poolState: PoolState, returnValue: string) => void
  ): Promise<string> {
    let corePool = poolState.recoverCorePool(true);
    logger.debug(corePool.toString());
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
    logger.debug(printPoolConfig(poolConfig));
    if (callback) callback(configurableCorePool, printPoolConfig(poolConfig));
    return Promise.resolve("ok");
  }
}
