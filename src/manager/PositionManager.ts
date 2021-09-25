import { Position } from "../model/Position";
import { jsonMapMember, jsonObject } from "typedjson";

@jsonObject
export class PositionManager {
  @jsonMapMember(String, Position, { name: "positions_json" })
  private positions: Map<string, Position>;

  constructor(positions: Map<string, Position> = new Map()) {
    this.positions = positions;
  }

  static getKey(owner: string, tickLower: number, tickUpper: number): string {
    // We might need a fancier hash function here
    // but for now, I think this will do, and it's more verbose:
    return owner + "_" + tickLower.toString() + "_" + tickUpper.toString();
  }

  set(key: string, position: Position) {
    this.positions.set(key, position);
  }

  isInitialized(key: string): boolean {
    return this.positions.has(key);
  }

  clear(key: string) {
    if (this.positions.has(key)) this.positions.delete(key);
  }

  getPositionAndInitIfAbsent(key: string): Position {
    if (this.positions.has(key)) return this.positions.get(key)!;
    const newPosition = new Position();
    this.set(key, newPosition);
    return newPosition;
  }

  getPositionReadonly(
    owner: string,
    tickLower: number,
    tickUpper: number
  ): Position {
    const key = PositionManager.getKey(owner, tickLower, tickUpper);
    if (this.positions.has(key)) return this.positions.get(key)!;
    return new Position();
  }
}
