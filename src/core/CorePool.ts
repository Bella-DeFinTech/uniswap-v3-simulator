import BN from "bn.js";
import { TickManager } from "../manager/TickManager";
import { PositionManager } from "../manager/PositionManager";
import { Position } from "../model/Position";
import { Tick } from "../model/Tick";
import { TickMath } from "../util/TickMath";

export class CorePool {
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  token0Balance: BN;
  token1Balance: BN;
  sqrtPriceX96: BN;
  tickCurrent: number;
  feeGrowthGlobal0X128: BN;
  feeGrowthGlobal1X128: BN;
  private tickManager: TickManager;
  private positionManager: PositionManager;

  constructor(
    token0: string,
    token1: string,
    fee: number,
    tickSpacing: number,
    token0Balance: BN = new BN(0),
    token1Balance: BN = new BN(0),
    sqrtPriceX96: BN = new BN(0),
    tickCurrent: number = 0,
    feeGrowthGlobal0X128: BN = new BN(0),
    feeGrowthGlobal1X128: BN = new BN(0),
    tickManager: TickManager = new TickManager(),
    positionManager: PositionManager = new PositionManager()
  ) {
    this.token0 = token0;
    this.token1 = token1;
    this.token0Balance = token0Balance;
    this.token1Balance = token1Balance;
    this.fee = fee;
    this.tickSpacing = tickSpacing;
    this.sqrtPriceX96 = sqrtPriceX96;
    this.tickCurrent = tickCurrent;
    this.feeGrowthGlobal0X128 = feeGrowthGlobal0X128;
    this.feeGrowthGlobal1X128 = feeGrowthGlobal1X128;
    this.tickManager = tickManager;
    this.positionManager = positionManager;
  }

  initialize(sqrtPriceX96: BN) {
    // TODO
    this.tickCurrent = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    this.sqrtPriceX96 = sqrtPriceX96;
  }

  mint(tickLower: number, tickUpper: number, amount: BN) {
    // TODO
  }

  burn(tickLower: number, tickUpper: number, amount: BN) {
    // TODO
  }

  collect(
    tickLower: number,
    tickUpper: number,
    amount0Requested: BN,
    amount1Requested: BN
  ) {
    // TODO
  }

  swap(zeroForOne: boolean, amountSpecified: BN, sqrtPriceLimitX96: BN) {
    // TODO
  }

  private modifyPosition(
    tickLower: number,
    tickUpper: number,
    liquidityDelta: BN
  ): { amount0: BN; amount1: BN } {
    // TODO
    return { amount0: new BN(0), amount1: new BN(0) };
  }

  private updatePosition(
    tickLower: number,
    tickUpper: number,
    liquidityDelta: BN
  ) {
    // TODO
  }

  ticks(tick: number): Tick {
    return this.tickManager.get(tick);
  }

  positions(key: string): Position {
    return this.positionManager.getKey(key);
  }
}
