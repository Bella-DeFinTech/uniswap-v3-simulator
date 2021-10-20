import { PoolState } from "../model/PoolState";

export type PoolStateView = Pick<
  PoolState,
  {
    [K in keyof PoolState]: PoolState[K] extends Function
      ? K extends "getTransitionSource" | "getTransitionTargets"
        ? K
        : never
      : K extends "transitionSource" | "transitionTargets"
      ? never
      : K;
  }[keyof PoolState]
>;
