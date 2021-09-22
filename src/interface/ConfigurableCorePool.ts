import JSBI from "jsbi";
import { CorePool } from "../core/CorePool";
import { Transition } from "../model/Transition";

export interface ConfigurableCorePool {
  readonly id: string;

  getPoolStateId(): string;

  // This returning CorePool is for inspection use only.
  // Calling write method on it or its property directly will jeopardize simulator function.
  getCorePool(): CorePool;

  initialize(sqrtPriceX96: JSBI): Promise<void>;

  mint(
    recipient: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }>;

  burn(
    owner: string,
    tickLower: number,
    tickUpper: number,
    amount: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
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
      transition: Transition
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }>;

  swap(
    zeroForOne: boolean,
    amountSpecified: JSBI,
    sqrtPriceLimitX96: JSBI,
    postProcessorCallback?: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ): Promise<{ amount0: JSBI; amount1: JSBI }>;

  // user custom PostProcessor will be called after pool state transition finishes
  updatePostProcessor(
    callback: (
      configurableCorePool: ConfigurableCorePool,
      transition: Transition
    ) => Promise<void>
  ): void;

  takeSnapshot(description: string): boolean;

  fork(): ConfigurableCorePool;

  persistSnapshot(): Promise<string>;

  stepBack(): void;

  recover(poolStateId: string): void;
}
