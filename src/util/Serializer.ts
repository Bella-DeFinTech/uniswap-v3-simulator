import JSBI from "jsbi";
import { TypedJSON } from "typedjson";
import { Constructor } from "typedjson/src/types";
import { ZERO } from "../enum/InternalConstants";

export abstract class Serializer {
  static serialize<T>(rootConstructor: Constructor<T>, object: T): string {
    let serializer = new TypedJSON(rootConstructor);
    return serializer.stringify(object);
  }

  static deserialize<T>(rootConstructor: Constructor<T>, jsonStr: string): T {
    let serializer = new TypedJSON(rootConstructor);
    return serializer.parse(jsonStr);
  }
}

export const JSBISerializer = (jsbi: JSBI): string => jsbi.toString();
export const JSBIDeserializer = (str: string): JSBI =>
  str == undefined ? ZERO : JSBI.BigInt(str);

export const NumberArraySerializer = (arr: Array<number>): string =>
  JSON.stringify(arr);
export const NumberArrayDeserializer = (str: string): Array<number> =>
  JSON.parse(str);

export function printParams(params: object): string {
  let str = "{";
  for (let key in params) {
    let value: any = params[key as keyof object];
    str += key + ": " + (isObject(value) ? value.toString() : value) + ", ";
  }
  if (str.lastIndexOf(" ") == str.length - 1) str = str.slice(0, -2);
  str += "}";
  return str;
}

function isObject(value: unknown): value is object {
  return typeof value === "object";
}
