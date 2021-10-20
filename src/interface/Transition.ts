import { PoolStateView } from "./PoolStateView";
import { Record } from "../entity/Record";

export interface Transition {
  getSource(): PoolStateView;
  getTarget(): PoolStateView;
  getRecord(): Record;
}
