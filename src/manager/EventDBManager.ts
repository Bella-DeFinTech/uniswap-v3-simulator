import { Knex, knex as knexBuilder } from "knex";
import { JSBIDeserializer } from "../util/Serializer";
import { LiquidityEvent } from "../entity/LiquidityEvent";
import { SwapEvent } from "../entity/SwapEvent";
import { DateConverter } from "../util/DateConverter";
import { EventType } from "../enum/EventType";
import { PoolConfig } from "../model/PoolConfig";
import { ZERO } from "../enum/InternalConstants";
import JSBI from "jsbi";

const DATE_FORMAT: string = "YYYY-MM-DD HH:mm:ss";

type LiquidityEventRecord = {
  id: number;
  type: number;
  msg_sender: string;
  recipient: string;
  liquidity: string;
  amount0: string;
  amount1: string;
  tick_lower: number;
  tick_upper: number;
  block_number: number;
  transaction_index: number;
  log_index: number;
  date: string;
};

type SwapEventRecord = {
  id: number;
  msg_sender: string;
  recipient: string;
  amount0: string;
  amount1: string;
  amount_specified: string;
  sqrt_price_x96: string;
  liquidity: string;
  tick: number;
  block_number: number;
  transaction_index: number;
  log_index: number;
  date: string;
};

type PoolConfigRecord = {
  id: number;
  pool_config_id: string;
  token0: string;
  token1: string;
  fee: number;
  tick_spacing: number;
  initial_sqrt_price_X96: string;
  initialization_event_block_number: number;
  latest_event_block_number: number;
  timestamp: string;
};

export class EventDBManager {
  private knex: Knex;

  private constructor(dbPath: string) {
    const config: Knex.Config = {
      client: "sqlite3",
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    };
    this.knex = knexBuilder(config);
  }

  static async buildInstance(
    dbPath: string = ":memory:"
  ): Promise<EventDBManager> {
    let dbManager = new EventDBManager(dbPath);
    await dbManager.initTables();
    return dbManager;
  }

  initTables(): Promise<void> {
    const knex = this.knex;
    let tasks = [
      knex.schema.hasTable("pool_config").then((exists: boolean) =>
        !exists
          ? knex.schema.createTable(
              "pool_config",
              function (t: Knex.TableBuilder) {
                t.increments("id").primary();
                t.string("pool_config_id", 32);
                t.string("token0", 255);
                t.string("token1", 255);
                t.integer("fee");
                t.integer("tick_spacing");
                t.string("initial_sqrt_price_X96", 255);
                t.integer("initialization_event_block_number");
                t.integer("latest_event_block_number");
                t.text("timestamp");
              }
            )
          : Promise.resolve()
      ),
      knex.schema.hasTable("liquidity_events").then((exists: boolean) =>
        !exists
          ? knex.schema.createTable(
              "liquidity_events",
              function (t: Knex.TableBuilder) {
                t.increments("id").primary();
                t.integer("type");
                t.string("msg_sender", 255);
                t.string("recipient", 255);
                t.string("liquidity", 255);
                t.string("amount0", 255);
                t.string("amount1", 255);
                t.integer("tick_lower");
                t.integer("tick_upper");
                t.integer("block_number");
                t.integer("transaction_index");
                t.integer("log_index");
                t.text("date");
                t.index(["type", "block_number"]);
                t.index(["type", "date"]);
              }
            )
          : Promise.resolve()
      ),
      knex.schema.hasTable("swap_events").then((exists: boolean) =>
        !exists
          ? knex.schema.createTable(
              "swap_events",
              function (t: Knex.TableBuilder) {
                t.increments("id").primary();
                t.string("msg_sender", 255);
                t.string("recipient", 255);
                t.string("amount0", 255);
                t.string("amount1", 255);
                t.string("amount_specified", 255);
                t.string("sqrt_price_x96", 255);
                t.string("liquidity", 255);
                t.integer("tick");
                t.integer("block_number");
                t.integer("transaction_index");
                t.integer("log_index");
                t.text("date");
                t.index(["block_number"]);
                t.index(["date"]);
              }
            )
          : Promise.resolve()
      ),
    ];
    return Promise.all(tasks).then(() => Promise.resolve());
  }

