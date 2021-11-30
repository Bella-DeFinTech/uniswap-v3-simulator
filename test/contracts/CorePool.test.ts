import { ethers, waffle } from "hardhat";
import { Wallet } from "ethers";
import type { UniswapV3Factory2, UniswapV3Pool2 } from "../typechain";
import { FeeAmount } from "../../src/enum/FeeAmount";

describe("Test Uniswap v3 CorePool", function () {
  const createFixtureLoader = waffle.createFixtureLoader;
  let loadFixture: ReturnType<typeof createFixtureLoader>;
  let deployer: Wallet;
  let uniswapV3PoolAddressOnMainnet =
    "0x92560C178cE069CC014138eD3C2F5221Ba71f58a";
  //  "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
  let sqrtPriceX96ForInitialization = "2505290050365003892876723467";

  let tokenA: string = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  let tokenB: string = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
  let fee: number = FeeAmount.MEDIUM;
  let tickSpacing = 60;

  let uniswapV3Factory: UniswapV3Factory2;
  let uniswapV3Pool: UniswapV3Pool2;

  before("create fixture loader", async function () {
    [deployer] = await (ethers as any).getSigners();
    loadFixture = createFixtureLoader([deployer]);
  });

  interface FactoryFixture {
    uniswapV3Factory: UniswapV3Factory2;
  }

  interface PoolFixture extends FactoryFixture {
    uniswapV3Pool: UniswapV3Pool2;
  }

  async function fixture(wallets: Wallet[]): Promise<PoolFixture> {
    // if we want to test contract identical to Uniswap v3-core repo, use this

    // import {
    //   abi as FACTORY_ABI,
    //   bytecode as FACTORY_BYTECODE,
    // } from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";

    // let contractFactory = new ContractFactory(
    //   FACTORY_ABI,
    //   FACTORY_BYTECODE,
    //   wallets[0]
    // );
    // let uniswapV3Factory = (await contractFactory.deploy()) as UniswapV3Factory2;

    let uniswapV3FactoryFactory = await ethers.getContractFactory(
      "UniswapV3Factory2"
    );
    let uniswapV3Factory =
      (await uniswapV3FactoryFactory.deploy()) as UniswapV3Factory2;
    await uniswapV3Factory.deployed();

    await uniswapV3Factory.createPool(tokenA, tokenB, fee);
    let poolAddress = await uniswapV3Factory.getPool(tokenA, tokenB, fee);

    let uniswapV3Pool = (await ethers.getContractAt(
      "UniswapV3Pool2",
      poolAddress
    )) as UniswapV3Pool2;

    await uniswapV3Pool.initialize(sqrtPriceX96ForInitialization);

    return { uniswapV3Factory, uniswapV3Pool };
  }

  beforeEach("deploy fixture", async function () {
    ({ uniswapV3Factory, uniswapV3Pool } = await loadFixture(fixture));
  });

  it("can be deployed succussfully", async function () {
    console.log(uniswapV3Factory.address);
    console.log(uniswapV3Pool.address);
    console.log(await uniswapV3Pool.tickSpacing());
  });

  it("results on swap event id 15488", async function () {
    // setup corepool states as event id 15487 finishes
    let uniswapV3PoolOnMainnet = (await ethers.getContractAt(
      "UniswapV3Pool2",
      uniswapV3PoolAddressOnMainnet
    )) as UniswapV3Pool2;
    let minTick = 199080; // -887220;
    let maxTick = 200280; // 887220;
    let liquidity = await uniswapV3PoolOnMainnet.liquidity();
    let feeGrowthGlobal0X128 =
      await uniswapV3PoolOnMainnet.feeGrowthGlobal0X128();
    let feeGrowthGlobal1X128 =
      await uniswapV3PoolOnMainnet.feeGrowthGlobal1X128();
    let slot0OnMainnet = await uniswapV3PoolOnMainnet.slot0();
    let tickCurrent = slot0OnMainnet.tick;
    let sqrtPriceX96 = slot0OnMainnet.sqrtPriceX96;

    await uniswapV3Pool.setState(
      tickCurrent,
      sqrtPriceX96,
      liquidity,
      feeGrowthGlobal0X128,
      feeGrowthGlobal1X128
    );
    console.log("pool global state setup successfully!");

    // let relatedTicks = findRelatedTicks(minTick, maxTick);
    let relatedTicks = [49800, 64020];
    let relatedTickBitmapWordPoses =
      findRelatedTickBitmapWordPoses(relatedTicks);
    for (let tickIndex of relatedTicks) {
      let tickInfo = await uniswapV3PoolOnMainnet.ticks(tickIndex);
      await uniswapV3Pool.setTickInfo(
        tickIndex,
        tickInfo.liquidityGross,
        tickInfo.liquidityNet,
        tickInfo.feeGrowthOutside0X128,
        tickInfo.feeGrowthOutside1X128,
        tickInfo.initialized
      );
    }
    console.log("pool tick-level state setup successfully!");

    for (let wordPos of relatedTickBitmapWordPoses) {
      let wordVal = await uniswapV3PoolOnMainnet.tickBitmap(wordPos);
      await uniswapV3Pool.setTickBitmap(wordPos, wordVal);
    }
    console.log("pool tick-bitmap state setup successfully!");

    // // do swap as event id 15488
    // let trx = await uniswapV3Pool.swap(
    //   deployer.address,
    //   false,
    //   "500000000000000000000",
    //   "1461446703485210103287273052203988822378723970341",
    //   []
    // );

    // do swap as event id 10
    let trx = await uniswapV3Pool.swap(
      deployer.address,
      false,
      "-184363245697871389668",
      // "820850720170027688",
      "4295128740",
      []
    );

    let receipt = await trx.wait();
    let event = receipt.events![0].args!;
    console.log(event);
    console.log(event.amount0.toString());
    console.log(event.amount1.toString());
    console.log(event.sqrtPriceX96.toString());
  });

  function findRelatedTicks(minTick: number, maxTick: number): number[] {
    let ticks: number[] = [];
    let currTick = minTick;
    while (currTick <= maxTick) {
      ticks.push(currTick);
      currTick += tickSpacing;
    }
    return ticks;
  }

  function findRelatedTickBitmapWordPoses(ticks: number[]): number[] {
    let bitmapWordPoses: number[] = [];
    for (let tickIndex of ticks) {
      let bitmapWordPos = (tickIndex / tickSpacing) >> 8;
      if (
        bitmapWordPoses.length == 0 ||
        bitmapWordPoses[bitmapWordPoses.length - 1] < bitmapWordPos
      )
        bitmapWordPoses.push(bitmapWordPos);
    }
    return bitmapWordPoses;
  }
});
