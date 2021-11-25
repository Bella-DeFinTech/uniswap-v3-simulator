import JSBI from "jsbi";
import { SimulationDataManager } from "../interface/SimulationDataManager";
import { PoolState } from "../model/PoolState";
import { TickManager } from "./TickManager";
import { PositionManager } from "./PositionManager";
import { Snapshot } from "../entity/Snapshot";
import { Roadmap } from "../model/Roadmap";
import { SnapshotProfile } from "../entity/SnapshotProfile";
import { PoolConfig } from "../model/PoolConfig";
import { Knex, knex as knexBuilder } from "knex";
import {
  Serializer,
  JSBISerializer,
  JSBIDeserializer,
  NumberArraySerializer,
  NumberArrayDeserializer,
} from "../util/Serializer";
import { DateConverter } from "../util/DateConverter";

const DATE_FORMAT: string = "YYYY-MM-DD HH:mm:ss.SSS";

type RoadmapRecord = {
  id: number;
  roadmapId: string;
  description: string;
  snapshots: string;
  timestamp: string;
};

type SnapshotRecord = {
  id: number;
  poolConfigId: string;
  snapshotId: string;
  description: string;
  token0Balance: string;
  token1Balance: string;
  sqrtPriceX96: string;
  liquidity: string;
  tickCurrent: number;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  tickManager: string;
  positionManager: string;
  timestamp: string;
};

type PoolConfigRecord = {
  id: number;
  poolConfigId: string;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  timestamp: string;
};

export class SQLiteSimulationDataManager implements SimulationDataManager {
  private knex: Knex;

  private constructor(dbPath: string) {
    const config: Knex.Config = {
      client: "sqlite3",
      connection: {
        filename: dbPath, //:memory:
      },
      // sqlite does not support inserting default values. Set the `useNullAsDefault` flag to hide the warning.
      useNullAsDefault: true,
    };
    this.knex = knexBuilder(config);
  }

  static async buildInstance(
    dbPath: string = ":memory:"
  ): Promise<SimulationDataManager> {
    let dbManager = new SQLiteSimulationDataManager(dbPath);
    await dbManager.initTables();
    return dbManager;
  }

  initTables(): Promise<void> {
    const knex = this.knex;
    let tasks = [
      knex.schema.hasTable("poolConfig").then((exists: boolean) =>
        !exists
          ? knex.schema.createTable(
              "poolConfig",
              function (t: Knex.TableBuilder) {
                t.increments("id").primary();
                t.string("poolConfigId", 32);
                t.string("token0", 255);
                t.string("token1", 255);
                t.integer("fee");
                t.integer("tickSpacing");
                t.text("timestamp");
              }
            )
          : Promise.resolve()
      ),
      knex.schema.hasTable("snapshot").then((exists: boolean) =>
        !exists
          ? knex.schema.createTable(
              "snapshot",
              function (t: Knex.TableBuilder) {
                t.increments("id").primary();
                t.string("snapshotId", 32);
                t.string("poolConfigId", 32);
                t.string("description", 255);
                t.string("token0Balance", 255);
                t.string("token1Balance", 255);
                t.string("sqrtPriceX96", 255);
                t.string("liquidity", 255);
                t.integer("tickCurrent");
                t.string("feeGrowthGlobal0X128", 255);
                t.string("feeGrowthGlobal1X128", 255);
                t.string("tickManager");
                t.string("positionManager");
                t.text("timestamp");
              }
            )
          : Promise.resolve()
      ),
      knex.schema.hasTable("roadmap").then((exists: boolean) =>
        !exists
          ? knex.schema.createTable("roadmap", function (t: Knex.TableBuilder) {
              t.increments("id").primary();
              t.string("roadmapId", 32);
              t.string("description", 255);
              t.string("snapshots", 255);
              t.text("timestamp");
            })
          : Promise.resolve()
      ),
    ];
    return Promise.all(tasks).then(() => Promise.resolve());
  }

  persistRoadmap(roadmap: Roadmap): Promise<number> {
    return this.knex
      .transaction((trx) =>
        this.insertRoadmap(
          roadmap.id,
          roadmap.description,
          roadmap.snapshots,
          roadmap.timestamp,
          trx
        )
      )
      .then((ids) => Promise.resolve(ids[0]));
  }

