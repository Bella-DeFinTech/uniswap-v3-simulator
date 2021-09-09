import JSBI from "jsbi";

export interface MethodParams {}

export interface MintParams extends MethodParams {
  recipient: string;
  tickLower: number;
  tickUpper: number;
  amount: JSBI;
}

export interface BurnParams extends MethodParams {
  owner: string;
  tickLower: number;
  tickUpper: number;
  amount: JSBI;
}

export interface SwapParams extends MethodParams {
  zeroForOne: boolean;
  amountSpecified: JSBI;
  sqrtPriceLimitX96: JSBI;
}

export interface CollectParams extends MethodParams {
  recipient: string;
  tickLower: number;
  tickUpper: number;
  amount0Requested: JSBI;
  amount1Requested: JSBI;
}

export interface ReturnParams {}

export interface GeneralReturnParams extends ReturnParams {
  amount0: JSBI;
  amount1: JSBI;
}
