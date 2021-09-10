import { CorePool } from "../core/CorePool";
import { Snapshot } from "../entity/Snapshot";
import { PoolState } from "../model/PoolState";
import { Record } from "../entity/Record";
import { PoolConfig } from "../model/PoolConfig";
import { ActionType } from "../enum/ActionType";

export abstract class PoolStateHelper {
  static recoverCorePoolByPoolStateChain(poolState: PoolState): CorePool {
    let fromTransition = poolState.fromTransition;
    if (!fromTransition) {
      return poolState.hasBaseSnapshot()
        ? PoolStateHelper.buildCorePoolBySnapshot(poolState.baseSnapshot!)
        : PoolStateHelper.buildCorePoolByPoolConfig(poolState.poolConfig);
    } else {
      if (poolState.hasSnapshot()) {
        let snapshot = poolState.snapshot!;
        return PoolStateHelper.buildCorePoolBySnapshot(snapshot);
      } else {
        return PoolStateHelper.applyRecordOnCorePool(
          PoolStateHelper.recoverCorePoolByPoolStateChain(
            fromTransition.source
          ),
          fromTransition.record
        );
      }
    }
  }

  static buildCorePoolBySnapshot(snapshot: Snapshot): CorePool {
    return new CorePool(
      snapshot.poolConfig.token0,
      snapshot.poolConfig.token1,
      snapshot.poolConfig.fee,
      snapshot.poolConfig.tickSpacing,
      snapshot.token0Balance,
      snapshot.token1Balance,
      snapshot.sqrtPriceX96,
      snapshot.liquidity,
      snapshot.tickCurrent,
      snapshot.feeGrowthGlobal0X128,
      snapshot.feeGrowthGlobal1X128,
      snapshot.tickManager,
      snapshot.positionManager
    );
  }

  static buildCorePoolByPoolConfig(poolConfig: PoolConfig): CorePool {
    return new CorePool(
      poolConfig.token0,
      poolConfig.token1,
      poolConfig.fee,
      poolConfig.tickSpacing
    );
  }

  private static applyRecordOnCorePool(
    corepool: CorePool,
    record: Record
  ): CorePool {
    if (
      record.actionType == ActionType.SNAPSHOT ||
      record.actionType == ActionType.FORK
    ) {
      return corepool;
    }
    let event: Function = corepool[record.actionType];
    event.call(
      corepool,
      ...this.actionParamsToParamsArray(record.actionParams)
    );
    return corepool;
  }

  private static actionParamsToParamsArray(actionParams: any): Array<any> {
    return Object.keys(actionParams).map((paramKey) => actionParams[paramKey]);
  }
}
