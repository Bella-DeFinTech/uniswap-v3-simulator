import { EndBlockTypeWhenInit, BSCDataDownloader } from "../../src";
import { EventDataSourceType } from "../../src/enum/EventDataSourceType";
import dotenv from "dotenv";
import * as log4js from "log4js";

log4js.configure({
  appenders: {
    out: { type: "stdout" },
    app: { type: "fileSync", filename: "EventsDownloader.log" },
  },
  categories: { default: { appenders: ["out", "app"], level: "info" } },
});

const logger = log4js.getLogger("EventsDownloader");

// load .env file
dotenv.config();

async function main() {
  // eth/usdt
  let poolName = "eth";
  let poolAddress = "0xBe141893E4c6AD9272e8C04BAB7E6a10604501a5";
  let deploymentBlockNumber = 27254278;

  // let endBlock: EndBlockTypeWhenInit = "latest";

  // let endBlock: EndBlockTypeWhenInit = "afterInitialization";
  // It will use RPCProviderUrl in tuner.config.js if this is undefined.
  let RPCProviderUrl: string | undefined = undefined;
  // You can specify data source of events here, and Uniswap v3 Subgraph as default is recommended rather than RPC for at least 75% time saving.
  // Just a reminder, RPC endpoint is necessary for the simulator even if you choose to download events from Subgraph.
  let eventDataSourceType: EventDataSourceType = EventDataSourceType.SUBGRAPH;
  let mainnetDataDownloader = new BSCDataDownloader(
    RPCProviderUrl,
    eventDataSourceType
  );

  await mainnetDataDownloader.download(
    poolName,
    poolAddress,
    deploymentBlockNumber,
    deploymentBlockNumber
  );
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
