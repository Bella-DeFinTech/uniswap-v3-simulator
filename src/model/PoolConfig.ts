import { FeeAmount } from "../enum/FeeAmount";
import { IdGenerator } from "../util/IdGenerator";

export class PoolConfig {
  readonly id: string;
  readonly tickSpacing: number;
  readonly token0: string;
  readonly token1: string;
  readonly fee: FeeAmount;

  constructor(
    tickSpacing: number,
    token0: string,
    token1: string,
    fee: FeeAmount
  ) {
    this.id = IdGenerator.guid();
    this.tickSpacing = tickSpacing;
    this.token0 = token0;
    this.token1 = token1;
    this.fee = fee;
  }
}

export function toString(poolConfig: PoolConfig): string {
  return `
    Pool Config:
        id: ${poolConfig.id}
        tickSpacing: ${poolConfig.tickSpacing}
        token0: ${poolConfig.token0}
        token1: ${poolConfig.token1}
        fee: ${poolConfig.fee}
  `;
}
