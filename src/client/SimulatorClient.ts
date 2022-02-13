import { ConfigurableCorePool } from "../core/ConfigurableCorePool";
import { PoolState } from "../model/PoolState";
import { PoolConfig } from "../model/PoolConfig";
import { SimulationDataManager } from "../interface/SimulationDataManager";
import { Snapshot } from "../entity/Snapshot";
import { SimulatorRoadmapManager } from "../manager/SimulatorRoadmapManager";
import { SnapshotProfile } from "../entity/SnapshotProfile";
import { SimulatorRoadmapManager as ISimulatorRoadmapManager } from "../interface/SimulatorRoadmapManager";
import { ConfigurableCorePool as IConfigurableCorePool } from "../interface/ConfigurableCorePool";
import { SimulatorConsoleVisitor } from "../manager/SimulatorConsoleVisitor";
import { SimulatorPersistenceVisitor } from "../manager/SimulatorPersistenceVisitor";
import { EventDBManager } from "../manager/EventDBManager";
import { MainnetDataDownloader } from "./MainnetDataDownloader";
import {
  EndBlockTypeWhenInit,
  EndBlockTypeWhenRecover,
} from "../entity/EndBlockType";
import { EventDataSourceType } from "../enum/EventDataSourceType";

export class SimulatorClient {
  private simulatorDBManager: SimulationDataManager;
  private readonly _simulatorRoadmapManager: SimulatorRoadmapManager;

  public get simulatorRoadmapManager(): ISimulatorRoadmapManager {
    return this._simulatorRoadmapManager;
  }

  constructor(simulatorDBManager: SimulationDataManager) {
    this.simulatorDBManager = simulatorDBManager;
    this._simulatorRoadmapManager = new SimulatorRoadmapManager(
      simulatorDBManager
    );
  }

  async initCorePoolFromMainnet(
    poolName: string = "",
    poolAddress: string,
    endBlock: EndBlockTypeWhenInit,
    RPCProviderUrl: string | undefined = undefined,
    eventDataSourceType: EventDataSourceType = EventDataSourceType.SUBGRAPH
  ): Promise<IConfigurableCorePool> {
    let mainnetDataDownloader: MainnetDataDownloader =
      new MainnetDataDownloader(RPCProviderUrl, eventDataSourceType);
    await mainnetDataDownloader.download(poolName, poolAddress, endBlock);
    let eventDBFilePath = mainnetDataDownloader.generateMainnetEventDBFilePath(
      poolName,
      poolAddress
    );
    let eventDB = await EventDBManager.buildInstance(eventDBFilePath);
    try {
      let poolConfig = await eventDB.getPoolConfig();
      let configurableCorePool: IConfigurableCorePool =
        this.initCorePoolFromConfig(poolConfig!);
      if (endBlock == "afterDeployment") return configurableCorePool;
      let endBlockInNumber =
        await mainnetDataDownloader.parseEndBlockTypeWhenInit(
          endBlock,
          poolAddress
        );
      await mainnetDataDownloader.initializeAndReplayEvents(
        eventDB,
        configurableCorePool,
        endBlockInNumber,
        endBlock == "afterInitialization"
      );
      return configurableCorePool;
    } finally {
      await eventDB.close();
    }
  }

  async recoverFromMainnetEventDBFile(
    mainnetEventDBFilePath: string,
    endBlock: EndBlockTypeWhenRecover,
    RPCProviderUrl: string | undefined = undefined,
    eventDataSourceType: EventDataSourceType = EventDataSourceType.SUBGRAPH
  ): Promise<IConfigurableCorePool> {
    let mainnetDataDownloader: MainnetDataDownloader =
      new MainnetDataDownloader(RPCProviderUrl, eventDataSourceType);
    await mainnetDataDownloader.update(mainnetEventDBFilePath, endBlock);
    let { poolAddress } = mainnetDataDownloader.parseFromMainnetEventDBFilePath(
      mainnetEventDBFilePath
    );
    let eventDB = await EventDBManager.buildInstance(mainnetEventDBFilePath);
    try {
      let poolConfig = await eventDB.getPoolConfig();
      let configurableCorePool: IConfigurableCorePool =
        this.initCorePoolFromConfig(poolConfig!);
      if (endBlock == "afterDeployment") return configurableCorePool;
      let endBlockInNumber =
        await mainnetDataDownloader.parseEndBlockTypeWhenRecover(
          await eventDB.getLatestEventBlockNumber(),
          endBlock,
          poolAddress
        );
      await mainnetDataDownloader.initializeAndReplayEvents(
        eventDB,
        configurableCorePool,
        endBlockInNumber,
        endBlock == "afterInitialization"
      );
      return configurableCorePool;
    } finally {
      await eventDB.close();
    }
  }

  initCorePoolFromConfig(poolConfig: PoolConfig): IConfigurableCorePool {
    return new ConfigurableCorePool(
      new PoolState(poolConfig),
      this._simulatorRoadmapManager,
      new SimulatorConsoleVisitor(),
      new SimulatorPersistenceVisitor(this.simulatorDBManager)
    );
  }

  recoverCorePoolFromSnapshot(
    snapshotId: string
  ): Promise<IConfigurableCorePool> {
    return this.getSnapshot(snapshotId).then((snapshot: Snapshot | undefined) =>
      !snapshot
        ? Promise.reject("This snapshot doesn't exist!")
        : Promise.resolve(
            new ConfigurableCorePool(
              PoolState.from(snapshot),
              this._simulatorRoadmapManager,
              new SimulatorConsoleVisitor(),
              new SimulatorPersistenceVisitor(this.simulatorDBManager)
            )
          )
    );
  }

  listSnapshotProfiles(): Promise<SnapshotProfile[]> {
    return this.simulatorDBManager.getSnapshotProfiles();
  }

  shutdown(): Promise<void> {
    return this.simulatorDBManager.close();
  }

  private getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    return this.simulatorDBManager.getSnapshot(snapshotId);
  }
}
