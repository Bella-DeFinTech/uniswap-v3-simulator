import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

export default {
  defaultNetwork: "hardhat",
  networks: {
    mainnet: {
      url: process.env.MAINNET_PROVIDER_URL,
    },
    hardhat: {
      forking: {
        url: process.env.FORKING_PROVIDER_URL,
        blockNumber: 12464951,
      },
      mining: {
        auto: true,
        interval: 0,
      },
      allowUnlimitedContractSize: false,
    },
  },
  paths: {
    sources: "./test/contracts/src",
    tests: "./test/contracts",
    cache: "./test/contracts/cache",
    artifacts: "./test/contracts/artifacts",
  },
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1, // 800,
      },
      metadata: {
        bytecodeHash: "none",
      },
    },
  },
  mocha: {
    timeout: 3600000,
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
  },
};
