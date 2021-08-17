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
