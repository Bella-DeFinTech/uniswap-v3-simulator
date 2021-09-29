import { CorePool } from "../core/CorePool";

export type CorePoolView = Pick<
  CorePool,
  {
    [K in keyof CorePool]-?: CorePool[K] extends Function
      ? K extends "getTick" | "getPosition" | "querySwap"
        ? K
        : never
      : K;
  }[keyof CorePool]
>;
