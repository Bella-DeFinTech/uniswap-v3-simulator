import JSBI from "jsbi";
import { PoolState } from "../model/PoolState";
import { Record } from "../entity/Record";
import { CorePool } from "./CorePool";
import { Visitable } from "../interface/Visitable";
import { ActionType } from "../enum/ActionType";
import { PoolStateHelper } from "../util/PoolStateHelper";
import { IDGenerator } from "../util/IDGenerator";
import { Transition } from "../model/Transition";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { SimulatorConsoleVisitor } from "../manager/SimulatorConsoleVisitor";
import { SimulatorPersistenceVisitor } from "../manager/SimulatorPersistenceVisitor";
import {
  MethodParams,
  ReturnParams,
  MintParams,
  BurnParams,
  SwapParams,
  CollectParams,
  GeneralReturnParams,
} from "../interface/ActionParams";
import { SimulatorRoadmapManager } from "../manager/SimulatorRoadmapManager";

export class ConfigurableCorePool implements Visitable {
  readonly id: string;
  private _poolState: PoolState;
  private simulatorRoadmapManager: SimulatorRoadmapManager;
  private corePool: CorePool;
  private postProcessorCallback: (
    configurableCorePool: ConfigurableCorePool,
    transition: Transition
  ) => Promise<void> = async function () {};

  constructor(poolState: PoolState) {
    this.id = IDGenerator.guid();
    if (poolState.hasSnapshot()) {
      this.corePool = PoolStateHelper.buildCorePoolBySnapshot(
        poolState.snapshot!
      );
    } else if (poolState.hasBaseSnapshot()) {
      this.corePool = PoolStateHelper.buildCorePoolBySnapshot(
        poolState.baseSnapshot!
      );
    } else {
      this.corePool = PoolStateHelper.buildCorePoolByPoolConfig(
        poolState.poolConfig
      );
    }
    this._poolState = poolState;
    this.simulatorRoadmapManager = SimulatorRoadmapManager.instance;
    this.simulatorRoadmapManager.addPoolState(this.poolState);
    this.simulatorRoadmapManager.addRoute(this);
  }

  initialize(sqrtPriceX96: JSBI) {
    this.corePool.initialize(sqrtPriceX96);
  }

