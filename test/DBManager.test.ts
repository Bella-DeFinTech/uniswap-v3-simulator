import { DBManager } from "../src/manager/DBManager";
import { PoolState } from "../src/model/PoolState";
import { FeeAmount } from "../src/enum/FeeAmount";

describe("Test DBManager", async function () {
  it("can insert and query", async function () {
    let db = await DBManager.buildInstance(":memory:"); //database.db
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
    await db.persistSnapshot(poolState);
    let snapshot = await db.getSnapshot(snapshotId);
    console.log(snapshot);

    let snapshotProfiles = await db.getSnapshotProfiles();
    console.log(snapshotProfiles);
  });
});
