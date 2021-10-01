import { PoolState } from "../model/PoolState";

export type PoolStateView = Pick<
  PoolState,
  {
    [K in keyof PoolState]: PoolState[K] extends Function
      ? K extends "getFromTransition" | "getTransitions"
        ? K
        : never
      : K extends "fromTransition" | "transitions"
      ? never
      : K;
  }[keyof PoolState]
>;