  getPoolConfig(): Promise<PoolConfig | undefined> {
    return this.readPoolConfig().then((res) =>
      !res
        ? Promise.resolve(undefined)
        : Promise.resolve({
            id: res.pool_config_id,
            tickSpacing: res.tick_spacing,
            token0: res.token0,
            token1: res.token1,
            fee: res.fee,
          })
    );
  }

  getInitializationEventBlockNumber(): Promise<number> {
    return this.readPoolConfig().then((res) =>
      !res
        ? Promise.resolve(0)
        : Promise.resolve(
            null == res.initialization_event_block_number
              ? 0
              : res.initialization_event_block_number
          )
    );
  }

  getLatestEventBlockNumber(): Promise<number> {
    return this.readPoolConfig().then((res) =>
      !res ? Promise.resolve(0) : Promise.resolve(res.latest_event_block_number)
    );
  }

  getInitialSqrtPriceX96(): Promise<JSBI> {
    return this.readPoolConfig().then((res) =>
      !res
        ? Promise.resolve(ZERO)
        : Promise.resolve(
            null == res.initial_sqrt_price_X96
              ? ZERO
              : JSBI.BigInt(res.initial_sqrt_price_X96)
          )
    );
  }

  getLiquidityEventsByDate(
    type: number,
    startDate: string,
    endDate: string
  ): Promise<LiquidityEvent[]> {
    return this.queryLiquidityEventsByDate(type, startDate, endDate).then(
      (rows: LiquidityEventRecord[]) =>
        Promise.resolve(
          rows.map(
            (row: LiquidityEventRecord): LiquidityEvent =>
              this.deserializeLiquidityEvent(row)
          )
        )
    );
  }

  getSwapEventsByDate(
    startDate: string,
    endDate: string
  ): Promise<SwapEvent[]> {
    return this.querySwapEventsByDate(startDate, endDate).then(
      (rows: SwapEventRecord[]) =>
        Promise.resolve(
          rows.map(
            (row: SwapEventRecord): SwapEvent => this.deserializeSwapEvent(row)
          )
        )
    );
  }

  getLiquidityEventsByBlockNumber(
    type: number,
    fromBlock: number,
    toBlock: number
  ): Promise<LiquidityEvent[]> {
    return this.queryLiquidityEventsByBlockNumber(
      type,
      fromBlock,
      toBlock
    ).then((rows: LiquidityEventRecord[]) =>
      Promise.resolve(
        rows.map(
          (row: LiquidityEventRecord): LiquidityEvent =>
            this.deserializeLiquidityEvent(row)
        )
      )
    );
  }

  deleteLiquidityEventsByBlockNumber(
    type: number,
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    return this.knex.transaction((trx) =>
      this.getBuilderContext("liquidity_events", trx)
        .where("type", type)
        .andWhere("block_number", ">=", fromBlock)
        .andWhere("block_number", "<=", toBlock)
        .del()
    );
  }

  getSwapEventsByBlockNumber(
    fromBlock: number,
    toBlock: number
  ): Promise<SwapEvent[]> {
    return this.querySwapEventsByBlockNumber(fromBlock, toBlock).then(
      (rows: SwapEventRecord[]) =>
        Promise.resolve(
          rows.map(
            (row: SwapEventRecord): SwapEvent => this.deserializeSwapEvent(row)
          )
        )
    );
  }

  deleteSwapEventsByBlockNumber(
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    return this.knex.transaction((trx) =>
      this.getBuilderContext("swap_events", trx)
        .andWhere("block_number", ">=", fromBlock)
        .andWhere("block_number", "<=", toBlock)
        .del()
    );
  }

