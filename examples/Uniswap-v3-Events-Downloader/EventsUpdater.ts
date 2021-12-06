import { EndBlockTypeWhenRecover, MainnetDataDownloader } from "../../src";

async function main() {
  let endBlock: EndBlockTypeWhenRecover = "latestDownloaded";
  // It will use RPCProviderUrl in tuner.config.js if this is undefined.
  let RPCProviderUrl: string | undefined = undefined;
  let mainnetEventDBFilePath =
    "events_0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8.db";
  let mainnetDataDownloader = new MainnetDataDownloader(RPCProviderUrl);
  await mainnetDataDownloader.update(mainnetEventDBFilePath, endBlock);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
