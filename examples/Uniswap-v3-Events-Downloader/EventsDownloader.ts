import { EndBlockTypeWhenInit, MainnetDataDownloader } from "../../src";

async function main() {
  let poolName = "events";
  let poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
  let endBlock: EndBlockTypeWhenInit = "afterInitialization";
  // It will use RPCProviderUrl in tuner.config.js if this is undefined.
  let RPCProviderUrl: string | undefined = undefined;
  let mainnetDataDownloader = new MainnetDataDownloader(RPCProviderUrl);
  await mainnetDataDownloader.download(poolName, poolAddress, endBlock);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
