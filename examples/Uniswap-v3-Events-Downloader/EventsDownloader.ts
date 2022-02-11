import { EndBlockTypeWhenInit, MainnetDataDownloader } from "../../src";
import { EventDataSourceType } from "../../src/enum/EventDataSourceType";

async function main() {
  let poolName = "events";
  let poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
  let endBlock: EndBlockTypeWhenInit = "afterInitialization";
  // It will use RPCProviderUrl in tuner.config.js if this is undefined.
  let RPCProviderUrl: string | undefined = undefined;
  // You can specify data source of events here, and Uniswap v3 Subgraph as default is recommended rather than RPC for at least 75% time saving.
  // Just a reminder, RPC endpoint is necessary for the simulator even if you choose to download events from Subgraph.
  let eventDataSourceType: EventDataSourceType = EventDataSourceType.SUBGRAPH;
  let mainnetDataDownloader = new MainnetDataDownloader(
    RPCProviderUrl,
    eventDataSourceType
  );
  await mainnetDataDownloader.download(poolName, poolAddress, endBlock);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
