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

describe("Test SimulatorClient static method", function () {
  it("can build instance", async function () {
    let clientInstance = await SimulatorClient.buildInstance();
    expect(clientInstance).to.be.an.instanceOf(SimulatorClient);
    return expect(clientInstance.shutdown()).to.eventually.be.fulfilled;
  });

  it("can build PoolConfig", async function () {
    expect(
      SimulatorClient.buildPoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
    ).to.be.an.instanceOf(PoolConfig);
  });
});

describe("Test SimulatorClient public method", function () {
  let clientInstance: SimulatorClient;

  beforeEach(async function () {
    clientInstance = await SimulatorClient.buildInstance();
  });

  afterEach(async function () {
    await clientInstance.shutdown();
  });

  it("can build ConfigurableCorePool instance", async function () {
    let configurableCorePool: IConfigurableCorePool =
      clientInstance.initCorePoolFromConfig(
        SimulatorClient.buildPoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
      );
    expect(configurableCorePool).to.be.an.instanceOf(ConfigurableCorePool);
  });

  describe("after some use", function () {
    let configurableCorePool: IConfigurableCorePool;
    let sqrtPriceX96ForInitialization = JSBI.BigInt("4295128739");
    beforeEach(async function () {
      configurableCorePool = clientInstance.initCorePoolFromConfig(
        SimulatorClient.buildPoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
      );
      await configurableCorePool.initialize(sqrtPriceX96ForInitialization);
    });

    it("can recover ConfigurableCorePool from a snapshot in persistence", async function () {
      let snapshotId = await configurableCorePool.persistSnapshot();
      let recoveredConfigurableCorePool =
        await clientInstance.recoverCorePoolFromSnapshot(snapshotId);
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
        clientInstance.listSnapshotProfiles()
      ).to.eventually.have.lengthOf(1);
    });
  });
});
