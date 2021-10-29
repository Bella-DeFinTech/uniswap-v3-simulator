import { EventType } from "./EventType";
import JSBI from "jsbi";

export interface SwapEvent {
  id: number;
  type: EventType.SWAP;
  amount0: JSBI;
  amount1: JSBI;
  amountSpecified: JSBI;
  sqrt_price_x96: JSBI;
  liquidity: JSBI;
  tick: number;
  block_number: number;
  transaction_index: number;
  log_index: number;
  date: Date;
}
