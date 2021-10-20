import { PoolState } from "./PoolState";
import { Record } from "../entity/Record";
import { Visitable } from "../interface/Visitable";
import { SimulatorVisitor } from "../interface/SimulatorVisitor";
import { Transition as TransitionView } from "../interface/Transition";
import { PoolStateView } from "../interface/PoolStateView";
import { printParams } from "../util/Serializer";

export class Transition implements Visitable, TransitionView {
  private _source: PoolState;
  private _target: PoolState | undefined;
  private _record: Record;

  public get source(): PoolState {
    return this._source;
  }

  public get target(): PoolState | undefined {
    return this._target;
  }

  public set target(value: PoolState | undefined) {
    this._target = value;
  }

  public get record(): Record {
    return this._record;
  }

  constructor(source: PoolState, record: Record) {
    this._source = source;
    this._record = record;
  }

  getSource(): PoolStateView {
    return this.source;
  }

  getTarget(): PoolStateView {
    return this.target!;
  }

  getRecord(): Record {
    return this.record;
  }

  accept(visitor: SimulatorVisitor): Promise<string> {
    return visitor.visitTransition(this);
  }

  toString(): string {
    return `
    Transition:
        sourcePoolStateId: ${this.source.id}
        targetPoolStateId: ${this.target!.id}
    Record: 
        id: ${this.record.id}
        actionType: ${this.record.actionType}
        actionParams: ${printParams(this.record.actionParams)}
        actionReturnValues: ${printParams(this.record.actionReturnValues)}
        timestamp: ${this.record.timestamp}
    `;
  }
}
