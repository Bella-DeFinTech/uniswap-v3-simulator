import JSBI from "jsbi";
import { TypedJSON } from "typedjson";
import { Constructor } from "typedjson/src/types";

export abstract class Serializer {
  static serialize(rootConstructor: Constructor<any>, object: object): string {
    let serializer = new TypedJSON(rootConstructor);
    return serializer.stringify(object);
  }

  static deserialize(rootConstructor: Constructor<any>, json: string): object {
    let serializer = new TypedJSON(rootConstructor);
    return serializer.parse(json);
  }
}

export const JSBISerializer = (jsbi: JSBI): string => jsbi.toString();
export const JSBIDeserializer = (str: string): JSBI => JSBI.BigInt(str);

export const NumberArraySerializer = (arr: Array<number>): string => JSON.stringify(arr);
export const NumberArrayDeserializer = (str: string): Array<number> => JSON.parse(str);
