import "reflect-metadata";
import { SerializeMetaKey } from "./decorator";

// base class for serialization 
export class Element {

    constructor() {
    }

    toJSON(): object {
        const json = {};
        Object.keys(this).forEach(property => {
            const serialize = Reflect.getMetadata(SerializeMetaKey, this, property);
            if (serialize) {
                if (this[property] instanceof Element) {
                    json[serialize] = this[property].toJSON();
                } else {
                    json[serialize] = this[property];
                }
            }
        });
        return json;
    }

    fromJSON(json: object) {
        json && Object.keys(this).forEach(property => {
            const serialize = Reflect.getMetadata(SerializeMetaKey, this, property);
            if (serialize) {
                if (this[property] instanceof Element) {
                    this[property].fromJSON(json[serialize]);
                } else {
                    this[property] = json[serialize];
                }
            }
        });
        return this;
    }

    print() {
        Object.keys(this).forEach(property => {
            console.log(property + ": " + this[property]);
        });
    }

}