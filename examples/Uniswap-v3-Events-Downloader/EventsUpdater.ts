import {
  EndBlockTypeWhenRecover,
  BSCDataDownloader,
  EventDBManager,
} from "../../src";
import { EventDataSourceType } from "../../src/enum/EventDataSourceType";
import dotenv from "dotenv";
import * as log4js from "log4js";

// load .env file
dotenv.config();

log4js.configure({
  appenders: {
    out: { type: "stdout", level: "info" },
    app: { type: "fileSync", filename: "EventsUpdater.log", level: "info" },
  },
  categories: { default: { appenders: ["out", "app"], level: "info" } },
});

const logger = log4js.getLogger("EventsUpdater");

async function main() {
  // let endBlock: EndBlockTypeWhenRecover = "latestDownloaded";
  // It will use RPCProviderUrl in tuner.config.js if this is undefined.
  let RPCProviderUrl: string | undefined = undefined;
  // You can specify data source of events here, and Uniswap v3 Subgraph as default is recommended rather than RPC for at least 75% time saving.
  // Just a reminder, RPC endpoint is necessary for the simulator even if you choose to download events from Subgraph.
  let eventDataSourceType: EventDataSourceType = EventDataSourceType.SUBGRAPH;
  let mainnetEventDBFilePath =
    "eth_0xBe141893E4c6AD9272e8C04BAB7E6a10604501a5.db";
  let mainnetDataDownloader = new BSCDataDownloader(
    RPCProviderUrl,
    eventDataSourceType
  );

  let endBlock: EndBlockTypeWhenRecover = "latestOnChain";
  await mainnetDataDownloader.update(mainnetEventDBFilePath, endBlock);

  // await mainnetDataDownloader.replaceLiquidityEventsFromSubgraphToRPC(
  //   mainnetEventDBFilePath
  // );

  // Pre-process events only
  // let { poolAddress } = mainnetDataDownloader.parseFromMainnetEventDBFilePath(
  //   mainnetEventDBFilePath
  // );
  // let eventDB = await EventDBManager.buildInstance(mainnetEventDBFilePath);
  // await mainnetDataDownloader.preProcessEvents(poolAddress, eventDB);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });

process.on("exit", () => {
  log4js.shutdown(() => {
    console.log("log has been flushed and closed");
  });
});
