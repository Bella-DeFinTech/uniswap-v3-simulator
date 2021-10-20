import { DBManager } from "../src/manager/DBManager";
import { PoolState } from "../src/model/PoolState";
import { FeeAmount } from "../src/enum/FeeAmount";
import { ONE } from "../src/enum/InternalConstants";
import { TickManager } from "../src/manager/TickManager";
import { PositionManager } from "../src/manager/PositionManager";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Test DBManager", function () {
  let db: DBManager;

  beforeEach(async function () {
    db = new DBManager(":memory:");
    await db.initTables()
  });

  afterEach(async function () {
    await db.close();
  });

  describe("can query when table is blank", function () {
    it("can getPoolConfig", async function () {
      return expect(db.getPoolConfig("123")).to.eventually.be.undefined;
    });

    it("can getSnapshot", async function () {
      return expect(db.getSnapshot("123")).to.eventually.be.undefined;
    });

    // since case here is corner case related to db damage, change DBManager.insertSnapshot to public then toggle below
    // it("will throw error when get snapshot if pool config is missing", async function () {
    //   await db.insertSnapshot(
    //     "123",
    //     "12345",
    //     "for test",
    //     ONE,
    //     ONE,
    //     ONE,
    //     ONE,
    //     10,
    //     ONE,
    //     ONE,
    //     new TickManager(),
    //     new PositionManager(),
    //     new Date()
    //   );
    //   return expect(db.getSnapshot("123")).to.eventually.throw(
    //     "PoolConfig is of shortage!"
    //   );
    // });
  });

  describe("can insert and query", function () {
    let poolConfig = {
      id: "1234",
      tickSpacing: 60,
      token0: "USDC",
      token1: "ETH",
      fee: FeeAmount.MEDIUM,
    };
    let poolState = new PoolState(poolConfig);
    let snapshotId = poolState.id;
    poolState.takeSnapshot(
      "for test",
      ONE,
      ONE,
      ONE,
      ONE,
      10,
      ONE,
      ONE,
      new TickManager(),
      new PositionManager()
    );

    it("can persistSnapshot", async function () {
      return expect(db.persistSnapshot(poolState)).to.eventually.be.fulfilled;
    });

    it("can getSnapshot", async function () {
      await db.persistSnapshot(poolState);
      return expect(db.getSnapshot(snapshotId)).to.eventually.be.not.undefined;
    });

    it("can getSnapshotProfiles", async function () {
      await db.persistSnapshot(poolState);
      return expect(db.getSnapshotProfiles()).to.eventually.have.lengthOf(1);
    });
  });
});
