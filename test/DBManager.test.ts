import { DBManager } from "../src/manager/DBManager";
import { PoolState } from "../src/model/PoolState";
import { FeeAmount } from "../src/enum/FeeAmount";
// import { ONE } from "../src/enum/InternalConstants";
// import { TickManager } from "../src/manager/TickManager";
// import { PositionManager } from "../src/manager/PositionManager";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Test DBManager", async function () {
  let db: DBManager;

  beforeEach(async function () {
    db = await DBManager.buildInstance(":memory:");
  });

  afterEach(async function () {
    await db.close();
  });

  it("can query when table is blank", async function () {
    expect(db.getPoolConfig("123")).to.eventually.be.undefined;
    expect(db.getSnapshot("123")).to.eventually.be.undefined;

    // since case here is corner case related to db damage, change DBManager.insertSnapshot to public then toggle below
    // await db.insertSnapshot(
    //   "123",
    //   "12345",
    //   "for test",
    //   ONE,
    //   ONE,
    //   ONE,
    //   ONE,
    //   10,
    //   ONE,
    //   ONE,
    //   new TickManager(),
    //   new PositionManager(),
    //   new Date()
    // );
    // expect(db.getSnapshot("123")).to.eventually.throw("PoolConfig is of shortage!");
  });

  it("can insert and query", async function () {
    let snapshotId = "123";
    let poolConfig = {
      id: "1234",
      tickSpacing: 60,
      token0: "USDC",
      token1: "ETH",
      fee: FeeAmount.MEDIUM,
    };
    let poolState = new PoolState(poolConfig);
    poolState.takeSnapshot();
    expect(db.persistSnapshot(poolState)).to.eventually.be.fulfilled;
    expect(db.getSnapshot(snapshotId)).to.eventually.be.not.undefined;
    expect(db.getSnapshotProfiles()).to.eventually.have.lengthOf(1);
  });
});
