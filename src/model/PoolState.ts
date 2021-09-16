import JSBI from "jsbi";
import { PoolConfig } from "./PoolConfig";
import { Transition } from "../model/Transition";
import { Snapshot } from "../entity/Snapshot";
import { PositionManager } from "../manager/PositionManager";
import { TickManager } from "../manager/TickManager";
import { IDGenerator } from "../util/IDGenerator";
import { Record } from "../entity/Record";
import { Visitable } from "../interface/Visitable";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { PoolStateHelper } from "../util/PoolStateHelper";
import { CorePool } from "../core/CorePool";
import { ActionType } from "../enum/ActionType";
import { Serializer } from "../util/Serializer";

export class PoolState implements Visitable {
  readonly id: string;
  readonly baseSnapshot: Snapshot | undefined;
  private _snapshot: Snapshot | undefined;
  readonly poolConfig: PoolConfig;
  readonly fromTransition: Transition | undefined;
  readonly transitions: Transition[] = new Array<Transition>();
  readonly timestamp: Date = new Date();

  constructor(
    poolConfig?: PoolConfig,
    baseSnapshot?: Snapshot,
    fromTransition?: Transition
  ) {
    if (!poolConfig && !baseSnapshot) {
      throw new Error(
        "Please give at least a PoolConfig or a Snapshot from past persistence!"
      );
    }
    this.poolConfig = baseSnapshot ? baseSnapshot.poolConfig : poolConfig!;
    this.id = baseSnapshot ? baseSnapshot.id : IDGenerator.guid();
    this.baseSnapshot = baseSnapshot;
    this.fromTransition = fromTransition;
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
    return visitor.visitOnPoolState(this, callback);
  }

  recoverCorePool(takeSnapshot?: boolean): CorePool {
    let corePool = this.hasSnapshot()
      ? PoolStateHelper.buildCorePoolBySnapshot(this.snapshot as Snapshot)
      : PoolStateHelper.recoverCorePoolByPoolStateChain(this);
    if (takeSnapshot && !this.hasSnapshot()) {
      this.takeSnapshot(
        "Automated for caching",
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

  hasSnapshot(): boolean {
    return this.snapshot !== undefined;
  }

  hasBaseSnapshot(): boolean {
    return this.baseSnapshot !== undefined;
  }

  addTransition(record: Record): Transition {
    const transition = new Transition(this, record);
    this.transitions.push(transition);
    return transition;
  }

  fork(): PoolState {
    let record: Record = {
      id: IDGenerator.guid(),
      actionType: ActionType.FORK,
      actionParams: {},
      actionReturnValues: {},
      timestamp: new Date(),
    };
    let transition: Transition = this.addTransition(record);
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
