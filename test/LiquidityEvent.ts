import { EventType } from "./EventType";
import JSBI from "jsbi";

export interface LiquidityEvent {
  id: number;
  type: EventType.MINT | EventType.BURN;
  liquidity: JSBI;
  amount0: JSBI;
  amount1: JSBI;
  tickLower: number;
  tickUpper: number;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  date: Date;
}
