import { Position } from "../model/Position";
import { jsonMapMember, jsonObject } from "typedjson";

@jsonObject
export class PositionManager {
  @jsonMapMember(String, Position, { name: "positions_json" })
  private positions: Map<string, Position>;

  constructor(positions: Map<string, Position> = new Map()) {
    this.positions = positions;
  }

  get(owner: string, tickLower: number, tickUpper: number): Position {
    // TODO
    return new Position();
  }

  set(owner: string, tickLower: number, tickUpper: number) {
    // TODO
  }

  setKey(key: string, position: Position) {
    this.positions.set(key, position);
  }

  getKey(key: string): Position {
    return this.positions.get(key) || new Position();
  }
}
