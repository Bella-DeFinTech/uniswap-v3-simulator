import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { PoolConfig } from "../entity/PoolConfig";
import { Record } from "../entity/Record";
import { Snapshot } from "../entity/Snapshot";
import { ONE } from "../enum/InternalConstants";
import { DBManager } from "../manager/DBManager";
import { PositionManager } from "../manager/PositionManager";
import { TickManager } from "../manager/TickManager";

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

  static async from(id: string): Promise<PoolState> {
    // TODO
    let dbManager = await DBManager.buildInstance(":memory:");
    let baseSnapshot = await dbManager.getSnapshot(id);
    return Promise.resolve(new PoolState(undefined, baseSnapshot));
  }

  takeSnapshot() {
    // TODO
    this._snapshot = {
      id: "123",
      description: "test",
      poolConfig: this.poolConfig,
      token0Balance: ONE,
      token1Balance: ONE,
      sqrtPriceX96: ONE,
      liquidity: ONE,
      tickCurrent: 10,
      feeGrowthGlobal0X128: ONE,
      feeGrowthGlobal1X128: ONE,
      tickManager: new TickManager(),
      positionManager: new PositionManager(),
      timestamp: new Date(),
    };
  }

  persist(configurableCorePool: ConfigurableCorePool): string {
    // TODO
    return "123";
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
