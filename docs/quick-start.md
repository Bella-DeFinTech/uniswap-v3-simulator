### Quick Start

```typescript
import {
  SimulationDataManager,
  SimulatorClient,
  SQLiteSimulationDataManager,
} from "@bella-defintech/uniswap-v3-simulator";

// 1. Instantiate a SimulationDataManager
// this is for handling the internal data (snapshots, roadmaps, etc.)
let simulationDataManager: SimulationDataManager =
  await SQLiteSimulationDataManager.buildInstance(
    "Your file path to save the internal data"
  );
let clientInstance: SimulatorClient = new SimulatorClient(
  simulationDataManager
);

// 2. Initialize a pool simulation from mainnet
// specify the core pool you want and time range of event logs to sync
let poolName = "test";

// This would be the contract address of a certain Uniswap V3 Pool
let poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";

// Specify an endBlock number
// the SimulatorClient will download data up to that block
// and save it to a sqlite database file locally
let endBlock = 12374077;

// 3. This method helps you:
//    Download event data of a certain Uniswap V3 pool from mainnet
//    Pre-process the data to figure out the inputs of swap events
await clientInstance.initCorePoolFromMainnet(
  poolName,
  poolAddress,
  "afterDeployment"
);

// 4. Build a simulated CorePool instance from the downloaded-and-pre-processed mainnet events
let configurableCorePool = await clientInstance.recoverFromMainnetEventDBFile(
  `${poolName}_${poolAddress}.db`,
  endBlock
);

// 5. Now you can do whatever you want with the simulated pool
//    here we simply print out the square root price of the pool at the specified block height
console.log(configurableCorePool.getCorePool().sqrtPriceX96.toString());
```
