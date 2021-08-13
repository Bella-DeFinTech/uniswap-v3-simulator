import "reflect-metadata";
export const SerializeMetaKey = "Serialize";

export function Serialize(name?: string) {
    return (target: Object, property: string): void => {
        Reflect.defineMetadata(SerializeMetaKey, name || property, target, property);
    };
}