### Interacting with Core Pool

A `CorePool` corresponds to a contract of Uniswap V3 Core Pool. You can inspect its state like `sqrtPriceX96`, `tickCurrent`, `lquidity` and more detailed information on any `Tick` or `Position`.

```typescript
let corePoolView: CorePoolView = configurableCorePool.getCorePool();

corePoolView.tickCurrent;

corePoolView.getTick(tickIndex);

corePoolView.getPosition(owner, tickLower, tickUpper);
```

Also, you can interact with the pool by `mint`, `burn` and `swap`. However, while interacting with the pool, we recommend using `ConfigurableCorePool` to get full functionality of the Tuner.

Based on the `CorePool`, a `ConfigurableCorePool` is a state machine providing utilities like post-processor, fork, snapshot, step back and recover.

```typescript
let amount0: JSBI, amount1: JSBI;

({ amount0, amount1 } = await configurableCorePool.mint(
  testUser,
  tickLower,
  tickUpper,
  liquidity
));

({ amount0, amount1 } = await configurableCorePool.burn(
  testUser,
  tickLower,
  tickUpper,
  liquidity
));

({ amount0, amount1 } = await configurableCorePool.swap(
  zeroForOne,
  amountSpecified,
  sqrtPriceLimitX96
));
```

Since Tuner is focusing on the math model instead of token or stratgy, feel free to `mint`, `burn` and `swap` as you like, then observe whether things go as you expect.
