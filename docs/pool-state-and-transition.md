### PoolState & Transition

A `ConfigurableCorePool` is a state machine based on the math model aka `CorePool` of Uniswap v3 contract implementation.

Every core pool state corresponds to a `PoolState`. Every interaction(`mint`, `burn`, `swap`, `collect` and `fork`) corresponds to a `Transition`. A `Record` contains information about the action. A `Transition` makes a `PoolState` move to next `PoolState` according to the `Record`.
