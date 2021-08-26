import JSBI from "jsbi";
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
  private _token0Balance: JSBI;
  private _token1Balance: JSBI;
  private _sqrtPriceX96: JSBI;
  private _tickCurrent: number;
  private _feeGrowthGlobal0X128: JSBI;
  private _feeGrowthGlobal1X128: JSBI;
  private tickManager: TickManager;
  private positionManager: PositionManager;

  constructor(
    token0: string,
    token1: string,
    fee: number,
    tickSpacing: number,
    token0Balance: JSBI = JSBI.BigInt(0),
    token1Balance: JSBI = JSBI.BigInt(0),
    sqrtPriceX96: JSBI = JSBI.BigInt(0),
    tickCurrent: number = 0,
    feeGrowthGlobal0X128: JSBI = JSBI.BigInt(0),
    feeGrowthGlobal1X128: JSBI = JSBI.BigInt(0),
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

  public get token0Balance(): JSBI {
    return this._token0Balance;
  }

  public get token1Balance(): JSBI {
    return this._token1Balance;
  }

  public get sqrtPriceX96(): JSBI {
    return this._sqrtPriceX96;
  }

  public get tickCurrent(): number {
    return this._tickCurrent;
  }

  public get feeGrowthGlobal0X128(): JSBI {
    return this._feeGrowthGlobal0X128;
  }

  public get feeGrowthGlobal1X128(): JSBI {
    return this._feeGrowthGlobal1X128;
  }

  initialize(sqrtPriceX96: JSBI) {
    // TODO
    this._tickCurrent = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    this._sqrtPriceX96 = sqrtPriceX96;
  }

  mint(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    // TODO
    return {
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
  }

  burn(
    owner: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    // TODO
    return {
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
  }

  collect(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount0Requested: JSBI,
    amount1Requested: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    // TODO
    return {
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
  }

  swap(
    zeroForOne: boolean,
    amountSpecified: JSBI,
    sqrtPriceLimitX96: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    // TODO
    return {
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
  }

  private modifyPosition(
    owner: string,
    tickLower: number,
    tickUpper: number,
    liquidityDelta: JSBI
  ): { position: Position; amount0: JSBI; amount1: JSBI } {
    // check ticks
    if(tickLower > tickUpper){
      console.error('tickLower upper than tickUpper')
    }
    else if(tickLower < TickMath.MIN_TICK){
      console.error('[Error]: tickLower lower than MIN_TICK')
    }
    else if(tickUpper > TickMath.MAX_TICK){
      console.error('[Error]: tickUpper bigger than MAX_TICK')
    }
    else{
      // check ticks pass, update position
      this.updatePosition(owner, tickLower, tickUpper, liquidityDelta)

      // check if liquidity happen add() or remove()
      if(liquidityDelta !== JSBI.BigInt(0)){
        
      }
    }
    
    return {
      position: new Position(),
      amount0: JSBI.BigInt(0),
      amount1: JSBI.BigInt(0),
    };
  }

  private updatePosition(
    owner: string,
    tickLower: number,
    tickUpper: number,
    liquidityDelta: JSBI
  ): Position {
    // TODO
    return new Position();
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
