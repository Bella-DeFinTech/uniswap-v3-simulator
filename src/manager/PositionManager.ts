import { Position } from "../model/Position";
import { jsonMapMember, jsonObject } from "typedjson";
import JSBI from "jsbi";
import assert from "assert";
import { ZERO } from "../enum/InternalConstants";
import { PositionView } from "../interface/PositionView";

@jsonObject
export class PositionManager {
  @jsonMapMember(String, Position, { name: "positions_json" })
  private positions: Map<string, Position>;

  // private owner_positions: Map<string, Map<string, Position>>;

  constructor(positions: Map<string, Position> = new Map()) {
    this.positions = positions;
    // this.owner_positions = new Map();
  }

  static getKey(owner: string, tickLower: number, tickUpper: number): string {
    // We might need a fancier hash function here
    // but for now, I think this will do, and it's more verbose:
    return owner + "_" + tickLower.toString() + "_" + tickUpper.toString();
  }

  static extractFromKey(key: string): {
    owner: string;
    tickLower: number;
    tickUpper: number;
  } {
    const [owner, tickLower, tickUpper] = key.split("_");
    return {
      owner: owner,
      tickLower: parseInt(tickLower),
      tickUpper: parseInt(tickUpper),
    };
  }

  set(owner: string, key: string, position: Position) {
    this.positions.set(key, position);

    // if (!this.owner_positions.has(owner)) {
    //   this.owner_positions.set(owner, new Map());
    // }
    // this.owner_positions.get(owner)!.set(key, position);
  }

  clear(key: string) {
    if (this.positions.has(key)) this.positions.delete(key);
  }

  // getPositionsByOwner(owner: string): Map<string, Position> {
  //   if (!this.owner_positions.has(owner)) {
  //     this.owner_positions.set(owner, new Map());
  //   }
  //   return this.owner_positions.get(owner)!;
  // }

  getPositionAndInitIfAbsent(
    owner: string,
    tickLower: number,
    tickUpper: number
  ): Position {
    const key = PositionManager.getKey(owner, tickLower, tickUpper);
    if (this.positions.has(key)) return this.positions.get(key)!;
    const newPosition = new Position();
    this.set(owner, key, newPosition);
    return newPosition;
  }

  getPositionReadonly(
    owner: string,
    tickLower: number,
    tickUpper: number
  ): PositionView {
    const key = PositionManager.getKey(owner, tickLower, tickUpper);
    if (this.positions.has(key)) return this.positions.get(key)!;
    return new Position();
  }

  collectPosition(
    owner: string,
    tickLower: number,
    tickUpper: number,
    amount0Requested: JSBI,
    amount1Requested: JSBI
  ): { amount0: JSBI; amount1: JSBI } {
    assert(
      JSBI.greaterThanOrEqual(amount0Requested, ZERO) &&
        JSBI.greaterThanOrEqual(amount1Requested, ZERO),
      "amounts requested should be positive"
    );
    const key = PositionManager.getKey(owner, tickLower, tickUpper);
    if (this.positions.has(key)) {
      const positionToCollect = this.positions.get(key)!;
      const amount0 = JSBI.greaterThan(
        amount0Requested,
        positionToCollect.tokensOwed0
      )
        ? positionToCollect.tokensOwed0
        : amount0Requested;
      const amount1 = JSBI.greaterThan(
        amount1Requested,
        positionToCollect.tokensOwed1
      )
        ? positionToCollect.tokensOwed1
        : amount1Requested;
      if (JSBI.greaterThan(amount0, ZERO) || JSBI.greaterThan(amount1, ZERO)) {
        positionToCollect.updateBurn(
          JSBI.subtract(positionToCollect.tokensOwed0, amount0),
          JSBI.subtract(positionToCollect.tokensOwed1, amount1)
        );
        if (positionToCollect.isEmpty()) this.clear(key);
      }
      return { amount0: amount0, amount1: amount1 };
    }
    return { amount0: ZERO, amount1: ZERO };
  }
}
