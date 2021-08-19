import "@typechain/hardhat";

export default {
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
    externalArtifacts: [
      "./node_modules/@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/*.json",
      "./node_modules/@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/*.json",
      "./node_modules/@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/*.json",
      "./node_modules/@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/*.json",
    ],
  },
  solidity: "0.7.3",
};
