import { v4, validate } from "uuid";

export abstract class IdGenerator {
  static guid = v4;
  static validate = validate;
}
