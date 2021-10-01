import { SimulatorClient } from "../src/client/SimulatorClient";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { FeeAmount } from "../src/enum/FeeAmount";
import { PoolConfig } from "../src/model/PoolConfig";
import { ConfigurableCorePool as IConfigurableCorePool } from "../src/interface/ConfigurableCorePool";
import { ConfigurableCorePool } from "../src/core/ConfigurableCorePool";
import JSBI from "jsbi";
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Test SimulatorClient static method", async function () {
  it("can build instance", async function () {
    let clientInstace = await SimulatorClient.buildInstance();
    expect(clientInstace).to.be.an.instanceOf(SimulatorClient);
    return expect(clientInstace.shutdown()).to.eventually.be.fulfilled;
  });

  it("can build PoolConfig", async function () {
    expect(
      SimulatorClient.buildPoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
    ).to.be.an.instanceOf(PoolConfig);
  });
});

describe("Test SimulatorClient public method", async function () {
  let clientInstace: SimulatorClient;

  beforeEach(async function () {
    clientInstace = await SimulatorClient.buildInstance();
  });

  afterEach(async function () {
    await clientInstace.shutdown();
  });

  it("can build ConfigurableCorePool instance", async function () {
    let configurableCorePool: IConfigurableCorePool =
      clientInstace.initCorePoolFromConfig(
        SimulatorClient.buildPoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
      );
    expect(configurableCorePool).to.be.an.instanceOf(ConfigurableCorePool);
  });

  describe("after some use", async function () {
    let configurableCorePool: IConfigurableCorePool;
    let sqrtPriceX96ForInitialization = JSBI.BigInt("4295128739");
    beforeEach(async function () {
      configurableCorePool = clientInstace.initCorePoolFromConfig(
        SimulatorClient.buildPoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
      );
      await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
    });

    it("can recover ConfigurableCorePool from a snapshot in persistence", async function () {
      let snapshotId = await configurableCorePool.persistSnapshot();
      let recoveredConfigurableCorePool =
        await clientInstace.recoverCorePoolFromSnapshot(snapshotId);
      expect(recoveredConfigurableCorePool).to.be.an.instanceOf(
        ConfigurableCorePool
      );
      expect(recoveredConfigurableCorePool.getCorePool().sqrtPriceX96).to.eql(
        sqrtPriceX96ForInitialization
      );
    });

    it("can list snapshot profiles", async function () {
      await configurableCorePool.persistSnapshot();
      return expect(
        clientInstace.listSnapshotProfiles()
      ).to.eventually.have.lengthOf(1);
    });
  });
});