  addPoolConfig(poolConfig: PoolConfig) {
    return this.knex.transaction((trx) =>
      this.insertPoolConfig(poolConfig, trx).then((ids) =>
        Promise.resolve(ids[0])
      )
    );
  }

  addAmountSpecified(id: number, amountSpecified: string): Promise<number> {
    return this.knex.transaction((trx) =>
      this.updateAmountSpecified(id, amountSpecified, trx).then((ids) =>
        Promise.resolve(ids[0])
      )
    );
  }

  addInitialSqrtPriceX96(initialSqrtPriceX96: string): Promise<number> {
    return this.knex.transaction((trx) =>
      this.updateInitialSqrtPriceX96(initialSqrtPriceX96, trx).then((ids) =>
        Promise.resolve(ids[0])
      )
    );
  }

  saveLatestEventBlockNumber(latestEventBlockNumber: number): Promise<number> {
    return this.knex.transaction((trx) =>
      this.updateLatestEventBlockNumber(latestEventBlockNumber, trx).then(
        (id) => Promise.resolve(id)
      )
    );
  }

  saveInitializationEventBlockNumber(
    initializationEventBlockNumber: number
  ): Promise<number> {
    return this.knex.transaction((trx) =>
      this.updateInitializationEventBlockNumber(
        initializationEventBlockNumber,
        trx
      ).then((id) => Promise.resolve(id))
    );
  }

  insertLiquidityEvent(
    type: number,
    msg_sender: string,
    recipient: string,
    liquidity: string,
    amount0: string,
    amount1: string,
    tick_lower: number,
    tick_upper: number,
    block_number: number,
    transaction_index: number,
    log_index: number,
    date: Date
  ): Promise<number> {
    return this.knex
      .transaction((trx) =>
        this.getBuilderContext("liquidity_events", trx).insert([
          {
            type,
            msg_sender,
            recipient,
            liquidity,
            amount0,
            amount1,
            tick_lower,
            tick_upper,
            block_number,
            transaction_index,
            log_index,
            date: DateConverter.formatDate(date, DATE_FORMAT),
          },
        ])
      )
      .then((ids) => Promise.resolve(ids[0]));
  }

  insertSwapEvent(
    msg_sender: string,
    recipient: string,
    amount0: string,
    amount1: string,
    sqrt_price_x96: string,
    liquidity: string,
    tick: number,
    block_number: number,
    transaction_index: number,
    log_index: number,
    date: Date
  ): Promise<number> {
    return this.knex.transaction((trx) =>
      this.getBuilderContext("swap_events", trx).insert([
        {
          msg_sender,
          recipient,
          amount0,
          amount1,
          amount_specified: undefined,
          sqrt_price_x96,
          liquidity,
          tick,
          block_number,
          transaction_index,
          log_index,
          date: DateConverter.formatDate(date, DATE_FORMAT),
        },
      ])
    );
  }

  close(): Promise<void> {
    return this.knex.destroy();
  }

  private readPoolConfig(
    trx?: Knex.Transaction
  ): Promise<PoolConfigRecord | undefined> {
    return this.getBuilderContext("pool_config", trx).first();
  }

  private queryLiquidityEventsByDate(
    type: number,
    startDate: string,
    endDate: string,
    trx?: Knex.Transaction
  ): Promise<LiquidityEventRecord[]> {
    return this.getBuilderContext("liquidity_events", trx)
      .where("type", type)
      .andWhere("date", ">=", startDate)
      .andWhere("date", "<", endDate);
  }

  private querySwapEventsByDate(
    startDate: string,
    endDate: string,
    trx?: Knex.Transaction
  ): Promise<SwapEventRecord[]> {
    return this.getBuilderContext("swap_events", trx)
      .andWhere("date", ">=", startDate)
      .andWhere("date", "<", endDate);
  }

