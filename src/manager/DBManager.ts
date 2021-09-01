import JSBI from "jsbi";
import { PoolState } from "../model/PoolState";
import { TickManager } from "./TickManager";
import { PositionManager } from "./PositionManager";
import { Snapshot } from "../entity/Snapshot";
import { SnapshotProfile } from "../entity/SnapshotProfile";
import { PoolConfig } from "../entity/PoolConfig";
import { Knex, knex as knexBuilder } from "knex";
import {
  Serializer,
  JSBISerializer,
  JSBIDeserializer,
} from "../util/Serializer";
import { DateConverter } from "../util/DateConverter";

const DATE_FORMAT: string = "YYYY-MM-DD HH:mm:ss.SSS";

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

export class DBManager {
  private knex: Knex;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  static async buildInstance(dbPath: string): Promise<DBManager> {
    const config: Knex.Config = {
      client: "sqlite3",
      connection: {
        filename: dbPath, //:memory:
      },
      // sqlite does not support inserting default values. Set the `useNullAsDefault` flag to hide the warning.
      useNullAsDefault: true,
    };
    let dbManager = new DBManager(knexBuilder(config));
    await dbManager.initTables();
    return dbManager;
  }

  private initTables() {
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
    ];
    return Promise.all(tasks);
  }

  persistSnapshot(poolState: PoolState): Promise<Array<number>> {
    let poolConfigId = poolState.poolConfig.id;
    let snapshot = <Snapshot>poolState.snapshot;
    return this.knex.transaction((trx) =>
      this.readPoolConfig(poolConfigId, trx).then(
        (poolConfig: PoolConfigRecord | undefined) =>
          (!poolConfig
            ? this.insertPoolConfig(poolState.poolConfig, trx)
            : Promise.resolve([])
          ).then(() =>
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
      )
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

  getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    return this.readSnapshot(snapshotId).then(
      (snapshot: SnapshotRecord | undefined) =>
        !snapshot
          ? Promise.resolve(undefined)
          : this.getPoolConfig(snapshot.poolConfigId).then(
              (poolConfig: PoolConfig | undefined) =>
                !poolConfig
                  ? Promise.reject(new Error("PoolConfig is of shortage!"))
                  : Promise.resolve({
                      id: snapshot.snapshotId,
                      description: snapshot.description,
                      poolConfig: <PoolConfig>poolConfig,
                      token0Balance: JSBIDeserializer(snapshot.token0Balance),
                      token1Balance: JSBIDeserializer(snapshot.token1Balance),
                      sqrtPriceX96: JSBIDeserializer(snapshot.sqrtPriceX96),
                      liquidity: JSBIDeserializer(snapshot.liquidity),
                      tickCurrent: snapshot.tickCurrent,
                      feeGrowthGlobal0X128: JSBIDeserializer(
                        snapshot.feeGrowthGlobal0X128
                      ),
                      feeGrowthGlobal1X128: JSBIDeserializer(
                        snapshot.feeGrowthGlobal1X128
                      ),
                      tickManager: <TickManager>(
                        Serializer.deserialize(
                          TickManager,
                          snapshot.tickManager
                        )
                      ),
                      positionManager: <PositionManager>(
                        Serializer.deserialize(
                          PositionManager,
                          snapshot.positionManager
                        )
                      ),
                      timestamp: DateConverter.parseDate(snapshot.timestamp),
                    })
            )
    );
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

  private getBuilderContext(
    tableName: string,
    trx?: Knex.Transaction
  ): Knex.QueryBuilder {
    return trx ? trx(tableName) : this.knex(tableName);
  }
}
