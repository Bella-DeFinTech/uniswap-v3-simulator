# the "_Tuner_", a Uniswap V3 Simulator

> Before an ochestra, every musical instrument has to be _in-tune_, to ensure an outstanding performance.
> 
> Before running a strategy, every parameter has to be _fine tuned_, to maximaze the performance.

## What is Tuner

** _Tuner_ is a programmatic Uniswap V3 simulator that allows strategy backtesting on a transaction-to-transaction basis with arbitrary or historical data without the EVM, it runs independently yet completely retains the exact smart-contract behavior of the intricate design and implementation of Uniswap V3.**

## What Tuner does

** _Tuner_ is fundamentally a state machine, it can:**
> Completely replicate the tick-level calculation
- this means your strategy will run through the Uniswap V3 implementation logic instead of just the high-level mathematic model.
> Maintain the identical tick-level percision of prices, fees, and positions of Uniswap V3
- this means the result of your backtesting is true to the real performance with the minimum margin of deviations.
> Run fast
- the EVM is slow, the historical dataset is huge, the Ganache cannot do the job, so use _Tuner_.
> Fast-forward and rewind transactions 
- this means you can easily repeat a small portion of your test with a different set of parameters without the need to start over.
> Take or recover from a snapshot(state)
- this means you can run continuous regression test as your strategies constantly evolves.
> Branch out and runs in parallel 
- this means you can run multiple back-tests each with a different set of parameters at the same time and compare the performance.
> Persist historical data and strategy execution records in a SQLite database
- this means the strategists can do advanced statistical analysis both in real-time and after the testing.

## Installing Tuner
_TODO_

## Using Tuner

After you've installed Tuner, you must build a client to get access to its functions.

### `SimulatorClient`

A `SimulatorClient` is the user entry point of the Tuner.

```typescript
let clientInstace: SimulatorClient = await SimulatorClient.buildInstance("database.db");
```

The param there is a file path to persist execution records(By default any change will only exist in memory during a single run). Later you can load and print them, for comparing results and getting insights, or recovering from any state.

```typescript
let recoveredConfigurableCorePool: ConfigurableCorePool = await clientInstace.recoverCorePoolFromSnapshot(snapshotId);
```

If you forget any snapshotId, you can list and check all snapshots(created by state machine we will introduce in next section) by information like description or timestamp

```typescript
let snapshotProfiles: SnapshotProfile[] = await clientInstance.listSnapshotProfiles();
```

For now, let's init a core pool state machine from `PoolConfig`.

```typescript
let configurableCorePool: ConfigurableCorePool =
      clientInstace.initCorePoolFromConfig(
        SimulatorClient.buildPoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
      );
```

It's recommended to close the client when you finish with Tuner.

```typescript
await clientInstance.shutdown();
```

### `ConfigurableCorePool`

A `ConfigurableCorePool` is a state machine providing user operation interfaces. It is built on the math model aka `CorePool` of Uniswap v3 contract implementation.

First, let's initialize the pool and do some interactions.

```typescript
let sqrtPriceX96ForInitialization = JSBI.BigInt("4295128739");
await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
await configurableCorePool.mint(
      "0x01",
      -887272,
      887272,
      JSBI.BigInt("10860507277202")
    );
await configurableCorePool.swap(true, JSBI.BigInt("1000000"));
```

Pool state can be viewed on here.

```typescript
let corePoolView: CorePoolView = configurableCorePool.getCorePool();
```

You can set a post-processor after every interaction in this way.

```typescript
configurableCorePool.updatePostProcessor(
        (pool: IConfigurableCorePool, transition: Transition) => {
          console.log(pool.getPoolState().id);
		  console.log(transition.getRecord().id);
          return Promise.resolve();
        }
      );
```

Or set it on specific interaction.

```typescript
await configurableCorePool.mint(
       "0x01",
      -887272,
       887272,
        JSBI.BigInt("10860507277202"),
        (pool: IConfigurableCorePool, transition: Transition) => {
          console.log(pool.getPoolState().id);
		  console.log(transition.getRecord().id);
          return Promise.resolve();
        }
      );
```

Note: If any error happens during interaction or post process, the pool state will recover as state before interaction happens just like contract transaction reverts.

Every interaction corresponds to a `Transition`. A `Record` contains information about the action. Every core pool state corresponds to a `PoolState`. A `Transition` makes a `PoolState` change to next `PoolState` from the `Record`.

With an id of `PoolState`, you can recover the pool to any state it went through(actually as long as the `PoolState` exists in memory).

```typescript
configurableCorePool.recover(poolStateId);
```

Or just step back to last pool state.

```typescript
configurableCorePool.stepBack();
```

If a state is important enough for frequently recovering, you can take a snapshot to make the recover process faster.

```typescript
configurableCorePool.takeSnapshot("description for snapshot");
```

Then you can persist it to recover the pool from it next time running Tuner.

```typescript
let snapshotId = await configurableCorePool.persistSnapshot();
```

Sometime we want multiple instance to stand for as well as process various of possibilities, or split huge task to process it faster. You can use `fork` to do that.

```typescript
let forkedConfigurableCorePool = configurableCorePool.fork();
```

The forked pool will remain the same state as parent pool and can be manipulated independently.

Note: A pool from a config or a snapshot will be `undefined` with `poolState.fromTransition` while the first pool state of a forked pool will have a `poolState.fromTransition` with `ActionType.FORK` and a source pool state of its parent.

### `SimulatorRoadmapManager`

If we take every `ConfigurableCorePool` as a state machine, then a `SimulatorRoadmapManager` can be taken as `PoolState` container as well as `ConfigurableCorePool` manager. At this point, every state machine can be expanded as a roadmap of states route.

First let's get instance of `SimulatorRoadmapManager`(singleton) from SimulatorClient.

```typescript
let simulatorRoadmapManager: SimulatorRoadmapManager = clientInstance.simulatorRoadmapManager;
```

You can list and check all `ConfigurableCorePool` created by Tuner during this run.

```typescript
let pools: ConfigurableCorePool[] = await simulatorRoadmapManager.listRoutes();
```

With a `ConfigurableCorePool` id, Tuner can print route from the first pool state to current pool state of the state machine in pretty format.

```typescript
await simulatorRoadmapManager.printRoute(configurableCorePool.id);
```

Also you can persist the route for later statistics use.

```typescript
let roadmapId = await simulatorRoadmapManager.persistRoute(
        configurableCorePool.id,
        "description for roadmap"
      );
```

Then load the roadmap and print the route in pretty format too.

```typescript
await simulatorRoadmapManager.loadAndPrintRoute(roadmapId);
```

Note: As the storage scale of Uniswap V3 CorePool(especially for Ticks up to 160,000+ and unlimited Positions), frequent persistence of route as well as snapshot is not recommended. Please pay attention to space cost.

## Work To Do

About CorePool, now math model for interaction(`mint`, `burn`, `collect`, `swap`) and fee distribution is supported. As far as performance of test dataset(also included in repo), the calculation of replaying over 124,000 mainnet events can be done within 16s, and the error margin is within +-14 in minimum unit of 18 decimals token.

Oracle part is on the way.

## Contributing

Please create an issue for any questions.

Thanks and enjoy!
