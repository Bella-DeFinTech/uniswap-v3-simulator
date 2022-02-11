import JSBI from "jsbi";
import { PoolState } from "../model/PoolState";
import { Record } from "../entity/Record";
import { CorePool } from "./CorePool";
import { Visitable } from "../interface/Visitable";
import { ActionType } from "../enum/ActionType";
import { PoolStateHelper } from "../util/PoolStateHelper";
import { IdGenerator } from "../util/IdGenerator";
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
  InitializeParams,
} from "../interface/ActionParams";
import { SimulatorRoadmapManager } from "../manager/SimulatorRoadmapManager";
import { ConfigurableCorePool as IConfigurableCorePool } from "../interface/ConfigurableCorePool";
import { CorePoolView } from "../interface/CorePoolView";
import { PoolStateView } from "../interface/PoolStateView";
import { Transition as TransitionView } from "../interface/Transition";
import { SwapEvent } from "../entity/SwapEvent";
import { ZERO } from "../enum/InternalConstants";
import { FullMath } from "..";

export class ConfigurableCorePool implements IConfigurableCorePool, Visitable {
  readonly id: string;
  private simulatorConsoleVisitor: SimulatorConsoleVisitor;
  private simulatorPersistenceVisitor: SimulatorPersistenceVisitor;
  private _poolState: PoolState;
  private simulatorRoadmapManager: SimulatorRoadmapManager;
  private corePool: CorePool;
  private postProcessorCallback: (
    configurableCorePool: IConfigurableCorePool,
    transition: TransitionView
  ) => Promise<void> = async function () {};

  constructor(
    poolState: PoolState,
    simulatorRoadmapManager: SimulatorRoadmapManager,
    simulatorConsoleVisitor: SimulatorConsoleVisitor,
    simulatorPersistenceVisitor: SimulatorPersistenceVisitor
  ) {
    this.simulatorConsoleVisitor = simulatorConsoleVisitor;
    this.simulatorPersistenceVisitor = simulatorPersistenceVisitor;
    this.id = IdGenerator.guid();
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
    this.simulatorRoadmapManager = simulatorRoadmapManager;
    this.simulatorRoadmapManager.addPoolState(this.poolState);
    this.simulatorRoadmapManager.addRoute(this);
  }

  getPoolState(): PoolStateView {
    return this.poolState;
  }

  getCorePool(): CorePoolView {
    return this.corePool;
  }

