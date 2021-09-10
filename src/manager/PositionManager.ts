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
    // TODO
    return "";
  }

  set(key: string, position: Position) {
    this.positions.set(key, position);
  }

  get(key: string): Position {
    return this.positions.get(key) || new Position();
  }
}
