import BN from "bn.js";
import { TickManager } from "../manager/TickManager";
import { PositionManager } from "../manager/PositionManager";
import { Position } from "../model/Position";
import { Tick } from "../model/Tick";
import { TickMath } from "../util/TickMath";

export class CorePool {
  readonly token0: string;
  readonly token1: string;
  readonly fee: number;
  readonly tickSpacing: number;
  private _token0Balance: BN;
  private _token1Balance: BN;
  private _sqrtPriceX96: BN;
  private _tickCurrent: number;
  private _feeGrowthGlobal0X128: BN;
  private _feeGrowthGlobal1X128: BN;
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
    this.fee = fee;
    this.tickSpacing = tickSpacing;
    this._token0Balance = token0Balance;
    this._token1Balance = token1Balance;
    this._sqrtPriceX96 = sqrtPriceX96;
    this._tickCurrent = tickCurrent;
    this._feeGrowthGlobal0X128 = feeGrowthGlobal0X128;
    this._feeGrowthGlobal1X128 = feeGrowthGlobal1X128;
    this.tickManager = tickManager;
    this.positionManager = positionManager;
  }

  public get token0Balance(): BN {
    return this._token0Balance;
  }

  public get token1Balance(): BN {
    return this._token1Balance;
  }

  public get sqrtPriceX96(): BN {
    return this._sqrtPriceX96;
  }

  public get tickCurrent(): number {
    return this._tickCurrent;
  }

  public get feeGrowthGlobal0X128(): BN {
    return this._feeGrowthGlobal0X128;
  }

  public get feeGrowthGlobal1X128(): BN {
    return this._feeGrowthGlobal1X128;
  }

  initialize(sqrtPriceX96: BN) {
    // TODO
    this._tickCurrent = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    this._sqrtPriceX96 = sqrtPriceX96;
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

  getTick(tick: number): Tick {
    return this.tickManager.get(tick);
  }

  getPosition(owner: string, tickLower: number, tickUpper: number): Position {
    return this.positionManager.get(
      PositionManager.getKey(owner, tickLower, tickUpper)
    );
  }
}
