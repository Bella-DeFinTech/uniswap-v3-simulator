import { ActionType } from "../enum/ActionType";
import { MethodParams, ReturnParams } from "../interface/ActionParams";

export type Record = {
  id: string;
  actionType: ActionType;
  actionParams: MethodParams;
  actionReturnValues: ReturnParams;
  timestamp: Date;
};
