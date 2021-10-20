import { PoolState } from "../model/PoolState";

export interface PoolStateContainer {
  addPoolState: (PoolState: PoolState) => string;
  getPoolState: (PoolStateId: string) => PoolState | undefined;
  hasPoolState: (PoolStateId: string) => boolean;
}