  persistSnapshot(poolState: PoolState): Promise<number> {
    let poolConfigId = poolState.poolConfig.id;
    let snapshot = poolState.snapshot!;
    return this.knex.transaction((trx) =>
      this.readPoolConfig(poolConfigId, trx)
        .then((poolConfig: PoolConfigRecord | undefined) =>
          !poolConfig
            ? this.insertPoolConfig(poolState.poolConfig, trx)
            : Promise.resolve([])
        )
        .then(() =>
          this.insertSnapshot(
            snapshot.id,
            poolConfigId,
            snapshot.description,
            snapshot.token0Balance,
            snapshot.token1Balance,
            snapshot.sqrtPriceX96,
            snapshot.liquidity,
            snapshot.tickCurrent,
            snapshot.feeGrowthGlobal0X128,
            snapshot.feeGrowthGlobal1X128,
            snapshot.tickManager,
            snapshot.positionManager,
            snapshot.timestamp,
            trx
          )
        )
        .then((ids) => Promise.resolve(ids[0]))
    );
  }

  getSnapshotProfiles(): Promise<SnapshotProfile[]> {
    return this.readSnapshotProfiles().then((rows: SnapshotRecord[]) =>
      Promise.resolve(
        rows.map((row: SnapshotRecord): SnapshotProfile => {
          return {
            id: row.snapshotId,
            description: row.description,
          };
        })
      )
    );
  }

  getSnapshots(snapshotIds: number[]): Promise<Snapshot[]> {
    let snapshotRecords: SnapshotRecord[];
    return this.readSnapshots(snapshotIds)
      .then((snapshots: SnapshotRecord[]) => {
        if (snapshots.length === 0) return Promise.reject(undefined);
        snapshotRecords = snapshots;
        return this.getPoolConfig(snapshots[0].poolConfigId);
      })
      .then((poolConfig: PoolConfig | undefined) => {
        return !poolConfig
          ? Promise.reject(
              new Error(
                "Pool config record is missing, please check your db file."
              )
            )
          : Promise.resolve(
              snapshotRecords.map((snapshot: SnapshotRecord) =>
                this.deserializeSnapshot(snapshot, poolConfig)
              )
            );
      })
      .catch((err) => (err ? Promise.reject(err) : Promise.resolve([])));
  }

  getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    let snapshotRecord: SnapshotRecord;
    return this.readSnapshot(snapshotId)
      .then((snapshot: SnapshotRecord | undefined) => {
        if (!snapshot) return Promise.reject(undefined);
        snapshotRecord = snapshot;
        return this.getPoolConfig(snapshot.poolConfigId);
      })
      .then((poolConfig: PoolConfig | undefined) =>
        !poolConfig
          ? Promise.reject(
              new Error(
                "Pool config record is missing, please check your db file."
              )
            )
          : Promise.resolve(
              this.deserializeSnapshot(snapshotRecord, poolConfig)
            )
      )
      .catch((err) => (err ? Promise.reject(err) : Promise.resolve(undefined)));
  }

  getPoolConfig(poolConfigId: string): Promise<PoolConfig | undefined> {
    return this.readPoolConfig(poolConfigId).then((res) =>
      !res
        ? Promise.resolve(undefined)
        : Promise.resolve({
            id: res.poolConfigId,
            tickSpacing: res.tickSpacing,
            token0: res.token0,
            token1: res.token1,
            fee: res.fee,
          })
    );
  }

  getRoadmap(roadmapId: string): Promise<Roadmap | undefined> {
    return this.readRoadmap(roadmapId).then((res) =>
      !res
        ? Promise.resolve(undefined)
        : Promise.resolve({
            id: res.roadmapId,
            description: res.description,
            snapshots: NumberArrayDeserializer(res.snapshots),
            timestamp: DateConverter.parseDate(res.timestamp),
          })
    );
  }

  close(): Promise<void> {
    return this.knex.destroy();
  }

  private readSnapshot(
    snapshotId: string,
    trx?: Knex.Transaction
  ): Promise<SnapshotRecord | undefined> {
    return this.getBuilderContext("snapshot", trx)
      .where("snapshotId", snapshotId)
      .first();
  }

  private readSnapshots(
    snapshotIds: number[],
    trx?: Knex.Transaction
  ): Promise<SnapshotRecord[]> {
    return this.getBuilderContext("snapshot", trx).whereIn("id", snapshotIds);
  }

  private readSnapshotProfiles(
    trx?: Knex.Transaction
  ): Promise<SnapshotRecord[]> {
    return this.getBuilderContext("snapshot", trx)
      .select("snapshotId")
      .select("description");
  }

  private insertSnapshot(
    snapshotId: string,
    poolConfigId: string,
    description: string,
    token0Balance: JSBI,
    token1Balance: JSBI,
    sqrtPriceX96: JSBI,
    liquidity: JSBI,
    tickCurrent: number,
    feeGrowthGlobal0X128: JSBI,
    feeGrowthGlobal1X128: JSBI,
    tickManager: TickManager,
    positionManager: PositionManager,
    timestamp: Date,
    trx?: Knex.Transaction
  ): Promise<Array<number>> {
    return this.getBuilderContext("snapshot", trx).insert([
      {
        snapshotId,
        poolConfigId,
        description,
        token0Balance: JSBISerializer(token0Balance),
        token1Balance: JSBISerializer(token1Balance),
        sqrtPriceX96: JSBISerializer(sqrtPriceX96),
        liquidity: JSBISerializer(liquidity),
        tickCurrent,
        feeGrowthGlobal0X128: JSBISerializer(feeGrowthGlobal0X128),
        feeGrowthGlobal1X128: JSBISerializer(feeGrowthGlobal1X128),
        tickManager: Serializer.serialize(TickManager, tickManager),
        positionManager: Serializer.serialize(PositionManager, positionManager),
        timestamp: DateConverter.formatDate(timestamp, DATE_FORMAT),
      },
    ]);
  }

  private insertRoadmap(
    roadmapId: string,
    description: string,
    snapshots: number[],
    timestamp: Date,
    trx?: Knex.Transaction
  ): Promise<Array<number>> {
    return this.getBuilderContext("roadmap", trx).insert([
      {
        roadmapId,
        description,
        snapshots: NumberArraySerializer(snapshots),
        timestamp: DateConverter.formatDate(timestamp, DATE_FORMAT),
      },
    ]);
  }

  private readRoadmap(
    roadmapId: string,
    trx?: Knex.Transaction
  ): Promise<RoadmapRecord | undefined> {
    return this.getBuilderContext("roadmap", trx)
      .where("roadmapId", roadmapId)
      .first();
  }

  private readPoolConfig(
    poolConfigId: string,
    trx?: Knex.Transaction
  ): Promise<PoolConfigRecord | undefined> {
    return this.getBuilderContext("poolConfig", trx)
      .where("poolConfigId", poolConfigId)
      .first();
  }

  private insertPoolConfig(
    poolConfig: PoolConfig,
    trx?: Knex.Transaction
  ): Promise<Array<number>> {
    return this.getBuilderContext("poolConfig", trx).insert([
      {
        poolConfigId: poolConfig.id,
        token0: poolConfig.token0,
        token1: poolConfig.token1,
        fee: poolConfig.fee,
        tickSpacing: poolConfig.tickSpacing,
        timestamp: DateConverter.formatDate(new Date(), DATE_FORMAT),
      },
    ]);
  }

  private deserializeSnapshot(
    snapshot: SnapshotRecord,
    poolConfig: PoolConfig
  ) {
    return {
      id: snapshot.snapshotId,
      description: snapshot.description,
      poolConfig,
      token0Balance: JSBIDeserializer(snapshot.token0Balance),
      token1Balance: JSBIDeserializer(snapshot.token1Balance),
      sqrtPriceX96: JSBIDeserializer(snapshot.sqrtPriceX96),
      liquidity: JSBIDeserializer(snapshot.liquidity),
      tickCurrent: snapshot.tickCurrent,
      feeGrowthGlobal0X128: JSBIDeserializer(snapshot.feeGrowthGlobal0X128),
      feeGrowthGlobal1X128: JSBIDeserializer(snapshot.feeGrowthGlobal1X128),
      tickManager: Serializer.deserialize(TickManager, snapshot.tickManager),
      positionManager: Serializer.deserialize(
        PositionManager,
        snapshot.positionManager
      ),
      timestamp: DateConverter.parseDate(snapshot.timestamp),
    };
  }

  private getBuilderContext(
    tableName: string,
    trx?: Knex.Transaction
  ): Knex.QueryBuilder {
    return trx ? trx(tableName) : this.knex(tableName);
  }
}
