import { SimulatorClient } from "../src/client/SimulatorClient";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { SimulationDataManager } from "../src/interface/SimulationDataManager";
import { SQLiteSimulationDataManager } from "../src/manager/SQLiteSimulationDataManager";
import { FeeAmount } from "../src/enum/FeeAmount";
import { PoolConfig } from "../src/model/PoolConfig";
import { ConfigurableCorePool as IConfigurableCorePool } from "../src/interface/ConfigurableCorePool";
import { ConfigurableCorePool } from "../src/core/ConfigurableCorePool";
import JSBI from "jsbi";
import { EndBlockTypeWhenRecover } from "../src/entity/EndBlockType";
import { exists } from "../src";
import { EventDataSourceType } from "../src/enum/EventDataSourceType";
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Test SimulatorClient v2", function () {
  it("can download or update events and build the core pool at any block tag", async function () {
    let simulationDataManager: SimulationDataManager =
      await SQLiteSimulationDataManager.buildInstance();
    let clientInstance = new SimulatorClient(simulationDataManager);

    let poolName = "events-test";
    // case 1
    // 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8
    // 12374077
    // case 2
    // 0x92560C178cE069CC014138eD3C2F5221Ba71f58a
    // 13578943

    let poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
    let endBlock: EndBlockTypeWhenRecover = 12374077;
    // Your customed RPCProviderUrl, or use config in tuner.config.js
    let RPCProviderUrl: string | undefined = undefined;
    // You can specify data source of events here, and Uniswap v3 Subgraph as default is recommended rather than RPC for at least 75% time saving.
    // Just a reminder, RPC endpoint is necessary for the simulator even if you choose to download events from Subgraph.
    let eventDataSourceType: EventDataSourceType = EventDataSourceType.SUBGRAPH;

    if (!exists(`${poolName}_${poolAddress}.db`)) {
      await clientInstance.initCorePoolFromMainnet(
        poolName,
        poolAddress,
        "afterDeployment",
        RPCProviderUrl,
        eventDataSourceType
      );
    }

    let configurableCorePool =
      await clientInstance.recoverFromMainnetEventDBFile(
        `${poolName}_${poolAddress}.db`,
        endBlock,
        RPCProviderUrl,
        eventDataSourceType
      );
    console.log(`tick: ${configurableCorePool.getCorePool().tickCurrent}`);
    console.log(
      `sqrtPriceX96: ${configurableCorePool
        .getCorePool()
        .sqrtPriceX96.toString()}`
    );

    await clientInstance.shutdown();
  });
});

describe("Test SimulatorClient static method", function () {
  it("can build instance", async function () {
    let simulationDataManager: SimulationDataManager =
      await SQLiteSimulationDataManager.buildInstance();
    let clientInstance = new SimulatorClient(simulationDataManager);
    expect(clientInstance).to.be.an.instanceOf(SimulatorClient);
    return expect(clientInstance.shutdown()).to.eventually.be.fulfilled;
  });

  it("can build PoolConfig", async function () {
    expect(
      new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
    ).to.be.an.instanceOf(PoolConfig);
  });
});

describe("Test SimulatorClient public method", function () {
  let clientInstance: SimulatorClient;

  beforeEach(async function () {
    let simulationDataManager: SimulationDataManager =
      await SQLiteSimulationDataManager.buildInstance();
    clientInstance = new SimulatorClient(simulationDataManager);
  });

  afterEach(async function () {
    await clientInstance.shutdown();
  });

  it("can build ConfigurableCorePool instance", async function () {
    let configurableCorePool: IConfigurableCorePool =
      clientInstance.initCorePoolFromConfig(
        new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
      );
    expect(configurableCorePool).to.be.an.instanceOf(ConfigurableCorePool);
  });

  describe("during simulation", function () {
    let configurableCorePool: IConfigurableCorePool;
    let sqrtPriceX96ForInitialization = JSBI.BigInt("4295128739");
    beforeEach(async function () {
      configurableCorePool = clientInstance.initCorePoolFromConfig(
        new PoolConfig(60, "USDC", "ETH", FeeAmount.MEDIUM)
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
