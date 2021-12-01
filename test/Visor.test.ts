import { SQLiteSimulationDataManager } from "../src/manager/SQLiteSimulationDataManager";
import { SimulationDataManager } from "../src/interface/SimulationDataManager";
import { loadConfig } from "../src/config/TunerConfig";
import { providers } from "ethers";
import { Visor__factory as VisorFactory } from "../src/typechain/factories/Visor__factory";
import { MainnetDataDownloader, SimulatorClient } from "../src";

describe("Test Visor Exploit", function () {
  const poolName = "verify";
  const poolAddress = "0xF1B63cD9d80f922514c04b0fD0a30373316dd75b";
  const visorAddress = "0x65Bc5c6A2630a87C2B494f36148E338dD76C054F";
  const blockNum = 13683699;
  const tunerConfig = loadConfig(undefined);
  const RPCProviderUrl = tunerConfig.RPCProviderUrl;

  it.only("download events", async function () {
    let mainnetDataDownloader = new MainnetDataDownloader(RPCProviderUrl);
    await mainnetDataDownloader.download(
      poolName,
      poolAddress,
      blockNum + 1000
    );
  });

  it("verify attack situation", async function () {
    let simulationDataManager: SimulationDataManager =
      await SQLiteSimulationDataManager.buildInstance("./test/database.db");

    let RPCProvider = new providers.JsonRpcProvider(RPCProviderUrl);

    let visor = VisorFactory.connect(visorAddress, RPCProvider);

    let totalSupply = await visor.totalSupply({
      blockTag: blockNum,
    });

    // set visor simulator
    let clientInstance = new SimulatorClient(simulationDataManager);
    let configurableCorePool =
      await clientInstance.recoverFromMainnetEventDBFile(
        `${poolName}_${visorAddress}.db`,
        blockNum,
        RPCProviderUrl
      );
  });
});