  mint(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }> {
    let currentPoolStateId = this.poolState.id;
    try {
      let res = this.corePool.mint(recipient, tickLower, tickUpper, amount);
      return this.postProcess(
        ActionType.MINT,
        { recipient, tickLower, tickUpper, amount } as MintParams,
        res as GeneralReturnParams,
        postProcessorCallback
      ).then(() => Promise.resolve(res));
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
  }

  burn(
    owner: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }> {
    let currentPoolStateId = this.poolState.id;
    try {
      let res = this.corePool.burn(owner, tickLower, tickUpper, amount);
      return this.postProcess(
        ActionType.BURN,
        { owner, tickLower, tickUpper, amount } as BurnParams,
        res as GeneralReturnParams,
        postProcessorCallback
      ).then(() => Promise.resolve(res));
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
  }

  collect(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount0Requested: JSBI,
    amount1Requested: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }> {
    let currentPoolStateId = this.poolState.id;
    try {
      let res = this.corePool.collect(
        recipient,
        tickLower,
        tickUpper,
        amount0Requested,
        amount1Requested
      );
      return this.postProcess(
        ActionType.COLLECT,
        {
          recipient,
          tickLower,
          tickUpper,
          amount0Requested,
          amount1Requested,
        } as CollectParams,
        res as GeneralReturnParams,
        postProcessorCallback
      ).then(() => Promise.resolve(res));
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
  }

  swap(
    zeroForOne: boolean,
    amountSpecified: JSBI,
    sqrtPriceLimitX96: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }> {
    let currentPoolStateId = this.poolState.id;
    try {
      let res = this.corePool.swap(
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96
      );
      return this.postProcess(
        ActionType.SWAP,
        { zeroForOne, amountSpecified, sqrtPriceLimitX96 } as SwapParams,
        res as GeneralReturnParams,
        postProcessorCallback
      ).then(() => Promise.resolve(res));
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
  }

  // user custom PostProcessor will be called after pool state transition finishes
  updatePostProcessor(
    callback: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ) {
    this.postProcessorCallback = callback;
  }

  takeSnapshot(description: string): boolean {
    if (this.poolState.hasSnapshot()) return false;
    this.poolState.takeSnapshot(
      description,
      this.corePool.token0Balance,
      this.corePool.token1Balance,
      this.corePool.sqrtPriceX96,
      this.corePool.liquidity,
      this.corePool.tickCurrent,
      this.corePool.feeGrowthGlobal0X128,
      this.corePool.feeGrowthGlobal1X128,
      this.corePool.tickManager,
      this.corePool.positionManager
    );
    return true;
  }

  fork(): ConfigurableCorePool {
    this.takeSnapshot("Automated for forking");
    return new ConfigurableCorePool(this.poolState.fork());
  }

  persistSnapshot(): Promise<string> {
    let simulatorPersistenceVisitor: SimulatorVisitor =
      new SimulatorPersistenceVisitor();
    return this.traverseOnPoolStateChain(
      simulatorPersistenceVisitor,
      this.poolState.id,
      this.poolState.id
    ).then(() => Promise.resolve(this.poolState.id));
  }

  stepBack() {
    let fromTransition = this.poolState.fromTransition;
    if (!fromTransition) {
      throw new Error("This is already initial poolState.");
    }
    this.recover(fromTransition.source.id);
  }

  recover(poolStateId: string) {
    if (!this.simulatorRoadmapManager.hasPoolState(poolStateId)) {
      throw new Error("Can't find poolState, id: " + poolStateId);
    }
    let poolState: PoolState =
      this.simulatorRoadmapManager.getPoolState(poolStateId)!;
    this._poolState = poolState;
    this.corePool = poolState.recoverCorePool();
  }

  get poolState(): PoolState {
    return this._poolState;
  }

  accept(visitor: SimulatorVisitor): Promise<string> {
    return visitor.visitOnConfigurableCorePool(this);
  }

  // this will take snapshot during PoolStates to speed up
  showStateTransitionRoute(
    toPoolStateId?: string,
    fromPoolStateId?: string
  ): Promise<void> {
    let simulatorConsoleVisitor: SimulatorVisitor =
      new SimulatorConsoleVisitor();
    return this.traverseOnPoolStateChain(
      simulatorConsoleVisitor,
      toPoolStateId ? toPoolStateId : this.poolState.id,
      fromPoolStateId
    );
  }

  persistSnapshots(
    toPoolStateId: string,
    fromPoolStateId?: string
  ): Promise<Array<number>> {
    let simulatorPersistenceVisitor: SimulatorVisitor =
      new SimulatorPersistenceVisitor();
    let snapshotIds: Array<number> = [];
    let poolStateVisitCallback = ({}, returnValue: number) => {
      if (returnValue > 0) snapshotIds.push(returnValue);
    };
    return this.traverseOnPoolStateChain(
      simulatorPersistenceVisitor,
      toPoolStateId,
      fromPoolStateId,
      poolStateVisitCallback
    ).then(() => Promise.resolve(snapshotIds));
  }

  private traverseOnPoolStateChain(
    visitor: SimulatorVisitor,
    toPoolStateId: string,
    fromPoolStateId?: string,
    poolStateVisitCallback?: (poolState: PoolState, returnValue: any) => void
  ): Promise<void> {
    if (
      fromPoolStateId &&
      !this.simulatorRoadmapManager.hasPoolState(fromPoolStateId)
    ) {
      throw new Error("Can't find poolState, id: " + fromPoolStateId);
    }
    if (!this.simulatorRoadmapManager.hasPoolState(toPoolStateId)) {
      throw new Error("Can't find poolState, id: " + toPoolStateId);
    }
    let toPoolState: PoolState =
      this.simulatorRoadmapManager.getPoolState(toPoolStateId)!;
    return this.accept(visitor).then(() =>
      this.handleSingleStepOnChain(
        toPoolState,
        visitor,
        fromPoolStateId,
        poolStateVisitCallback
      )
    );
  }

  private handleSingleStepOnChain(
    poolState: PoolState,
    simulatorVisitor: SimulatorVisitor,
    fromPoolStateId?: string,
    poolStateVisitCallback?: (poolState: PoolState, returnValue: any) => void
  ): Promise<void> {
    if (
      !poolState.fromTransition ||
      poolState.fromTransition.record.actionType == ActionType.FORK ||
      poolState.id == fromPoolStateId
    ) {
      return poolState.accept(simulatorVisitor).then(() => Promise.resolve());
    } else {
      let fromTransition = poolState.fromTransition!;
      return this.handleSingleStepOnChain(
        fromTransition.source,
        simulatorVisitor,
        fromPoolStateId,
        poolStateVisitCallback
      )
        .then(() => fromTransition.accept(simulatorVisitor))
        .then(() => poolState.accept(simulatorVisitor, poolStateVisitCallback))
        .then(() => Promise.resolve());
    }
  }

  private buildRecord(
    actionType: ActionType,
    actionParams: MethodParams,
    actionReturnValues: ReturnParams
  ): Record {
    return {
      id: IDGenerator.guid(),
      actionType,
      actionParams,
      actionReturnValues,
      timestamp: new Date(),
    };
  }

  private getNextPoolState(fromTransition: Transition) {
    let nextPoolState = new PoolState(
      this.poolState.poolConfig,
      undefined,
      fromTransition
    );
    fromTransition.target = nextPoolState;
    return nextPoolState;
  }

  private postProcess(
    actionType: ActionType,
    actionParams: MethodParams,
    actionReturnValues: ReturnParams,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ): Promise<void> {
    let record: Record = this.buildRecord(
      actionType,
      actionParams,
      actionReturnValues
    );
    let transition: Transition = this.poolState.addTransition(record);
    let nextPoolState: PoolState = this.getNextPoolState(transition);
    this.simulatorRoadmapManager.addPoolState(nextPoolState);
    this._poolState = nextPoolState;
    let postProcessor = postProcessorCallback
      ? postProcessorCallback
      : this.postProcessorCallback;
    return postProcessor(this, transition);
  }
}
