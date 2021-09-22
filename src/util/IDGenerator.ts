import { v4, validate } from "uuid";

export abstract class IDGenerator {
  static guid = v4;
  static validate = validate;
}
