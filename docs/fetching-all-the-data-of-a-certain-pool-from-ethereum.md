### Fetching all the data of a certain pool from Ethereum

Tuner syncs the full state of the Pool from the event logs on chain, aiming to reproduce 100% as things happened in the mainnet.

For a quant developer, Tuner offers an easy-to-use API to download/update and persist event logs, and then build the core pool instance for the user. According to transaction volume of wanted core pool, the first run will cost some time. See [Performance](performance.md).

Specifically, you can set block number or other key dates as the upper limit from the deployment of your specified core pool, as time range of event logs. The SimulatorClient will download data up to that block and save it to a SQLite database file locally.

Note: The database for event logs(external data) and the one to support functionality of Tuner(internal data) are different SQLite database files.

```typescript
export type EndBlockTypeWhenInit =
  | number
  | "latest"
  | "afterDeployment"
  | "afterInitialization";

export type EndBlockTypeWhenRecover =
  | number
  | "latestOnChain"
  | "latestDownloaded"
  | "afterDeployment"
  | "afterInitialization";
```

For downloading mainnet data, we had to pre-process the data because mainnet events of swaps only represent the results of the swap, we had to use a try-and-error logic to test out the actual inputs of that swap.

This means, there is more information added on top of the mainnet events, and this extra information (correct inputs of the swap that emit the event recorded on mainnet) is only added during the download process.

`SimulatorClient` will handle with processes above and you just need to call `clientInstance.initCorePoolFromMainnet` to download event logs for a new pool or `clientInstance.recoverFromMainnetEventDBFile` to update event logs for an existed pool. They both give you an instance of `ConfigurableCorePool` finally.

An example of the whole process will be:

```typescript
import {
  EndBlockTypeWhenRecover,
  EventDataSourceType,
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

// 2. Specify the core pool you want and time range of event logs to sync
let poolName = "events-test";

// This would be the contract address of a certain Uniswap V3 Pool
let poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";

let endBlock: EndBlockTypeWhenRecover = 12374077;

// This is the rpc provider url for ethers.js, you can customize it here or use the value in tuner.config.js
let RPCProviderUrl: string | undefined = "Your customed RPCProviderUrl";

// You can specify data source of events here, and Uniswap v3 Subgraph as default is recommended rather than RPC for at least 75% time saving
// Just a reminder, RPC endpoint is necessary for the simulator even if you choose to download events from Subgraph
let eventDataSourceType: EventDataSourceType = EventDataSourceType.SUBGRAPH;

// 3(a). This method helps you:
//    Download event data of a certain Uniswap V3 pool from mainnet
//    Pre-process the data to figure out the inputs of swap events
//    Finally get the core pool instance
if (!exists(`${poolName}_${poolAddress}.db`)) {
  let configurableCorePool: ConfigurableCorePool =
    await clientInstance.initCorePoolFromMainnet(
      poolName,
      poolAddress,
      endBlock,
      RPCProviderUrl,
      eventDataSourceType
    );
}

// 3(b). This method helps you:
//    Update and Pre-process event data of a certain Uniswap V3 pool from mainnet if necessary
//    Build a simulated CorePool instance from the downloaded-and-pre-processed mainnet events
let configurableCorePool: ConfigurableCorePool =
  await clientInstance.recoverFromMainnetEventDBFile(
    `${poolName}_${poolAddress}.db`,
    endBlock,
    RPCProviderUrl,
    eventDataSourceType
  );

// 4. It's recommended to close the client when you finish with Tuner
await clientInstance.shutdown();
```

Note: If a bad gateway error(usually due to the hosted service of subgraph) happens, just wait a few seconds and then give it a re-run. Tuner has taken error handling into consideration to make sure integrality and consistency of events.
