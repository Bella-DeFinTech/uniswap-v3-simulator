import JSBI from "jsbi";
import { TickManager } from "../manager/TickManager";
import { PositionManager } from "../manager/PositionManager";
import { PoolState } from "../model/PoolState";
import { Record } from "../entity/Record";
import { CorePool } from "./CorePool";
import { ActionType } from "../enum/ActionType";
import { Serializer } from "../util/Serializer";
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

  constructor(poolState: PoolState) {
    super(
      poolState.poolConfig.token0,
      poolState.poolConfig.token1,
      poolState.poolConfig.fee,
      poolState.poolConfig.tickSpacing
    );
    if (poolState.hasBaseSnapshot()) {
      let state = <Snapshot>poolState.baseSnapshot;
      super(
        poolState.poolConfig.token0,
        poolState.poolConfig.token1,
        poolState.poolConfig.fee,
        poolState.poolConfig.tickSpacing,
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

  mint(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    // TODO
    this.postProcess(ActionType.MINT, {
      tickLower: tickLower,
      tickUpper: tickUpper,
      amount: amount,
    });
    return {
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
  }

  burn(
    owner: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    // TODO
    return {
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
  }

  collect(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount0Requested: JSBI,
    amount1Requested: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    // TODO
    return {
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
  }

  swap(
    zeroForOne: boolean,
    amountSpecified: JSBI,
    sqrtPriceLimitX96: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    // TODO
    return {
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
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

  private applyRecord(actionType: ActionType, actionParams: object): Record {
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
    let record = this.applyRecord(actionType, actionParams);
    this.postProcessorCallback(
      record.id,
      record.actionType,
      record.actionParams
    );
  }
}
