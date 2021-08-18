import assert from "assert";
import { PositionManager } from "../src/manager/PositionManager";
import { Position } from "../src/model/Position";
import { Serializer } from "../src/util/Serializer";

describe("Test Serializer", function () {
  it("should do serialize/deserialize right", function () {
    let positionManager = new PositionManager();
    positionManager.set("test", new Position());
    let json = Serializer.serialize(PositionManager, positionManager);
    console.log(json);
    assert.ok(json);

    let object = Serializer.deserialize(PositionManager, json);
    console.log(object);
    assert.ok(object instanceof PositionManager);
  });
});
