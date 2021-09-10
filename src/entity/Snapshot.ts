import JSBI from "jsbi";
import { PoolConfig } from "./PoolConfig";

export type Snapshot = {
  id: string;
  poolConfig: PoolConfig;
  token0Balance: JSBI;
  token1Balance: JSBI;
  sqrtPriceX96: JSBI;
  liquidity: JSBI;
  tickCurrent: number;
  feeGrowthGlobal0X128: JSBI;
  feeGrowthGlobal1X128: JSBI;
  ticks_json: string;
  positions_json: string;
  timestamp: Date;
};
