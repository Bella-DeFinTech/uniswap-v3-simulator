import assert from "assert";
import JSBI from "jsbi";

describe("Test JSBI", function () {
  it("division should rounds towards zero", function () {
    let a1 = JSBI.BigInt(-5);
    let b1 = JSBI.BigInt(2);
    assert.equal(JSBI.divide(a1, b1), -2);

    let a2 = JSBI.BigInt(5);
    let b2 = JSBI.BigInt(2);
    assert.equal(JSBI.divide(a2, b2), 2);
  });
});
