### SimulatorRoadmapManager

If we take every `ConfigurableCorePool` as a state machine, then a `SimulatorRoadmapManager` can be taken as `PoolState` container as well as `ConfigurableCorePool` manager. At this point, every state machine can be expanded as a roadmap of states.

First let's get the instance of `SimulatorRoadmapManager` from `SimulatorClient`.

```typescript
let simulatorRoadmapManager: SimulatorRoadmapManager =
  clientInstance.simulatorRoadmapManager;
```

You can list and check all `ConfigurableCorePool` created by Tuner within the program.

```typescript
let pools: ConfigurableCorePool[] = await simulatorRoadmapManager.listRoutes();
```

With a `ConfigurableCorePool` id, Tuner can print route from the first pool state to current pool state of the state machine in pretty format.

```typescript
await simulatorRoadmapManager.printRoute(configurableCorePool.id);
```

Also you can persist the route for selecting them in the internal database later.

```typescript
let roadmapId = await simulatorRoadmapManager.persistRoute(
  configurableCorePool.id,
  "description for roadmap"
);
```

Then load the roadmap and print the route in pretty format.

```typescript
await simulatorRoadmapManager.loadAndPrintRoute(roadmapId);
```

Note: As the storage scale of Uniswap V3 CorePool(up to 160,000+ Ticks and unlimited Positions), frequent persistence of route as well as snapshot is not recommended. Please pay attention to space cost.
