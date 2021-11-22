import { Knex, knex as knexBuilder } from "knex";
import { JSBIDeserializer } from "../src/util/Serializer";
import { LiquidityEvent } from "./LiquidityEvent";
import { SwapEvent } from "./SwapEvent";
import { DateConverter } from "../src/util/DateConverter";
import { EventType } from "./EventType";

const DATE_FORMAT: string = "YYYY-MM-DD HH:mm:ss";

type LiquidityEventRecord = {
  id: number;
  type: number;
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

export class EventDBManager {
  private knex: Knex;
  private static _instance: EventDBManager;

  constructor(knex: Knex) {
    this.knex = knex;
  }

  public static get instance(): EventDBManager {
    if (!EventDBManager._instance) {
      throw new Error("Please build an instance first!");
    }
    return EventDBManager._instance;
  }

  static buildInstance(dbPath: string): Promise<EventDBManager> {
    const config: Knex.Config = {
      client: "sqlite3",
      connection: {
        filename: dbPath, //:memory:
      },
      // sqlite does not support inserting default values. Set the `useNullAsDefault` flag to hide the warning.
      useNullAsDefault: true,
    };
    let eventDBManager = new EventDBManager(knexBuilder(config));
    this._instance = eventDBManager;
    return Promise.resolve(eventDBManager);
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

  addAmountSpecified(id: number, amountSpecified: string): Promise<number> {
    return this.knex.transaction((trx) =>
      this.updateAmountSpecified(id, amountSpecified, trx).then((ids) =>
        Promise.resolve(ids[0])
      )
    );
  }

  insertLiquidityEvent(
    type: number,
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
        this.getBuilderContext("liquidity_events_usdc_weth_3000", trx).insert([
          {
            type,
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
      this.getBuilderContext("swap_events_usdc_weth_3000", trx).insert([
        {
          amount0,
          amount1,
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

  private queryLiquidityEventsByDate(
    type: number,
    startDate: string,
    endDate: string,
    trx?: Knex.Transaction
  ): Promise<LiquidityEventRecord[]> {
    return this.getBuilderContext("liquidity_events_usdc_weth_3000", trx)
      .where("type", type)
      .andWhere("date", ">=", startDate)
      .andWhere("date", "<", endDate);
  }

  private querySwapEventsByDate(
    startDate: string,
    endDate: string,
    trx?: Knex.Transaction
  ): Promise<SwapEventRecord[]> {
    return this.getBuilderContext("swap_events_usdc_weth_3000", trx)
      .andWhere("date", ">=", startDate)
      .andWhere("date", "<", endDate);
  }

  private updateAmountSpecified(
    id: number,
    amountSpecified: string,
    trx?: Knex.Transaction
  ): Promise<Array<number>> {
    return this.getBuilderContext("swap_events_usdc_weth_3000", trx)
      .update("amount_specified", amountSpecified)
      .where("id", id);
  }

  private deserializeLiquidityEvent(
    event: LiquidityEventRecord
  ): LiquidityEvent {
    return {
      id: event.id,
      type: event.type,
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
