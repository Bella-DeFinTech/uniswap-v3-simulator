import { SimulatorVisitor } from "./SimulatorVisitor";

export interface Visitable {
  accept(visitor: SimulatorVisitor): Promise<string>;
}
