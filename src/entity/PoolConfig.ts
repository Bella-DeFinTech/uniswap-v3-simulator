import { FeeAmount } from "../enum/FeeAmount";

export type PoolConfig = {
  id: string;
  tickSpacing: number;
  token0: string;
  token1: string;
  fee: FeeAmount;
};
