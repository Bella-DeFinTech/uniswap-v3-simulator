import JSBI from "jsbi";
import { FeeAmount } from "./FeeAmount";

import dotenv from "dotenv";

// load .env file
dotenv.config();

export const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY;

// constants used internally but not expected to be used externally
export const UNISWAP_V3_SUBGRAPH_ENDPOINT =
  "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";

export const BSC_PANCAKE_V3_SUBGRAPH_ENDPOINT = `https://gateway.thegraph.com/api/subgraphs/id/A1BC1hzDsK4NTeXBpKQnDBphngpYZAwDUF7dEBfa3jHK`;

export const NEGATIVE_ONE = JSBI.BigInt(-1);
export const ZERO = JSBI.BigInt(0);
export const ONE = JSBI.BigInt(1);
export const TWO = JSBI.BigInt(2);
export const MaxUint128 = JSBI.subtract(
  JSBI.exponentiate(TWO, JSBI.BigInt(128)),
  ONE
);
export const MaxUint160 = JSBI.subtract(
  JSBI.exponentiate(TWO, JSBI.BigInt(160)),
  ONE
);
export const MaxUint256 = JSBI.subtract(
  JSBI.exponentiate(TWO, JSBI.BigInt(256)),
  ONE
);
export const MaxInt128 = JSBI.subtract(
  JSBI.exponentiate(TWO, JSBI.BigInt(128 - 1)),
  ONE
);
export const MinInt128 = JSBI.unaryMinus(
  JSBI.exponentiate(TWO, JSBI.BigInt(128 - 1))
);

// used in liquidity amount math
export const Q32 = JSBI.exponentiate(TWO, JSBI.BigInt(32));
export const Q96 = JSBI.exponentiate(TWO, JSBI.BigInt(96));
export const Q128 = JSBI.exponentiate(TWO, JSBI.BigInt(128));
export const Q192 = JSBI.exponentiate(Q96, TWO);

// used in fee calculation
export const MAX_FEE = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(6));

export const PROTOCOL_FEE = JSBI.BigInt(3300);
export const PROTOCOL_FEE_DENOMINATOR = JSBI.BigInt(10000);

// The default factory tick spacings by fee amount.
export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.EXTRA_LOW]: 1,
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

export const RAPID_POSITION_OWNER =
  "0x00000000000000000000000000000001ECAE3608";
