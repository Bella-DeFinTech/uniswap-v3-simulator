import BN from "bn.js";
import { TickManager } from "../managers/TickManager";
import { PositionManager } from "../managers/PositionManager";
import { PoolState } from "../model/PoolState";
import { Record } from "../entity/Record";
import { PoolConfig } from "../entity/PoolConfig";
import { CorePool } from "./CorePool";
import { ActionType } from "../enum/ActionType";
import { Serializer } from "../utils/Serializer";
import { Snapshot } from "../entity/Snapshot";

export class ConfigurableCorePool extends CorePool {
  private poolState: PoolState;
  private postProcessorCallback: (
    this: ConfigurableCorePool,
    recordId: string,
    actionType: ActionType,
    actionParams: object
  ) => void = function (
    this: ConfigurableCorePool,
    recordId: string,
    actionType: ActionType,
    actionParams: object
  ) {};

  constructor(poolConfig: PoolConfig);
  constructor(poolConfig: PoolConfig, poolState: PoolState);
  constructor(
    poolConfig: PoolConfig,
    poolState: PoolState = new PoolState(null, poolConfig)
  ) {
    super(
      poolConfig.token0,
      poolConfig.token1,
      poolConfig.fee,
      poolConfig.tickSpacing
    );
    if (poolState.hasBaseSnapshot()) {
      let poolConfig = poolState.poolConfig;
      let state = <Snapshot>poolState.baseSnapshot;
      super(
        poolConfig.token0,
        poolConfig.token1,
        poolConfig.fee,
        poolConfig.tickSpacing,
        state.token0Balance,
        state.token1Balance,
        state.sqrtPriceX96,
        state.tickCurrent,
        state.feeGrowthGlobal0X128,
        state.feeGrowthGlobal1X128,
        <TickManager>Serializer.deserialize(TickManager, state.ticks_json),
        <PositionManager>(
          Serializer.deserialize(PositionManager, state.positions_json)
        )
      );
    }
    this.poolState = poolState;
  }

  mint(tickLower: number, tickUpper: number, amount: BN) {
    // TODO
    this.postProcess(ActionType.MINT, {
      tickLower: tickLower,
      tickUpper: tickUpper,
      amount: amount,
    });
  }

  burn(tickLower: number, tickUpper: number, amount: BN) {
    // TODO
  }

  collect(
    tickLower: number,
    tickUpper: number,
    amount0Requested: BN,
    amount1Requested: BN
  ) {
    // TODO
  }

  swap(zeroForOne: boolean, amountSpecified: BN, sqrtPriceLimitX96: BN) {
    // TODO
  }

  updatePostProcessor(
    callback: (
      this: ConfigurableCorePool,
      recordId: string,
      actionType: ActionType,
      actionParams: object
    ) => void
  ) {
    this.postProcessorCallback = callback;
  }

  takeSnapshot(): string {
    // TODO
    return "0";
  }

  recover(snapshotId: string) {
    // TODO
  }

  private doRecord(actionType: ActionType, actionParams: object): Record {
    // TODO
    return {
      id: "0",
      eventId: 1,
      actionType: actionType,
      actionParams: [],
      timestamp: new Date(),
    };
  }

  private postProcess(actionType: ActionType, actionParams: object) {
    let record = this.doRecord(actionType, actionParams);
    this.postProcessorCallback(
      record.id,
      record.actionType,
      record.actionParams
    );
  }
}