  initialize(
    sqrtPriceX96: JSBI,
    postProcessorCallback?: (
      configurableCorePool: IConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<void> {
    let currentPoolStateId = this.poolState.id;
    try {
      let res = this.corePool.initialize(sqrtPriceX96);
      return this.postProcess(
        ActionType.INITIALIZE,
        { type: ActionType.INITIALIZE, sqrtPriceX96 } as InitializeParams,
        {} as ReturnParams,
        postProcessorCallback
      ).then(() => Promise.resolve(res));
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
  }

  mint(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI,
    postProcessorCallback?: (
      configurableCorePool: IConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }> {
    let currentPoolStateId = this.poolState.id;
    let res: GeneralReturnParams;
    try {
      res = this.corePool.mint(recipient, tickLower, tickUpper, amount);
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
    return this.postProcess(
      ActionType.MINT,
      {
        type: ActionType.MINT,
        recipient,
        tickLower,
        tickUpper,
        amount,
      } as MintParams,
      res,
      postProcessorCallback
    )
      .then(() => Promise.resolve(res))
      .catch((err) => {
        this.recover(currentPoolStateId);
        return Promise.reject(err);
      });
  }

  burn(
    owner: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI,
    postProcessorCallback?: (
      configurableCorePool: IConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }> {
    let currentPoolStateId = this.poolState.id;
    let res: GeneralReturnParams;
    try {
      res = this.corePool.burn(owner, tickLower, tickUpper, amount);
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
    return this.postProcess(
      ActionType.BURN,
      {
        type: ActionType.BURN,
        owner,
        tickLower,
        tickUpper,
        amount,
      } as BurnParams,
      res,
      postProcessorCallback
    )
      .then(() => Promise.resolve(res))
      .catch((err) => {
        this.recover(currentPoolStateId);
        return Promise.reject(err);
      });
  }

  collect(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount0Requested: JSBI,
    amount1Requested: JSBI,
    postProcessorCallback?: (
      configurableCorePool: IConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }> {
    let currentPoolStateId = this.poolState.id;
    let res: GeneralReturnParams;
    try {
      res = this.corePool.collect(
        recipient,
        tickLower,
        tickUpper,
        amount0Requested,
        amount1Requested
      );
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
    return this.postProcess(
      ActionType.COLLECT,
      {
        type: ActionType.COLLECT,
        recipient,
        tickLower,
        tickUpper,
        amount0Requested,
        amount1Requested,
      } as CollectParams,
      res,
      postProcessorCallback
    )
      .then(() => Promise.resolve(res))
      .catch((err) => {
        this.recover(currentPoolStateId);
        return Promise.reject(err);
      });
  }

  swap(
    zeroForOne: boolean,
    amountSpecified: JSBI,
    sqrtPriceLimitX96?: JSBI,
    postProcessorCallback?: (
      configurableCorePool: IConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }> {
    let currentPoolStateId = this.poolState.id;
    let res: GeneralReturnParams;
    try {
      res = this.corePool.swap(zeroForOne, amountSpecified, sqrtPriceLimitX96);
    } catch (error) {
      this.recover(currentPoolStateId);
      throw error;
    }
    return this.postProcess(
      ActionType.SWAP,
      {
        type: ActionType.SWAP,
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96,
      } as SwapParams,
      res,
      postProcessorCallback
    )
      .then(() => Promise.resolve(res))
      .catch((err) => {
        this.recover(currentPoolStateId);
        return Promise.reject(err);
      });
  }

  querySwap(
    zeroForOne: boolean,
    amountSpecified: JSBI,
    sqrtPriceLimitX96?: JSBI
  ): Promise<{ amount0: JSBI; amount1: JSBI; sqrtPriceX96: JSBI }> {
    return Promise.resolve(
      this.corePool.querySwap(zeroForOne, amountSpecified, sqrtPriceLimitX96)
    );
  }

  async resolveInputFromSwapResultEvent(
    param: SwapEvent
  ): Promise<{ amountSpecified: JSBI; sqrtPriceX96?: JSBI }> {
    let tryWithDryRun = (
      param: SwapEvent,
      amountSpecified: JSBI,
      sqrtPriceLimitX96?: JSBI
    ) => {
      let zeroForOne: boolean = JSBI.greaterThan(param.amount0, ZERO)
        ? true
        : false;
      return this.querySwap(
        zeroForOne,
        amountSpecified,
        sqrtPriceLimitX96
      ).then(({ amount0, amount1, sqrtPriceX96 }) => {
        return (
          JSBI.equal(amount0, param.amount0) &&
          JSBI.equal(amount1, param.amount1) &&
          JSBI.equal(sqrtPriceX96, param.sqrtPriceX96)
        );
      });
    };

    let solution1 = {
      amountSpecified: JSBI.equal(param.liquidity, ZERO)
        ? FullMath.incrTowardInfinity(param.amount0)
        : param.amount0,
      sqrtPriceLimitX96: param.sqrtPriceX96,
    };
    let solution2 = {
      amountSpecified: JSBI.equal(param.liquidity, ZERO)
        ? FullMath.incrTowardInfinity(param.amount1)
        : param.amount1,
      sqrtPriceLimitX96: param.sqrtPriceX96,
    };
    let solution3 = {
      amountSpecified: param.amount0,
      sqrtPriceLimitX96: undefined,
    };
    let solution4 = {
      amountSpecified: param.amount1,
      sqrtPriceLimitX96: undefined,
    };
    let solutionList: {
      amountSpecified: JSBI;
      sqrtPriceLimitX96?: JSBI;
    }[] = [solution3, solution4];

    if (JSBI.notEqual(param.sqrtPriceX96, this.getCorePool().sqrtPriceX96)) {
      if (JSBI.equal(param.liquidity, JSBI.BigInt(-1))) {
        let solution5 = {
          amountSpecified: param.amount0,
          sqrtPriceLimitX96: param.sqrtPriceX96,
        };
        let solution6 = {
          amountSpecified: param.amount1,
          sqrtPriceLimitX96: param.sqrtPriceX96,
        };
        solutionList.push(solution5);
        solutionList.push(solution6);
      }
      solutionList.push(solution1);
      solutionList.push(solution2);
    }
    for (let i = 0; i < solutionList.length; i++) {
      if (
        await tryWithDryRun(
          param,
          solutionList[i].amountSpecified,
          solutionList[i].sqrtPriceLimitX96
        )
      ) {
        return {
          amountSpecified: solutionList[i].amountSpecified,
          sqrtPriceX96: solutionList[i].sqrtPriceLimitX96,
        };
      }
    }
    throw new Error(
      "Can't resolve to the same as event records. Please check event input."
    );
  }

  // user custom PostProcessor will be called after pool state transition finishes
  updatePostProcessor(
    callback: (
      configurableCorePool: IConfigurableCorePool,
      transition: TransitionView
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

  fork(): IConfigurableCorePool {
    this.takeSnapshot("Automated for forking");
    return new ConfigurableCorePool(
      this.poolState.fork(),
      this.simulatorRoadmapManager,
      this.simulatorConsoleVisitor,
      this.simulatorPersistenceVisitor
    );
  }

  persistSnapshot(): Promise<string> {
    return this.traversePoolStateChain(
      this.simulatorPersistenceVisitor,
      this.poolState.id,
      this.poolState.id
    ).then(() => Promise.resolve(this.poolState.id));
  }

  stepBack() {
    let fromTransition = this.poolState.transitionSource;
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
    return visitor.visitConfigurableCorePool(this);
  }

  // this will take snapshot during PoolStates to speed up
  showStateTransitionRoute(
    toPoolStateId?: string,
    fromPoolStateId?: string
  ): Promise<void> {
    let simulatorConsoleVisitor: SimulatorVisitor =
      new SimulatorConsoleVisitor();
    return this.traversePoolStateChain(
      simulatorConsoleVisitor,
      toPoolStateId ? toPoolStateId : this.poolState.id,
      fromPoolStateId
    );
  }

  persistSnapshots(
    toPoolStateId: string,
    fromPoolStateId?: string
  ): Promise<Array<number>> {
    let snapshotIds: Array<number> = [];
    let poolStateVisitCallback = (_: PoolState, returnValue: number) => {
      if (returnValue > 0) snapshotIds.push(returnValue);
    };
    return this.traversePoolStateChain(
      this.simulatorPersistenceVisitor,
      toPoolStateId,
      fromPoolStateId,
      poolStateVisitCallback
    ).then(() => Promise.resolve(snapshotIds));
  }

  private traversePoolStateChain(
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
      !poolState.transitionSource ||
      poolState.transitionSource.record.actionType == ActionType.FORK ||
      poolState.id == fromPoolStateId
    ) {
      return poolState
        .accept(simulatorVisitor, poolStateVisitCallback)
        .then(() => Promise.resolve());
    } else {
      let fromTransition = poolState.transitionSource!;
      return (
        this.handleSingleStepOnChain(
          fromTransition.source,
          simulatorVisitor,
          fromPoolStateId,
          poolStateVisitCallback
        )
          .then(() => fromTransition.accept(simulatorVisitor))
          .then(() =>
            poolState.accept(simulatorVisitor, poolStateVisitCallback)
          )
          // this will clear auto caching of snapshot in last PoolState to save memory space
          .then(() => fromTransition.source.clearSnapshot(true))
          .then(() => Promise.resolve())
      );
    }
  }

  private buildRecord(
    actionType: ActionType,
    actionParams: MethodParams,
    actionReturnValues: ReturnParams
  ): Record {
    return {
      id: IdGenerator.guid(),
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
      configurableCorePool: IConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<void> {
    let record: Record = this.buildRecord(
      actionType,
      actionParams,
      actionReturnValues
    );
    let transition: Transition = this.poolState.addTransitionTarget(record);
    let nextPoolState: PoolState = this.getNextPoolState(transition);
    this.simulatorRoadmapManager.addPoolState(nextPoolState);
    this._poolState = nextPoolState;
    let postProcessor = postProcessorCallback
      ? postProcessorCallback
      : this.postProcessorCallback;
    return postProcessor(this, transition);
  }
}
