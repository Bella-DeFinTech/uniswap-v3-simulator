import { BigNumber as BN } from "ethers";
import JSBI from "jsbi";

export function sum(bnArr: BN[]) {
  return bnArr.reduce((prev, current) => {
    return prev.add(current);
  });
}

export function mul10pow(bn: BN, n: number) {
  return bn.mul(get10pow(n));
}

export function div10pow(bn: BN, n: number) {
  return bn.div(get10pow(n));
}

export function get10pow(n: number) {
  return BN.from(10).pow(n);
}

export function isPositive(bn: BN): boolean {
  return bn.gt(0);
}

export function toBN(number: any): BN {
  return BN.from(number.toString());
}

export function toJSBI(number: any): JSBI {
  return JSBI.BigInt(number.toString());
}
