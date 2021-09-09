import { PoolState } from "./PoolState";
import { Record } from "../entity/Record";
import { Visitable } from "../interface/Visitable";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";

export class Transition implements Visitable {
  private _source: PoolState;
  private _target: PoolState | undefined;
  private _record: Record;

  public get source(): PoolState {
    return this._source;
  }

  public get target(): PoolState | undefined {
    return this._target;
  }

  public get record(): Record {
    return this._record;
  }
  public set target(value: PoolState | undefined) {
    this._target = value;
  }

  constructor(source: PoolState, record: Record) {
    this._source = source;
    this._record = record;
  }

  accept(visitor: SimulatorVisitor): Promise<string> {
    return visitor.visitOnTransition(this);
  }

  toString(): string {
    return `
      Transition:
          sourcePoolStateId: ${this.source.id}
          targetPoolStateId: ${(this.target as PoolState).id}
      Record: 
          id: ${this.record.id}
          actionType: ${this.record.actionType}
          actionParams: ${this.record.actionParams}
          actionReturnValues: ${this.record.actionReturnValues}
          timestamp: ${this.record.timestamp}
    `;
  }
}
