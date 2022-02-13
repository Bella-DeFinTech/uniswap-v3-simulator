### Post-processor

A post-processor registered in `ConfigurableCorePool` works as an interceptor to execute callback function after executing an interaction. You can customize your handler function with `ConfigurableCorePool`(pool state after the interaction) and `TransitionView` exposed by the post-processor.

Take for example, when locating errors, you can check the state after executing an interaction from a large number of events, take the snapshot, think about what happened exactly and resume from that state later.

You can set a post-processor after every interaction in this way.

```typescript
configurableCorePool.updatePostProcessor(
  (pool: ConfigurableCorePool, transition: TransitionView) => {
    console.log(pool.getPoolState().id);
    console.log(transition.getRecord().id);
    return Promise.resolve();
  }
);
```

Or set it with a specific interaction.

```typescript
await configurableCorePool.mint(
  "0x01",
  -887272,
  887272,
  JSBI.BigInt("10860507277202"),
  (pool: ConfigurableCorePool, transition: TransitionView) => {
    console.log(pool.getPoolState().id);
    console.log(transition.getRecord().id);
    return Promise.resolve();
  }
);
```

Note: If any error happens during the interaction or the post process, the `ConfigurableCorePool` will recover as the state before that interaction happened, just like contract transaction reverts.
