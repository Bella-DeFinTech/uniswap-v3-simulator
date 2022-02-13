### Getting a pool instance with the data fetched

Usually before work begins, the preparation includes the following steps:

1. Using mainnet data to initialize a core pool
2. Replaying events up to the specified block

`SimulatorClient`(`clientInstance.initCorePoolFromMainnet` and `clientInstance.recoverFromMainnetEventDBFile`) is designed to do that. See [Fetching all the data of a certain pool from Ethereum](fetching-all-the-data-of-a-certain-pool-from-ethereum.md).

If you have tried `MainnetDataDownloader` to download or update event logs(See [Uniswap-v3-Events-Downloader](https://github.com/Bella-DeFinTech/uniswap-v3-simulator/tree/main/examples/Uniswap-v3-Events-Downloader)), then you are supposed to get the pool instance in this way:

```typescript
// the database name containing downloaded-and-pre-processed mainnet events
let mainnetEventDBFilePath =
  "events_0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8.db";

let simulationDataManager: SimulationDataManager =
  await SQLiteSimulationDataManager.buildInstance(
    "Your file path to save the internal data"
  );
let clientInstance: SimulatorClient = new SimulatorClient(
  simulationDataManager
);

// Specify an endBlock number
// the SimulatorClient will replay events up to that block
let endBlock = 12374077;

let configurableCorePool: ConfigurableCorePool =
  await clientInstance.recoverFromMainnetEventDBFile(
    mainnetEventDBFilePath,
    endBlock
  );

// Now you can do whatever you want with the simulated pool
// here we simply print out the square root price of the pool at the specified block height
console.log(configurableCorePool.getCorePool().sqrtPriceX96.toString());
```