  private queryLiquidityEventsByBlockNumber(
    type: number,
    fromBlock: number,
    toBlock: number,
    trx?: Knex.Transaction
  ): Promise<LiquidityEventRecord[]> {
    return this.getBuilderContext("liquidity_events", trx)
      .where("type", type)
      .andWhere("block_number", ">=", fromBlock)
      .andWhere("block_number", "<=", toBlock);
  }

  private querySwapEventsByBlockNumber(
    fromBlock: number,
    toBlock: number,
    trx?: Knex.Transaction
  ): Promise<SwapEventRecord[]> {
    return this.getBuilderContext("swap_events", trx)
      .andWhere("block_number", ">=", fromBlock)
      .andWhere("block_number", "<=", toBlock);
  }

  private insertPoolConfig(
    poolConfig: PoolConfig,
    trx?: Knex.Transaction
  ): Promise<Array<number>> {
    return this.getBuilderContext("pool_config", trx).insert([
      {
        pool_config_id: poolConfig.id,
        token0: poolConfig.token0,
        token1: poolConfig.token1,
        fee: poolConfig.fee,
        tick_spacing: poolConfig.tickSpacing,
        initial_sqrt_price_X96: undefined,
        latest_event_block_number: 0,
        timestamp: DateConverter.formatDate(new Date(), DATE_FORMAT),
      },
    ]);
  }

  private updateAmountSpecified(
    id: number,
    amountSpecified: string,
    trx?: Knex.Transaction
  ): Promise<Array<number>> {
    return this.getBuilderContext("swap_events", trx)
      .update("amount_specified", amountSpecified)
      .where("id", id);
  }

  private updateInitialSqrtPriceX96(
    initialSqrtPriceX96: string,
    trx?: Knex.Transaction
  ): Promise<Array<number>> {
    return this.getBuilderContext("pool_config", trx)
      .update("initial_sqrt_price_X96", initialSqrtPriceX96)
      .where("id", 1);
  }

  private updateLatestEventBlockNumber(
    latestEventBlockNumber: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.getBuilderContext("pool_config", trx)
      .update("latest_event_block_number", latestEventBlockNumber)
      .where("id", 1);
  }

  private updateInitializationEventBlockNumber(
    initializationEventBlockNumber: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.getBuilderContext("pool_config", trx)
      .update(
        "initialization_event_block_number",
        initializationEventBlockNumber
      )
      .where("id", 1);
  }

  private deserializeLiquidityEvent(
    event: LiquidityEventRecord
  ): LiquidityEvent {
    return {
      id: event.id,
      type: event.type,
      msgSender: event.msg_sender,
      recipient: event.recipient,
      liquidity: JSBIDeserializer(event.liquidity),
      amount0: JSBIDeserializer(event.amount0),
      amount1: JSBIDeserializer(event.amount1),
      tickLower: event.tick_lower,
      tickUpper: event.tick_upper,
      blockNumber: event.block_number,
      transactionIndex: event.transaction_index,
      logIndex: event.log_index,
      date: DateConverter.parseDate(event.date),
    };
  }

  private deserializeSwapEvent(event: SwapEventRecord): SwapEvent {
    return {
      id: event.id,
      type: EventType.SWAP,
      msgSender: event.msg_sender,
      recipient: event.recipient,
      amount0: JSBIDeserializer(event.amount0),
      amount1: JSBIDeserializer(event.amount1),
      amountSpecified: JSBIDeserializer(event.amount_specified),
      sqrtPriceX96: JSBIDeserializer(event.sqrt_price_x96),
      liquidity: JSBIDeserializer(event.liquidity),
      tick: event.tick,
      blockNumber: event.block_number,
      transactionIndex: event.transaction_index,
      logIndex: event.log_index,
      date: DateConverter.parseDate(event.date),
    };
  }

  private getBuilderContext(
    tableName: string,
    trx?: Knex.Transaction
  ): Knex.QueryBuilder {
    return trx ? trx(tableName) : this.knex(tableName);
  }
}
