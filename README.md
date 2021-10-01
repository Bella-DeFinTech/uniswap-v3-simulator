# the "_Tuner_", a Uniswap V3 Simulator

> Before an ochestra, every musical instrument has to be _in-tune_, to ensure an outstanding performance.
> 
> Before running a strategy, every parameter has to be _fine tuned_, to maximaze the performance.

### _Tuner_ is a programmatic Uniswap V3 simulator that allows strategy backtesting on a transaction-to-transaction basis with arbitrary or historical data without the EVM, it runs independently yet completely retains the exact smart-contract behavior of the intricate design and implementation of Uniswap V3.

#### _Tuner_ is fundamentally a state machine, it can:
> Completely replicate the tick-level calculation
- this means your strategy will run through the Uniswap V3 implementation logic instead of just the high-level mathematic model.
> Maintain the identical tick-level percision of prices, fees, and positions of Uniswap V3
- this means the result of your backtesting is true to the real performance with the minimum margin of deviations.
> Run fast
- the EVM is slow, the historical dataset is huge, the Ganache cannot do the job, so use _Tuner_.
> Fast-forward and rewind transactions 
- this means you can easily repeat a small portion of your test with a different set of parameters without the need to start over.
> Take or recover from a snapshot(state)
- this means if you can run continuous regression test as your strategies constantly evolves.
> Branch out and runs in parallel 
- this means you can run multiple back-tests each with a different set of parameters at the same time and compare the performance.
> Persist historical data and strategy execution records in a SQLite database
- this means the strategists can use __Tuner__ to do advanced statistical analysis both in real-time and after the testing.
