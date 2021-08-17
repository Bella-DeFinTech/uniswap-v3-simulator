import { ActionType } from "../enum/ActionType";

export type Record = {
  id: string;
  eventId: number;
  actionType: ActionType;
  actionParams: object;
  timestamp: Date;
};
