import { Position } from "../model/Position";

export type PositionView = Pick<
  Position,
  {
    [K in keyof Position]: Position[K] extends Function ? never : K;
  }[keyof Position]
>;
