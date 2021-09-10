import JSBI from "jsbi";
import { PoolState } from "../model/PoolState";
import { TickManager } from "./TickManager";
import { PositionManager } from "./PositionManager";
import { Snapshot } from "../entity/Snapshot";
import { PoolConfig } from "../entity/PoolConfig";

export class DBManager {
  static persistSnapshot(
    poolState: PoolState,
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
    // TODO
  }

  static readSnapshot(snapshotId: string): Snapshot {
    // TODO
    let poolConfigId = "0";
    return {
      id: "0",
      poolConfig: DBManager.readPoolConfig(poolConfigId),
      token0Balance: JSBI.BigInt(0),
      token1Balance: JSBI.BigInt(0),
      sqrtPriceX96: JSBI.BigInt(0),
      liquidity: JSBI.BigInt(0),
      tickCurrent: 0,
      feeGrowthGlobal0X128: JSBI.BigInt(0),
      feeGrowthGlobal1X128: JSBI.BigInt(0),
      ticks_json: "",
      positions_json: "",
      timestamp: new Date(),
    };
  }

  static readPoolConfig(poolConfigId: string): PoolConfig {
    return {
      id: "0",
      tickSpacing: 0,
      token0: "0",
      token1: "0",
      fee: 0,
    };
  }
}
