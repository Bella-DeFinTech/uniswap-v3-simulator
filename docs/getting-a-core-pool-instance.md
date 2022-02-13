### Getting a Core Pool instance

A simple way to get a Core Pool instance is to build a new one according to the `PoolConfig`.

```typescript
let configurableCorePool: IConfigurableCorePool =
  clientInstance.initCorePoolFromConfig(
    new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
  );
```

And then don't forget to initialize that before executing any interaction.

```typescript
let sqrtPriceX96ForInitialization = JSBI.BigInt("4295128739");
await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
```
