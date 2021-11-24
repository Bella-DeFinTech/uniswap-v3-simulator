import JSBI from "jsbi";
import { SwapEvent } from "../entity/SwapEvent";
import { CorePoolView } from "./CorePoolView";
import { PoolStateView } from "./PoolStateView";
import { Transition as TransitionView } from "./Transition";

export interface ConfigurableCorePool {
  readonly id: string;

  getPoolState(): PoolStateView;

  getCorePool(): CorePoolView;

  initialize(sqrtPriceX96: JSBI): Promise<void>;

  mint(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }>;

  burn(
    owner: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }>;

  collect(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount0Requested: JSBI,
    amount1Requested: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }>;

  swap(
    zeroForOne: boolean,
    amountSpecified: JSBI,
    sqrtPriceLimitX96?: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }>;

  querySwap(
    zeroForOne: boolean,
    amountSpecified: JSBI,
    sqrtPriceLimitX96?: JSBI
  ): Promise<{ amount0: JSBI; amount1: JSBI; sqrtPriceX96: JSBI }>;

  resolveInputFromSwapResultEvent(
    swapEvent: SwapEvent
  ): Promise<{ amountSpecified: JSBI; sqrtPriceX96?: JSBI }>;

  // user custom PostProcessor will be called after pool state transition finishes
  updatePostProcessor(
    callback: (
      configurableCorePool: ConfigurableCorePool,
      transition: TransitionView
    ) => Promise<void>
  ): void;

  takeSnapshot(description: string): boolean;

  fork(): ConfigurableCorePool;

  persistSnapshot(): Promise<string>;

  stepBack(): void;

  recover(poolStateId: string): void;
}
