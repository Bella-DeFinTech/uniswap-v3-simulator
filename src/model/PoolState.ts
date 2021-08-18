import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { PoolConfig } from "../entity/PoolConfig";
import { Record } from "../entity/Record";
import { Snapshot } from "../entity/Snapshot";
import { DBManager } from "../manager/DBManager";

export class PoolState {
  readonly id: string = "0";
  readonly baseSnapshot: Snapshot | undefined;
  private _snapshot: Snapshot | undefined;
  readonly poolConfig: PoolConfig;
  readonly records: Record[] = new Array<Record>();
  readonly timestamp: Date = new Date();

  constructor(poolConfig?: PoolConfig, baseSnapshot?: Snapshot) {
    if (!poolConfig && !baseSnapshot) {
      throw new Error(
        "Please give at least a PoolConfig or a Snapshot from past persistence!"
      );
    }
    this.poolConfig = baseSnapshot
      ? baseSnapshot.poolConfig
      : <PoolConfig>poolConfig;
    this.baseSnapshot = baseSnapshot;
  }

  public get snapshot(): Snapshot | undefined {
    return this._snapshot;
  }

  static from(id: string): PoolState {
    // TODO
    let baseSnapshot = DBManager.readSnapshot(id);
    return new PoolState(undefined, baseSnapshot);
  }

  persist(configurableCorePool: ConfigurableCorePool): string {
    // TODO
    return "0";
  }

  hasSnapshot(): boolean {
    return this.snapshot !== undefined;
  }

  hasBaseSnapshot(): boolean {
    return this.baseSnapshot !== undefined;
  }

  pushRecord() {}

  popRecord() {}
}
