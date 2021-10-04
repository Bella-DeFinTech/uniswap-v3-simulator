import { EventType } from "./EventType";
import JSBI from "jsbi";

export interface LiquidityEvent {
  id: number;
  type: EventType.MINT | EventType.BURN;
  liquidity: JSBI;
  amount0: JSBI;
  amount1: JSBI;
  tick_lower: number;
  tick_upper: number;
  block_number: number;
  transaction_index: number;
  log_index: number;
  date: Date;
}
