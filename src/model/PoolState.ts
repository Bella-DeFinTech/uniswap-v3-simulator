import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { PoolConfig } from "../entity/PoolConfig";
import { Record } from "../entity/Record";
import { Snapshot } from "../entity/Snapshot";
import { DBManager } from "../managers/DBManager";

export class PoolState {
  id: string = "0";
  baseSnapshot: Snapshot | null;
  snapshot: Snapshot | null = null;
  poolConfig: PoolConfig;
  records: Record[] = new Array<Record>();
  timestamp: Date = new Date();

  constructor(baseSnapshot: Snapshot | null = null, poolConfig: PoolConfig) {
    this.baseSnapshot = baseSnapshot;
    this.poolConfig = poolConfig;
  }

  static from(id: string): PoolState {
    // TODO
    let baseSnapshot = DBManager.readSnapshot(id);
    return new PoolState(baseSnapshot, baseSnapshot.poolConfig);
  }

  private persist(configurableCorePool: ConfigurableCorePool): string {
    // TODO
    return "0";
  }

  hasSnapshot(): boolean {
    return this.snapshot !== null;
  }

  hasBaseSnapshot(): boolean {
    return this.baseSnapshot !== null;
  }
}
