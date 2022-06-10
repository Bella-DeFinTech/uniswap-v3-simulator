### Loading and streaming events into a pool

Suppose a quant developer is going to backtest some strategy on mainnet pool.

This includes the following steps:

1. Using mainnet data to initialize a core pool
2. Replaying events up to a certain block as a checkpoint
3. Do some interaction as the strategy asks as interpolation to real transactions
4. Replaying events until the next checkpoint
5. Repeat step3-4 until events are run out
6. Evaluate performance of the strategy

Tuner has offered an example project called `uniswap-v3-bot`. It similarly follow the process above to build a strategy platform for backtesting, dry-run and run, where a user adds a new strategy by implementing some callback interfaces(`trigger`, `cache`, `act` and `evaluate`). See [Uniswap-v3-Strategy-Backtest](https://github.com/Bella-DeFinTech/uniswap-v3-simulator/tree/main/examples/Uniswap-v3-Strategy-Backtest).

When getting a core pool instance by `clientInstance.initCorePoolFromMainnet` or `clientInstance.recoverFromMainnetEventDBFile`, Tuner has already automatically replayed events from the first record to the last one in `endBlock`. For replaying following events, you can load them by `EventDBManager`, and decide how to use them on your own.

An example of streaming process will be:

```typescript
import {
  ConfigurableCorePool,
  EventDBManager,
  EventType,
  SimulationDataManager,
  SimulatorClient,
  SQLiteSimulationDataManager,
} from "@bella-defintech/uniswap-v3-simulator";
import { LiquidityEvent } from "@bella-defintech/uniswap-v3-simulator/dist/entity/LiquidityEvent";
import { SwapEvent } from "@bella-defintech/uniswap-v3-simulator/dist/entity/SwapEvent";
import JSBI from "jsbi";

// the database name containing downloaded-and-pre-processed mainnet events
let mainnetEventDBFilePath =
  "events_0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8.db";

// build a client instance
let simulationDataManager: SimulationDataManager =
  await SQLiteSimulationDataManager.buildInstance(
    "Your file path to save the internal data"
  );
let clientInstance: SimulatorClient = new SimulatorClient(
  simulationDataManager
);

// Specify an endBlock number
// the SimulatorClient will replay events up to that block
let endBlock0 = 12374077;

// get a pool instance
let configurableCorePool: ConfigurableCorePool =
  await clientInstance.recoverFromMainnetEventDBFile(
    mainnetEventDBFilePath,
    endBlock0
  );

// get an EventDBManager instance to load events
let eventDB = await EventDBManager.buildInstance(mainnetEventDBFilePath);

// get and sort event by block number
let events: (LiquidityEvent | SwapEvent)[] = [];
let startBlock = 1000,
  endBlock = 2000;
let mintEvents: LiquidityEvent[] =
  await eventDB.getLiquidityEventsByBlockNumber(
    EventType.MINT,
    startBlock,
    endBlock
  );
let burnEvents: LiquidityEvent[] =
  await eventDB.getLiquidityEventsByBlockNumber(
    EventType.BURN,
    startBlock,
    endBlock
  );
let swapEvents: SwapEvent[] = await eventDB.getSwapEventsByBlockNumber(
  startBlock,
  endBlock
);
events.push(...mintEvents);
events.push(...burnEvents);
events.push(...swapEvents);
events.sort(function (a, b) {
  return a.blockNumber == b.blockNumber
    ? a.logIndex - b.logIndex
    : a.blockNumber - b.blockNumber;
});

// replay events
for (let index = 0; index < events.length; index++) {
  // avoid stack overflow for the possible recovering operation
  if (index % 1000 == 0) {
    configurableCorePool.takeSnapshot("");
  }

  let event = events[index];
  switch (event.type) {
    case EventType.MINT:
      await configurableCorePool.mint(
        event.recipient,
        event.tickLower,
        event.tickUpper,
        event.liquidity
      );
      break;
    case EventType.BURN:
      await configurableCorePool.burn(
        event.msgSender,
        event.tickLower,
        event.tickUpper,
        event.liquidity
      );
      break;
    case EventType.SWAP:
      let zeroForOne: boolean = JSBI.greaterThan(event.amount0, JSBI.BigInt(0))
        ? true
        : false;
      await configurableCorePool.swap(
        zeroForOne,
        event.amountSpecified
        //,event.sqrt_price_x96
      );
      break;
    default:
      // @ts-ignore: ExhaustiveCheck
      const exhaustiveCheck: never = event;
  }
}
```

Note: Tuner doesn't export `LiquidityEvent` | `SwapEvent` directly but you can sitll use them. For external data(event logs), we recommend you to implement your `EventDBManager` to load and manage event logs, according to your context.
