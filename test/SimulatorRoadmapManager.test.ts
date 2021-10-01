import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { FeeAmount } from "../src/enum/FeeAmount";
import { PoolConfig } from "../src/model/PoolConfig";
import { ConfigurableCorePool as IConfigurableCorePool } from "../src/interface/ConfigurableCorePool";
import { ConfigurableCorePool } from "../src/core/ConfigurableCorePool";
import { DBManager } from "../src/manager/DBManager";
import { PoolState } from "../src/model/PoolState";
import { SimulatorRoadmapManager } from "../src/manager/SimulatorRoadmapManager";
import { SimulatorRoadmapManager as ISimulatorRoadmapManager } from "../src/interface/SimulatorRoadmapManager";
import JSBI from "jsbi";
import { TickMath } from "../src/util/TickMath";
import { PoolStateHelper } from "../src/util/PoolStateHelper";
import * as sinon from "sinon";

chai.use(chaiAsPromised);
const expect = chai.expect;
const testUser = "0x01";

describe("Test SimulatorRoadmapManager", async function () {
  let sandbox: sinon.SinonSandbox;
  let consoleLogSpy: sinon.SinonSpy;
  let dbManager: DBManager;
  let configurableCorePool: IConfigurableCorePool;
  let simulatorRoadmapManager: ISimulatorRoadmapManager;
  let sqrtPriceX96ForInitialization = JSBI.BigInt(
    "0x43efef20f018fdc58e7a5cf0416a"
  );

  async function makeConfigurableCorePool(): Promise<IConfigurableCorePool> {
    configurableCorePool = new ConfigurableCorePool(
      new PoolState(new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM))
    );
    await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
    await configurableCorePool.mint(
      testUser,
      TickMath.MIN_TICK,
      TickMath.MAX_TICK,
      JSBI.BigInt("10860507277202")
    );
    await configurableCorePool.swap(true, JSBI.BigInt("1000000"));
    return Promise.resolve(configurableCorePool);
  }

  beforeEach(async function () {
    sandbox = sinon.createSandbox();
    consoleLogSpy = sandbox.spy(console, "log");
    dbManager = await DBManager.buildInstance(":memory:");
    simulatorRoadmapManager = await SimulatorRoadmapManager.buildInstance();
    configurableCorePool = await makeConfigurableCorePool();
  });

  afterEach(async function () {
    sandbox.restore();
    await dbManager.close();
  });

  describe("Test route method", async function () {
    it("can print route", async function () {
      await simulatorRoadmapManager.printRoute(configurableCorePool.id);
      // 8 for 1-poolConfig 3-transition 4-poolState
      expect(consoleLogSpy.callCount).to.eql(8);
    });

    it("can persist route", async function () {
      let roadmapId = await simulatorRoadmapManager.persistRoute(
        configurableCorePool.id,
        "for test"
      );
      let roadmap = await dbManager.getRoadmap(roadmapId);
      expect(roadmap).to.not.be.undefined;
      expect(roadmap!.snapshots).to.have.lengthOf(
        PoolStateHelper.getPoolStateChainCount(
          configurableCorePool.getPoolState()
        )
      );
    });

    it("can list routes", async function () {
      configurableCorePool.fork();
      await makeConfigurableCorePool();
      let pools = await simulatorRoadmapManager.listRoutes();
      expect(pools).to.have.lengthOf(3);
      expect(pools[0].id).to.be.not.eql(pools[1].id);
      expect(pools[1].id).to.be.not.eql(pools[2].id);
    });

    it("load and print route", async function () {
      let roadmapId = await simulatorRoadmapManager.persistRoute(
        configurableCorePool.id,
        "for test"
      );
      await simulatorRoadmapManager.loadAndPrintRoute(roadmapId);
      // 5 for 1-roadmap 1-poolConfig 4-poolState
      expect(consoleLogSpy.callCount).to.eql(6);
    });
  });
});
