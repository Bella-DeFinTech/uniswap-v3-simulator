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

export function printParams(params: MethodParams | ReturnParams): string {
  let str = "{";
  for (let key in params) {
    let value: any = params[key as keyof (MethodParams | ReturnParams)];
    str += key + ": " + (isObject(value) ? value.toString() : value) + ", ";
  }
  if (str.lastIndexOf(" ") == str.length - 1) str = str.slice(0, -2);
  str += "}";
  return str;
}

function isObject(value: unknown): value is object {
  return typeof value === "object";
}
