### How "Tuner" Library Works?

The overall design of the simulator consists of several components (rough dependency graph shown below), this **does NOT** necessarily 100% reflect how everything is implemented, but to give you an intuitive understanding of the relationships between the components and their corresponding purposes:

**`SimulatorClient`** - _The high-level and easiest way to use the simulator_

&#x20; |\_\_ **`ConfigurableCorePool`** - _To give **`CorePool`** snapshot and roadmap capabilities_

&#x20; |\_\_ **`CorePool`** - _The re-implementation of_ [_Uniswap-V3-Core logic_](https://github.com/Uniswap/v3-core/blob/main/contracts/UniswapV3Pool.sol)

&#x20; |\_\_ **`MainnetDataDownloader`** - _The download-and-update utility to retrieve mainnet events_

&#x20; |\_\_ **`EventDBManager`** - _To persist mainnet event data using SQLite_

&#x20; |\_\_ **`SimulatorRoadMapManager`** - _To take snapshots and do state-change roadmap tracking_

&#x20; |\_\_ **`SimulationDataManager`** - _To persist snapshots and roadmaps using SQLite_

There are 2 abstraction layers of the library:

#### Top-Level: [`SimulatorClient`](src/client/SimulatorClient.ts)

This is a convenient way to [get you started](./#quick-start) immediately. We have wrapped the underlying logic of data downloading, data pre-processing, and simulated Uniswap V3 pool together instantiation together, so you don't have to deal with the details.

#### Low-Level:&#x20;

If you want more flexible ways to run your own simulation scenarios and have more granular control, you can wire things up manually as you like, by directly interacting with the below classes:

- **`ConfigurableCorePool`**
- **`MainnetDataDownloader`**
- **`SimulatorRoadMapManager`**

####
