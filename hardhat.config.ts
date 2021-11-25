import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

export default {
  defaultNetwork: "mainnet",
  networks: {
    mainnet: {
      url: process.env.MAINNET_PROVIDER_URL,
    },
    hardhat: {
      // forking: {
      //   url: process.env.FORKING_PROVIDER_URL,
      //   blockNumber: 12464951,
      // },
      // mining: {
      //   auto: true,
      //   interval: 0,
      // },
      // allowUnlimitedContractSize: false,
    },
  },
  paths: {
    sources: "./src/contracts",
    tests: "./test/contracts",
    cache: "./cache",
    artifacts: "./artifacts",
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
    outDir: "src/typechain",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
  },
};
