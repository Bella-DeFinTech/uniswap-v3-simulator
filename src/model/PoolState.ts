import JSBI from "jsbi";
import { PoolConfig } from "./PoolConfig";
import { Transition } from "../model/Transition";
import { Snapshot } from "../entity/Snapshot";
import { PositionManager } from "../manager/PositionManager";
import { TickManager } from "../manager/TickManager";
import { IdGenerator } from "../util/IdGenerator";
import { Record } from "../entity/Record";
import { Visitable } from "../interface/Visitable";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { PoolStateHelper } from "../util/PoolStateHelper";
import { CorePool } from "../core/CorePool";
import { ActionType } from "../enum/ActionType";
import { Serializer } from "../util/Serializer";
import { Transition as TransitionView } from "../interface/Transition";

const DEFAULT_SNAPSHOT_DESCRIPTION = "Automated for caching";
export class PoolState implements Visitable {
  readonly id: string;
  readonly baseSnapshot: Snapshot | undefined;
  private _snapshot: Snapshot | undefined;
  readonly poolConfig: PoolConfig;
  readonly transitionSource: Transition | undefined;
  readonly transitionTargets: Transition[] = new Array<Transition>();
  readonly timestamp: Date = new Date();

  constructor(
    poolConfig?: PoolConfig,
    baseSnapshot?: Snapshot,
    fromTransition?: Transition
  ) {
    if (!poolConfig && !baseSnapshot) {
      throw new Error("Please provide a pool config or a base snapshot!");
    }
    this.poolConfig = baseSnapshot ? baseSnapshot.poolConfig : poolConfig!;
    this.id = baseSnapshot ? baseSnapshot.id : IdGenerator.guid();
    this.baseSnapshot = baseSnapshot;
    this.transitionSource = fromTransition;
  }

  public get snapshot(): Snapshot | undefined {
    return this._snapshot;
  }

  static from(baseSnapshot: Snapshot): PoolState {
    return new PoolState(undefined, baseSnapshot);
  }

  takeSnapshot(
    description: string,
    token0Balance: JSBI,
    token1Balance: JSBI,
    sqrtPriceX96: JSBI,
    liquidity: JSBI,
    tickCurrent: number,
    feeGrowthGlobal0X128: JSBI,
    feeGrowthGlobal1X128: JSBI,
    tickManager: TickManager,
    positionManager: PositionManager
  ) {
    this._snapshot = {
      id: this.id,
      description,
      poolConfig: this.poolConfig,
      token0Balance,
      token1Balance,
      sqrtPriceX96,
      liquidity,
      tickCurrent,
      feeGrowthGlobal0X128,
      feeGrowthGlobal1X128,
      tickManager: Serializer.deserialize(
        TickManager,
        Serializer.serialize(TickManager, tickManager)
      ),
      positionManager: Serializer.deserialize(
        PositionManager,
        Serializer.serialize(PositionManager, positionManager)
      ),
      timestamp: new Date(),
    };
  }

  accept(
    visitor: SimulatorVisitor,
    callback?: (poolState: PoolState, returnValue: any) => void
  ): Promise<string> {
    return visitor.visitPoolState(this, callback);
  }

  recoverCorePool(takeSnapshot?: boolean): CorePool {
    let corePool = this.hasSnapshot()
      ? PoolStateHelper.buildCorePoolBySnapshot(this.snapshot as Snapshot)
      : PoolStateHelper.recoverCorePoolByPoolStateChain(this);
    if (takeSnapshot && !this.hasSnapshot()) {
      this.takeSnapshot(
        DEFAULT_SNAPSHOT_DESCRIPTION,
        corePool.token0Balance,
        corePool.token1Balance,
        corePool.sqrtPriceX96,
        corePool.liquidity,
        corePool.tickCurrent,
        corePool.feeGrowthGlobal0X128,
        corePool.feeGrowthGlobal1X128,
        corePool.tickManager,
        corePool.positionManager
      );
    }
    return corePool;
  }

  clearSnapshot(cachingOnly: boolean = false) {
    if (!this.hasSnapshot()) return;
    if (
      !cachingOnly ||
      this.snapshot!.description === DEFAULT_SNAPSHOT_DESCRIPTION
    )
      this._snapshot = undefined;
  }

  hasSnapshot(): boolean {
    return this.snapshot !== undefined;
  }

  hasBaseSnapshot(): boolean {
    return this.baseSnapshot !== undefined;
  }

  addTransitionTarget(record: Record): Transition {
    const transition = new Transition(this, record);
    this.transitionTargets.push(transition);
    return transition;
  }

  getTransitionSource(): TransitionView | undefined {
    return this.transitionSource;
  }

  getTransitionTargets(): TransitionView[] {
    return this.transitionTargets;
  }

  fork(): PoolState {
    let record: Record = {
      id: IdGenerator.guid(),
      actionType: ActionType.FORK,
      actionParams: { type: ActionType.FORK },
      actionReturnValues: {},
      timestamp: new Date(),
    };
    let transition: Transition = this.addTransitionTarget(record);
    let forkedPoolState = new PoolState(
      this.poolConfig,
      this.baseSnapshot,
      transition
    );
    transition.target = forkedPoolState;
    forkedPoolState._snapshot = this.snapshot;
    return forkedPoolState;
  }
}
