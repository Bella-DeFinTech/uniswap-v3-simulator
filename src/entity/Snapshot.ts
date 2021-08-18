import BN from "bn.js";
import { PoolConfig } from "./PoolConfig";

export type Snapshot = {
  id: string;
  poolConfig: PoolConfig;
  token0Balance: BN;
  token1Balance: BN;
  sqrtPriceX96: BN;
  tickCurrent: number;
  feeGrowthGlobal0X128: BN;
  feeGrowthGlobal1X128: BN;
  ticks_json: string;
  positions_json: string;
  timestamp: Date;
};
