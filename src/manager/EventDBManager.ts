import { Knex, knex as knexBuilder } from "knex";
import { JSBIDeserializer } from "../util/Serializer";
import { LiquidityEvent } from "../entity/LiquidityEvent";
import { SwapEvent } from "../entity/SwapEvent";
import { DateConverter } from "../util/DateConverter";
import { EventType } from "../enum/EventType";
import { PoolConfig } from "../model/PoolConfig";
import { ZERO } from "../enum/InternalConstants";
import JSBI from "jsbi";
import * as log4js from "log4js";

const logger = log4js.getLogger("EventDBManager");

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
  transaction_hash: string;
  log_index: number;
  date: string;
  verified: boolean;
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
  transaction_hash: string;
  log_index: number;
  date: string;
  verified: boolean;
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
  latest_verified_swap_block_number: number;
  latest_verified_burn_block_number: number;
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
      knex.schema
        .hasTable("pool_config")
        .then((exists: boolean) =>
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
                  t.integer("latest_verified_swap_block_number");
                  t.integer("latest_verified_burn_block_number");
                  t.text("timestamp");
                }
              )
            : Promise.resolve()
        )
        .then(() => this.migratePoolConfigTable())
        .then(() => this.migrateEventTables()),
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
                t.string("transaction_hash", 255);
                t.integer("log_index");
                t.text("date");
                t.boolean("verified").defaultTo(false);
                t.index(["type", "block_number"]);
                t.index(["type", "date"]);
                t.index(["transaction_hash", "log_index"]);
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
                t.string("transaction_hash", 255);
                t.integer("log_index");
                t.text("date");
                t.boolean("verified").defaultTo(false);
                t.index(["block_number"]);
                t.index(["date"]);
                t.index(["transaction_hash", "log_index"]);
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

  getBurnEventsByTransactionHash(
    transactionHash: string
  ): Promise<LiquidityEvent[]> {
    return this.queryBurnEventsByTransactionHash(transactionHash).then(
      (rows: LiquidityEventRecord[]) =>
        Promise.resolve(
          rows.map((row: LiquidityEventRecord) =>
            this.deserializeLiquidityEvent(row)
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
      this.updateAmountSpecified(id, amountSpecified, trx).then(
        (updated_rows) => Promise.resolve(updated_rows)
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

  saveBurnEvent(
    transactionHash: string,
    logIndex: number,
    liquidity: string,
    amount0: string,
    amount1: string,
    tickLower: number,
    tickUpper: number
  ): Promise<number> {
    return this.knex.transaction((trx) =>
      this.updateBurnEvent(
        transactionHash,
        logIndex,
        liquidity,
        amount0,
        amount1,
        tickLower,
        tickUpper,
        trx
      ).then((id) => Promise.resolve(id))
    );
  }

  getLatestVerifiedSwapBlockNumber(): Promise<number> {
    return this.readPoolConfig().then((res) =>
      !res
        ? Promise.resolve(0)
        : Promise.resolve(
            null == res.latest_verified_swap_block_number
              ? 0
              : res.latest_verified_swap_block_number
          )
    );
  }

  getLatestVerifiedBurnBlockNumber(): Promise<number> {
    return this.readPoolConfig().then((res) =>
      !res
        ? Promise.resolve(0)
        : Promise.resolve(
            null == res.latest_verified_burn_block_number
              ? 0
              : res.latest_verified_burn_block_number
          )
    );
  }

  saveLatestVerifiedSwapBlockNumber(
    latestVerifiedSwapBlockNumber: number
  ): Promise<number> {
    return this.knex.transaction((trx) =>
      this.updateLatestVerifiedSwapBlockNumber(
        latestVerifiedSwapBlockNumber,
        trx
      ).then((id) => Promise.resolve(id))
    );
  }

  saveLatestVerifiedBurnBlockNumber(
    latestVerifiedBurnBlockNumber: number
  ): Promise<number> {
    return this.knex.transaction((trx) =>
      this.updateLatestVerifiedBurnBlockNumber(
        latestVerifiedBurnBlockNumber,
        trx
      ).then((id) => Promise.resolve(id))
    );
  }

  /**
   * mark liquidity event as verified
   * @param eventId event id
   * @returns updated rows
   */
  markLiquidityEventAsVerified(eventId: number): Promise<number> {
    return this.knex.transaction((trx) =>
      this.getBuilderContext("liquidity_events", trx)
        .where("id", eventId)
        .update({ verified: true })
    );
  }

  /**
   * mark swap event as verified
   * @param eventId event id
   * @returns updated rows
   */
  markSwapEventAsVerified(eventId: number): Promise<number> {
    return this.knex.transaction((trx) =>
      this.getBuilderContext("swap_events", trx)
        .where("id", eventId)
        .update({ verified: true })
    );
  }

  /**
   * batch mark liquidity events as verified
   * @param eventIds event ids
   * @returns updated rows
   */
  markLiquidityEventsAsVerified(eventIds: number[]): Promise<number> {
    if (eventIds.length === 0) {
      return Promise.resolve(0);
    }
    return this.knex.transaction((trx) =>
      this.getBuilderContext("liquidity_events", trx)
        .whereIn("id", eventIds)
        .update({ verified: true })
    );
  }

  /**
   * batch mark swap events as verified
   * @param eventIds event ids
   * @returns updated rows
   */
  markSwapEventsAsVerified(eventIds: number[]): Promise<number> {
    if (eventIds.length === 0) {
      return Promise.resolve(0);
    }
    return this.knex.transaction((trx) =>
      this.getBuilderContext("swap_events", trx)
        .whereIn("id", eventIds)
        .update({ verified: true })
    );
  }

  /**
   * get unverified liquidity events
   * @param type event type
   * @param fromBlock start block
   * @param toBlock end block
   * @returns unverified liquidity events
   */
  getUnverifiedLiquidityEvents(
    type: number,
    fromBlock: number,
    toBlock: number
  ): Promise<LiquidityEvent[]> {
    return this.getBuilderContext("liquidity_events")
      .where("type", type)
      .andWhere("block_number", ">=", fromBlock)
      .andWhere("block_number", "<=", toBlock)
      .andWhere("verified", false)
      .then((rows: LiquidityEventRecord[]) =>
        Promise.resolve(
          rows.map(
            (row: LiquidityEventRecord): LiquidityEvent =>
              this.deserializeLiquidityEvent(row)
          )
        )
      );
  }

  /**
   * get unverified swap events
   * @param fromBlock start block
   * @param toBlock end block
   * @returns unverified swap events
   */
  getUnverifiedSwapEvents(
    fromBlock: number,
    toBlock: number
  ): Promise<SwapEvent[]> {
    return this.getBuilderContext("swap_events")
      .where("block_number", ">=", fromBlock)
      .andWhere("block_number", "<=", toBlock)
      .andWhere("verified", false)
      .then((rows: SwapEventRecord[]) =>
        Promise.resolve(
          rows.map(
            (row: SwapEventRecord): SwapEvent => this.deserializeSwapEvent(row)
          )
        )
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
    transaction_hash: string,
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
            transaction_hash,
            log_index,
            date: DateConverter.formatDate(date, DATE_FORMAT),
            verified: false,
          },
        ])
      )
      .then((ids) => Promise.resolve(ids[0]));
  }

  /**
   * batch insert liquidity events
   * @param events event array
   * @param batchSize batch size, default 500
   * @returns inserted record ids
   */
  async batchInsertLiquidityEvents(
    events: Array<{
      type: number;
      msg_sender: string;
      recipient: string;
      liquidity: string;
      amount0: string;
      amount1: string;
      tick_lower: number;
      tick_upper: number;
      block_number: number;
      transaction_hash: string;
      log_index: number;
      date: Date;
    }>,
    batchSize: number = 500
  ): Promise<number[]> {
    if (events.length === 0) {
      return Promise.resolve([]);
    }

    // if the number of events is less than or equal to the batch size, insert directly
    if (events.length <= batchSize) {
      const records = events.map((event) => ({
        type: event.type,
        msg_sender: event.msg_sender,
        recipient: event.recipient,
        liquidity: event.liquidity,
        amount0: event.amount0,
        amount1: event.amount1,
        tick_lower: event.tick_lower,
        tick_upper: event.tick_upper,
        block_number: event.block_number,
        transaction_hash: event.transaction_hash,
        log_index: event.log_index,
        date: DateConverter.formatDate(event.date, DATE_FORMAT),
        verified: false,
      }));

      logger.info(
        `Inserted ${records.length} liquidity events, type: ${events[0].type}`
      );

      return this.knex
        .transaction((trx) =>
          this.getBuilderContext("liquidity_events", trx).insert(records)
        )
        .then((ids) => Promise.resolve(ids));
    }

    // batch process large data
    const allIds: number[] = [];
    const totalBatches = Math.ceil(events.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize;
      const endIndex = Math.min(startIndex + batchSize, events.length);
      const batch = events.slice(startIndex, endIndex);

      const records = batch.map((event) => ({
        type: event.type,
        msg_sender: event.msg_sender,
        recipient: event.recipient,
        liquidity: event.liquidity,
        amount0: event.amount0,
        amount1: event.amount1,
        tick_lower: event.tick_lower,
        tick_upper: event.tick_upper,
        block_number: event.block_number,
        transaction_hash: event.transaction_hash,
        log_index: event.log_index,
        date: DateConverter.formatDate(event.date, DATE_FORMAT),
        verified: false,
      }));

      const batchIds = await this.knex.transaction((trx) =>
        this.getBuilderContext("liquidity_events", trx).insert(records)
      );

      allIds.push(...batchIds);
    }

    logger.info(
      `Inserted ${events.length} liquidity events, type: ${events[0].type}, batchSize: ${batchSize}, totalBatches: ${totalBatches}, allIds: ${allIds.length}`
    );

    return Promise.resolve(allIds);
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
    transaction_hash: string,
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
          transaction_hash,
          log_index,
          date: DateConverter.formatDate(date, DATE_FORMAT),
          verified: false,
        },
      ])
    );
  }

  /**
   * batch insert swap events
   * @param events event array
   * @param batchSize batch size, default 500
   * @returns inserted record ids
   */
  async batchInsertSwapEvents(
    events: Array<{
      msg_sender: string;
      recipient: string;
      amount0: string;
      amount1: string;
      sqrt_price_x96: string;
      liquidity: string;
      tick: number;
      block_number: number;
      transaction_hash: string;
      log_index: number;
      date: Date;
    }>,
    batchSize: number = 500
  ): Promise<number[]> {
    if (events.length === 0) {
      return Promise.resolve([]);
    }

    // if the number of events is less than or equal to the batch size, insert directly
    if (events.length <= batchSize) {
      const records = events.map((event) => ({
        msg_sender: event.msg_sender,
        recipient: event.recipient,
        amount0: event.amount0,
        amount1: event.amount1,
        amount_specified: undefined,
        sqrt_price_x96: event.sqrt_price_x96,
        liquidity: event.liquidity,
        tick: event.tick,
        block_number: event.block_number,
        transaction_hash: event.transaction_hash,
        log_index: event.log_index,
        date: DateConverter.formatDate(event.date, DATE_FORMAT),
        verified: false,
      }));

      logger.info(`Inserted ${records.length} swap events`);

      return this.knex
        .transaction((trx) =>
          this.getBuilderContext("swap_events", trx).insert(records)
        )
        .then((ids) => Promise.resolve(ids));
    }

    // batch process large data
    const allIds: number[] = [];
    const totalBatches = Math.ceil(events.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize;
      const endIndex = Math.min(startIndex + batchSize, events.length);
      const batch = events.slice(startIndex, endIndex);

      const records = batch.map((event) => ({
        msg_sender: event.msg_sender,
        recipient: event.recipient,
        amount0: event.amount0,
        amount1: event.amount1,
        amount_specified: undefined,
        sqrt_price_x96: event.sqrt_price_x96,
        liquidity: event.liquidity,
        tick: event.tick,
        block_number: event.block_number,
        transaction_hash: event.transaction_hash,
        log_index: event.log_index,
        date: DateConverter.formatDate(event.date, DATE_FORMAT),
        verified: false,
      }));

      const batchIds = await this.knex.transaction((trx) =>
        this.getBuilderContext("swap_events", trx).insert(records)
      );

      allIds.push(...batchIds);
    }

    logger.info(
      `Inserted ${events.length} swap events, batchSize: ${batchSize}, totalBatches: ${totalBatches}, allIds: ${allIds.length}`
    );

    return Promise.resolve(allIds);
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

  private queryBurnEventsByTransactionHash(
    transactionHash: string,
    trx?: Knex.Transaction
  ): Promise<LiquidityEventRecord[]> {
    return this.getBuilderContext("liquidity_events", trx)
      .where("transaction_hash", transactionHash)
      .andWhere("type", EventType.BURN)
      .andWhere("verified", false);
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
        latest_verified_swap_block_number: 0,
        latest_verified_burn_block_number: 0,
        timestamp: DateConverter.formatDate(new Date(), DATE_FORMAT),
      },
    ]);
  }

  private updateAmountSpecified(
    id: number,
    amountSpecified: string,
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.getBuilderContext("swap_events", trx)
      .update({
        amount_specified: amountSpecified,
        verified: true,
      })
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

  private updateLatestVerifiedSwapBlockNumber(
    latestVerifiedSwapBlockNumber: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.getBuilderContext("pool_config", trx)
      .update(
        "latest_verified_swap_block_number",
        latestVerifiedSwapBlockNumber
      )
      .where("id", 1);
  }

  private updateLatestVerifiedBurnBlockNumber(
    latestVerifiedBurnBlockNumber: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.getBuilderContext("pool_config", trx)
      .update(
        "latest_verified_burn_block_number",
        latestVerifiedBurnBlockNumber
      )
      .where("id", 1);
  }

  private updateBurnEvent(
    transactionHash: string,
    logIndex: number,
    liquidity: string,
    amount0: string,
    amount1: string,
    tickLower: number,
    tickUpper: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    return this.getBuilderContext("liquidity_events", trx)
      .update({
        liquidity,
        amount0,
        amount1,
        tick_lower: tickLower,
        tick_upper: tickUpper,
        verified: true,
      })
      .where("transaction_hash", transactionHash)
      .andWhere("type", EventType.BURN)
      .andWhere("verified", false)
      .orderBy("log_index", "asc")
      .limit(1);
    // because collect from subgraph is different from burn from RPC, we can't use logIndex to update
    // .andWhere("log_index", logIndex)
  }

  private async migratePoolConfigTable(): Promise<void> {
    try {
      // check if new columns are needed
      const hasVerifiedSwapColumn = await this.knex.schema.hasColumn(
        "pool_config",
        "latest_verified_swap_block_number"
      );
      const hasVerifiedBurnColumn = await this.knex.schema.hasColumn(
        "pool_config",
        "latest_verified_burn_block_number"
      );

      if (!hasVerifiedSwapColumn) {
        await this.knex.schema.alterTable("pool_config", (table) => {
          table.integer("latest_verified_swap_block_number").defaultTo(0);
        });
        logger.info(
          "Added latest_verified_swap_block_number column to pool_config table"
        );
      }

      if (!hasVerifiedBurnColumn) {
        await this.knex.schema.alterTable("pool_config", (table) => {
          table.integer("latest_verified_burn_block_number").defaultTo(0);
        });
        logger.info(
          "Added latest_verified_burn_block_number column to pool_config table"
        );
      }

      // update existing records with default values
      await this.knex("pool_config")
        .whereNull("latest_verified_swap_block_number")
        .update({ latest_verified_swap_block_number: 0 });

      await this.knex("pool_config")
        .whereNull("latest_verified_burn_block_number")
        .update({ latest_verified_burn_block_number: 0 });

      logger.info("Migration completed successfully");
    } catch (error) {
      logger.error("Migration failed:", error);
      throw error;
    }
  }

  private async migrateEventTables(): Promise<void> {
    try {
      // check if liquidity_events table has transaction_hash_log_index index
      const liquidityEventsIndexes = await this.knex.raw(
        "PRAGMA index_list(liquidity_events)"
      );
      const hasLiquidityEventsIndex = liquidityEventsIndexes.some(
        (index: any) =>
          index.name === "liquidity_events_transaction_hash_log_index"
      );

      if (!hasLiquidityEventsIndex) {
        await this.knex.schema.alterTable("liquidity_events", (table) => {
          table.index(
            ["transaction_hash", "log_index"],
            "liquidity_events_transaction_hash_log_index"
          );
        });
        logger.info(
          "Added transaction_hash_log_index index to liquidity_events table"
        );
      }

      // check if swap_events table has transaction_hash_log_index index
      const swapEventsIndexes = await this.knex.raw(
        "PRAGMA index_list(swap_events)"
      );
      const hasSwapEventsIndex = swapEventsIndexes.some(
        (index: any) => index.name === "swap_events_transaction_hash_log_index"
      );

      if (!hasSwapEventsIndex) {
        await this.knex.schema.alterTable("swap_events", (table) => {
          table.index(
            ["transaction_hash", "log_index"],
            "swap_events_transaction_hash_log_index"
          );
        });
        logger.info(
          "Added transaction_hash_log_index index to swap_events table"
        );
      }

      // check and add verified column to liquidity_events table
      const hasLiquidityEventsVerifiedColumn = await this.knex.schema.hasColumn(
        "liquidity_events",
        "verified"
      );

      if (!hasLiquidityEventsVerifiedColumn) {
        await this.knex.schema.alterTable("liquidity_events", (table) => {
          table.boolean("verified").defaultTo(false);
        });
        logger.info("Added verified column to liquidity_events table");
      }

      // check and add verified column to swap_events table
      const hasSwapEventsVerifiedColumn = await this.knex.schema.hasColumn(
        "swap_events",
        "verified"
      );

      if (!hasSwapEventsVerifiedColumn) {
        await this.knex.schema.alterTable("swap_events", (table) => {
          table.boolean("verified").defaultTo(false);
        });
        logger.info("Added verified column to swap_events table");
      }

      logger.info("Event tables migration completed successfully");
    } catch (error) {
      logger.error("Event tables migration failed:", error);
      throw error;
    }
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
      transactionHash: event.transaction_hash,
      logIndex: event.log_index,
      date: DateConverter.parseDate(event.date),
      verified: event.verified || false,
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
      transactionHash: event.transaction_hash,
      logIndex: event.log_index,
      date: DateConverter.parseDate(event.date),
      verified: event.verified || false,
    };
  }

  private getBuilderContext(
    tableName: string,
    trx?: Knex.Transaction
  ): Knex.QueryBuilder {
    return trx ? trx(tableName) : this.knex(tableName);
  }
}
