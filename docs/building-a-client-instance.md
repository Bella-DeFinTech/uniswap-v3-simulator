### Building a client instance

A `SimulatorClient` is the user entry point of the Tuner. It needs a `SimulationDataManager` to persist internal data supporting functionality of the simulator, while external data refer to state of some Uniswap v3 Core Pool on chain.

We provide an implementation of `SimulationDataManager` using SQLite, so it's recommended to provide a file path locally to save the internal data(in memory by default), then you can recover a pool from a snapshot. If you are familiar with the interface, it's ok to replace it with a customed implementation, e.g. some database connected remotely.

```typescript
// 1. Instantiate a SimulationDataManager
// this is for handling the internal data (snapshots, roadmaps, etc.)
let simulationDataManager: SimulationDataManager =
  await SQLiteSimulationDataManager.buildInstance(
    "Your file path to save the internal data"
  );
let clientInstance: SimulatorClient = new SimulatorClient(
  simulationDataManager
);
```

It's recommended to close the client when you finish with Tuner.

```typescript
await clientInstance.shutdown();
```
