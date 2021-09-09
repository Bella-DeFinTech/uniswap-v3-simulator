import { FeeAmount } from "../enum/FeeAmount";
import { IDGenerator } from "../util/IDGenerator";

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
    this.id = IDGenerator.guid();
    this.tickSpacing = tickSpacing;
    this.token0 = token0;
    this.token1 = token1;
    this.fee = fee;
  }

  toString(): string {
    return `
    Pool Config:
        id: ${this.id}
        tickSpacing: ${this.tickSpacing}
        token0: ${this.token0}
        token1: ${this.token1}
        fee: ${this.fee}
    `;
  }
}
