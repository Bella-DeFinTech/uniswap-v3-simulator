import { EventType } from "./EventType";
import JSBI from "jsbi";

export interface SwapEvent {
  id: number;
  type: EventType.SWAP;
  amount0: JSBI;
  amount1: JSBI;
  amountSpecified: JSBI;
  sqrtPriceX96: JSBI;
  liquidity: JSBI;
  tick: number;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  date: Date;
}
