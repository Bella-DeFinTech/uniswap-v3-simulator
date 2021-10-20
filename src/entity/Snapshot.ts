import JSBI from "jsbi";
import { PositionManager } from "../manager/PositionManager";
import { TickManager } from "../manager/TickManager";
import { PoolConfig } from "../model/PoolConfig";

export type Snapshot = {
  id: string;
  description: string;
  poolConfig: PoolConfig;
  token0Balance: JSBI;
  token1Balance: JSBI;
  sqrtPriceX96: JSBI;
  liquidity: JSBI;
  tickCurrent: number;
  feeGrowthGlobal0X128: JSBI;
  feeGrowthGlobal1X128: JSBI;
  tickManager: TickManager;
  positionManager: PositionManager;
  timestamp: Date;
};
