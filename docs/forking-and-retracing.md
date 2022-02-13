### Forking & Retracing

During the lifetime of a program, Tuner will record every step that a `ConfigurableCorePool` went through in memory. With an id of `PoolState`, you can let the pool recover to that state.

```typescript
// current state: foo
let poolStateId: string = configurableCorePool.getPoolState().id;

// some transactions...
// current state: bar

configurableCorePool.recover(poolStateId);
// current state: foo
```

Or just let the pool step back to last state.

```typescript
// current state: foo
let poolStateId: string = configurableCorePool.getPoolState().id;

// one transaction...
// current state: bar

configurableCorePool.stepBack();
// current state: foo
```

Sometime we want multiple instances to try out various of possibilities from current state, it's good time using `fork` to do that.

```typescript
let forkedConfigurableCorePool: ConfigurableCorePool =
  configurableCorePool.fork();

// some transactions with configurableCorePool...

// some transactions with forkedConfigurableCorePool...
```

The forked pool will remain the same state as its parent and the two pools act independently.

Note: `poolState.fromTransition` of a pool built from a `PoolConfig` or recovered from a snapshot will be `undefined` while `poolState.fromTransition` of a forked pool will have a `Record` with `ActionType.FORK` and its parent as source `PoolState`.
