import { ActionType } from "../enum/ActionType";
import {
  BurnParams,
  CollectParams,
  ForkParams,
  GeneralReturnParams,
  InitializeParams,
  MintParams,
  SwapParams,
  VoidReturnParams,
} from "../interface/ActionParams";

export type Record = {
  id: string;
  actionType: ActionType;
  actionParams:
    | InitializeParams
    | MintParams
    | BurnParams
    | SwapParams
    | CollectParams
    | ForkParams;
  actionReturnValues: GeneralReturnParams | VoidReturnParams;
  timestamp: Date;
};
