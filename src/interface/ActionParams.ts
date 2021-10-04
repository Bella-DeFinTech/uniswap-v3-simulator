import JSBI from "jsbi";
import { ActionType } from "../enum/ActionType";

export type MethodParams =
  | InitializeParams
  | MintParams
  | BurnParams
  | SwapParams
  | CollectParams
  | ForkParams;

export interface InitializeParams {
  type: ActionType.INITIALIZE;
  sqrtPriceX96: JSBI;
}

export interface MintParams {
  type: ActionType.MINT;
  recipient: string;
  tickLower: number;
  tickUpper: number;
  amount: JSBI;
}

export interface BurnParams {
  type: ActionType.BURN;
  owner: string;
  tickLower: number;
  tickUpper: number;
  amount: JSBI;
}

export interface SwapParams {
  type: ActionType.SWAP;
  zeroForOne: boolean;
  amountSpecified: JSBI;
  sqrtPriceLimitX96?: JSBI;
}

export interface CollectParams {
  type: ActionType.COLLECT;
  recipient: string;
  tickLower: number;
  tickUpper: number;
  amount0Requested: JSBI;
  amount1Requested: JSBI;
}

export interface ForkParams {
  type: ActionType.FORK;
}

export type ReturnParams = VoidReturnParams | GeneralReturnParams;

export interface VoidReturnParams {}

export interface GeneralReturnParams {
  amount0: JSBI;
  amount1: JSBI;
}
