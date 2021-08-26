import JSBI from "jsbi";
import { PoolState } from "../model/PoolState";
import { TickManager } from "./TickManager";
import { PositionManager } from "./PositionManager";
import { Snapshot } from "../entity/Snapshot";
import { SnapshotProfile } from "../entity/SnapshotProfile";
import { PoolConfig } from "../entity/PoolConfig";
import sqlite3, { Database, RunResult } from "sqlite3";
import {
  Serializer,
  JSBISerializer,
  JSBIDeserializer,
} from "../util/Serializer";
import { DateConverter } from "../util/DateConverter";

sqlite3.verbose();
const DATE_FORMAT: string = "YYYY-MM-DD HH:mm:ss.SSS";

export class DBManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  static async buildInstance(dbPath: string): Promise<DBManager> {
    let dbManager = new DBManager(new sqlite3.Database(dbPath)); //:memory:
    await dbManager.initTables();
    return dbManager;
  }

  private initTables() {
    return Promise.all([
      new Promise((resolve, reject) => {
        this.db.run(
          "CREATE TABLE IF NOT EXISTS snapshot(\
            id INTEGER PRIMARY KEY AUTOINCREMENT,\
            snapshotId VARCHAR(32),\
            poolConfigId VARCHAR(32),\
            description VARCHAR(255),\
            token0Balance VARCHAR(255),\
            token1Balance VARCHAR(255),\
            sqrtPriceX96 VARCHAR(255),\
            liquidity VARCHAR(255),\
            tickCurrent INTEGER,\
            feeGrowthGlobal0X128 VARCHAR(255),\
            feeGrowthGlobal1X128 VARCHAR(255),\
            tickManager VARCHAR(255),\
            positionManager VARCHAR(255),\
            timestamp TEXT\
          );",
          [],
          function (error: Error, results: RunResult) {
            if (error) reject(error);
            resolve(results);
          }
        );
      }),
      new Promise((resolve, reject) => {
        this.db.run(
          "CREATE TABLE IF NOT EXISTS poolConfig(\
            id INTEGER PRIMARY KEY AUTOINCREMENT,\
            poolConfigId VARCHAR(32),\
            token0 VARCHAR(255),\
            token1 VARCHAR(255),\
            fee INTEGER,\
            tickSpacing INTEGER,\
            timestamp TEXT\
          );",
          [],
          function (error: Error, results: RunResult) {
            if (error) reject(error);
            resolve(results);
          }
        );
      }),
    ]);
  }

  persistSnapshot(poolState: PoolState): Promise<RunResult> {
    let poolConfigId = poolState.poolConfig.id;
    let snapshot = <Snapshot>poolState.snapshot;
    return this.runWithTransaction(
      this.readPoolConfig(poolConfigId)
        .then((poolConfig: PoolConfig) => {
          if (poolConfig === undefined)
            this.insertPoolConfig(poolState.poolConfig);
        })
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
            snapshot.timestamp
          )
        )
    );
  }

  getSnapshotProfiles(): Promise<SnapshotProfile[]> {
    return this.readSnapshotProfiles().then((rows: any[]) =>
      Promise.resolve(
        rows.map((row: any): SnapshotProfile => {
          return {
            id: row.snapshotId,
            description: row.description,
          };
        })
      )
    );
  }

  getSnapshot(snapshotId: string): Promise<Snapshot> {
    let snapshotResult: {
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
    return this.readSnapshot(snapshotId)
      .then((snapshot) => {
        snapshotResult = snapshot;
        return this.getPoolConfig(snapshotResult.poolConfigId);
      })
      .then((poolConfig: PoolConfig) =>
        Promise.resolve({
          id: snapshotResult.snapshotId,
          description: snapshotResult.description,
          poolConfig: poolConfig,
          token0Balance: JSBIDeserializer(snapshotResult.token0Balance),
          token1Balance: JSBIDeserializer(snapshotResult.token1Balance),
          sqrtPriceX96: JSBIDeserializer(snapshotResult.sqrtPriceX96),
          liquidity: JSBIDeserializer(snapshotResult.liquidity),
          tickCurrent: snapshotResult.tickCurrent,
          feeGrowthGlobal0X128: JSBIDeserializer(
            snapshotResult.feeGrowthGlobal0X128
          ),
          feeGrowthGlobal1X128: JSBIDeserializer(
            snapshotResult.feeGrowthGlobal1X128
          ),
          tickManager: <TickManager>(
            Serializer.deserialize(TickManager, snapshotResult.tickManager)
          ),
          positionManager: <PositionManager>(
            Serializer.deserialize(
              PositionManager,
              snapshotResult.positionManager
            )
          ),
          timestamp: DateConverter.parseDate(snapshotResult.timestamp),
        })
      );
  }

  getPoolConfig(poolConfigId: string): Promise<PoolConfig> {
    return this.readPoolConfig(poolConfigId).then((res) =>
      Promise.resolve({
        id: res.poolConfigId,
        tickSpacing: res.tickSpacing,
        token0: res.token0,
        token1: res.token1,
        fee: res.fee,
      })
    );
  }

  close() {
    this.db.close();
  }

  private readSnapshot(snapshotId: string): Promise<any> {
    return this.get("SELECT * FROM snapshot WHERE snapshotId = ?", [
      snapshotId,
    ]);
  }

  private readSnapshotProfiles(): Promise<any[]> {
    return this.all("SELECT snapshotId, description FROM snapshot", []);
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
    timestamp: Date
  ): Promise<RunResult> {
    return this.run(
      "INSERT INTO snapshot(\
      snapshotId, poolConfigId, description, token0Balance, token1Balance, sqrtPriceX96, liquidity, tickCurrent, \
      feeGrowthGlobal0X128, feeGrowthGlobal1X128, tickManager, positionManager, timestamp) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        snapshotId,
        poolConfigId,
        description,
        JSBISerializer(token0Balance),
        JSBISerializer(token1Balance),
        JSBISerializer(sqrtPriceX96),
        JSBISerializer(liquidity),
        tickCurrent,
        JSBISerializer(feeGrowthGlobal0X128),
        JSBISerializer(feeGrowthGlobal1X128),
        Serializer.serialize(TickManager, tickManager),
        Serializer.serialize(PositionManager, positionManager),
        DateConverter.formatDate(timestamp, DATE_FORMAT),
      ]
    );
  }

  private readPoolConfig(poolConfigId: string): Promise<any> {
    return this.get("SELECT * FROM poolConfig WHERE poolConfigId = ?", [
      poolConfigId,
    ]);
  }

  private insertPoolConfig(poolConfig: PoolConfig): Promise<RunResult> {
    return this.run(
      "INSERT INTO poolConfig(poolConfigId, token0, token1, fee, tickSpacing, timestamp) VALUES(?,?,?,?,?,?)",
      [
        poolConfig.id,
        poolConfig.token0,
        poolConfig.token1,
        poolConfig.fee,
        poolConfig.tickSpacing,
        DateConverter.formatDate(new Date(), DATE_FORMAT),
      ]
    );
  }

  private startTransaction(): Promise<RunResult> {
    return this.run("BEGIN TRANSACTION;", []);
  }

  private commit(): Promise<RunResult> {
    return this.run("COMMIT;", []);
  }

  private rollback(): Promise<RunResult> {
    return this.run("ROLLBACK;", []);
  }

  private runWithTransaction(chain: Promise<RunResult>): Promise<RunResult> {
    let result: RunResult;
    let error: Error;
    return this.startTransaction()
      .then(() => chain)
      .then((runResult) => {
        result = runResult;
        return this.commit();
      })
      .catch((err: Error) => {
        error = err;
        return this.rollback();
      })
      .then(() => {
        if (error) throw error;
        else return Promise.resolve(result);
      });
  }

  private run(sql: string, params: any): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: RunResult, error: Error) {
        if (error) reject(error);
        resolve(this);
      });
    });
  }

  private get(sql: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, function (error: Error, row: any) {
        if (error) reject(error);
        resolve(row);
      });
    });
  }

  private all(sql: string, params: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, function (error: Error, rows: any[]) {
        if (error) reject(error);
        resolve(rows);
      });
    });
  }
}
