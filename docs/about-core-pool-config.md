### About Core Pool Config

A `PoolConfig` is a group of key meta parameters of an Uniswap V3 Core Pool. In details, `TickSpacing`, `Token0Address`, `Token1Address`, and `FeeAmount`.

If you want to build a Core Pool from scratch to study something about the math model, you have to build it manually before build that pool. And it won't bother you if you want to get an instance from the state of some existed core pool on chain.

```typescript
let configurableCorePool: IConfigurableCorePool =
  clientInstance.initCorePoolFromConfig(
    new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
  );
```
