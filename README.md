---
description: A programmable, transaction-based Uniswap V3 Simulator with 100% Precision
---

# Bella "Tuner"

### Quick Start

```typescript
// 1. Instantiate a DBManager
// this is for handling the internal data (snapshots, roadmaps, etc.)
 let dbManager: DBManager = await SQLiteDBManager.buildInstance();
 let clientInstance = new SimulatorClient(dbManager);


// 2. Initialize a pool simulation from mainnet
 let poolName = "test";
 
 // case 1
 // 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8
 // 12374077
 // case 2
 // 0x92560C178cE069CC014138eD3C2F5221Ba71f58a
 // 13578943
 
 
// This would be the contract address of a certain Uniswap V3 Pool
 let poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
 
 
// Specify an endBlock number
// the SimulatorClient will download data up to that block
// and save it to a sqlite database file locally
 let endBlock = 12374077;
 
 
// This is the rpc provider url for ethers.js
 let RPCProviderUrl: string = "Your customed RPCProviderUrl";


// 3. This method helps you:
//    Download event data of a certain Uniswap V3 pool from mainnet
//    Pre-process the data to figure out the inputs of swap events
 await clientInstance.initCorePoolFromMainnetPool(
   poolName,
   poolAddress,
   "afterDeployment",
   RPCProviderUrl
 );


// 4. Build a simulated CorePool instance from the downloaded-and-pre-processed mainnet events
 let configurableCorePool =
   await clientInstance.recoverFromMainnetEventDBFile(
     `${poolName}_${poolAddress}.db`,
     endBlock,
     RPCProviderUrl
   );
   
 
 // 5. Now you can do whatever you want with the simulated pool
 //    here we simply print out the square root price of the pool at the specified block height
 console.log(configurableCorePool.getCorePool().sqrtPriceX96.toString());
```

### Installing "Tuner"

{% embed url="https://www.npmjs.com/package/@bella-defintech/uniswap-v3-simulator" %}

```bash
yarn add @bella-defintech/uniswap-v3-simulator
```

### How "Tuner" Library Works?

The overall design of the simulator consists of several components (rough dependency graph shown below), this **does NOT** necessarily 100% reflect how everything is implemented, but to give you an intuitive understanding of the relationships between the components and their corresponding purposes:

**`SimulatorClient` ** - _The high-level and easiest way to use the simulator_

&#x20;   |\_\_ **`ConfigurableCorePool`** - _To give **`CorePool`** snapshot and roadmap capabilities_

&#x20;       |\_\_ **`CorePool`** - _The re-implementation of_ [_Uniswap-V3-Core logic_](https://github.com/Uniswap/v3-core/blob/main/contracts/UniswapV3Pool.sol)__

&#x20;   |\_\_ **`MainnetDataDownloader`** - _The download-and-update utility to retrieve mainnet events_

&#x20;       |\_\_ **`EventDBManager`** - _To persist mainnet event data using SQLite_

&#x20;   |\_\_ **`SimulatorRoadMapManager`** - _To take snapshots and do state-change roadmap tracking_

&#x20;       |\_\_ **`InternalDBManager`** - _To persist snapshots and roadmaps using SQLite_

There are 2 abstraction layers of the library:

#### Top-Level: [`SimulatorClient`](src/client/SimulatorClient.ts)

This is a convenient way to [get you started](./#quick-start) immediately. We have wrapped the underlying logic of data downloading, data pre-processing, and simulated Uniswap V3 pool together instantiation together, so you don't have to deal with the details.

#### Low-Level:&#x20;

If you want more flexible ways to run your own simulation scenarios and have more granular control, you can wire things up manually as you like, by directly interacting with the below classes:

* **`ConfigurableCorePool`**
* **`MainnetDataDownloader`**
* **`SimulatorRoadMapManager`**

####
