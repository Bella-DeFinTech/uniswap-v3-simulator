import { EventDBManager } from "../src/manager/EventDBManager";
import { EventType } from "../src/enum/EventType";
import { ethers } from "hardhat";
import type { UniswapV3Pool2 } from "../src/typechain";

let liquidityEventDB: EventDBManager;
let swapEventDB: EventDBManager;
let poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
let fromBlock = 12777394;
let toBlock = 13556212; //13556212;
let batchSize = 500;

async function main() {
  liquidityEventDB = await EventDBManager.buildInstance(
    "liquidity_events_usdc_weth_3000.db"
  );
  swapEventDB = await EventDBManager.buildInstance(
    "swap_events_usdc_weth_3000.db"
  );
  let uniswapV3Pool = (await ethers.getContractAt(
    "UniswapV3Pool2",
    poolAddress
  )) as UniswapV3Pool2;

  while (fromBlock <= toBlock) {
    let endBlock =
      fromBlock + batchSize > toBlock ? toBlock : fromBlock + batchSize;
    await saveEvents(EventType.MINT, fromBlock, endBlock);
    await saveEvents(EventType.BURN, fromBlock, endBlock);
    await saveEvents(EventType.SWAP, fromBlock, endBlock);
    fromBlock += batchSize + 1;
  }

  async function saveEvents(
    eventType: EventType,
    fromBlock: number,
    toBlock: number
  ) {
    if (eventType == EventType.MINT) {
      let topic = uniswapV3Pool.filters.Mint();
      let events = await uniswapV3Pool.queryFilter(topic, fromBlock, toBlock);
      for (let event of events) {
        let block = await ethers.provider.getBlock(event.blockNumber);
        let date = new Date(block.timestamp * 1000);
        await liquidityEventDB.insertLiquidityEvent(
          eventType,
          event.args.amount.toString(),
          event.args.amount0.toString(),
          event.args.amount1.toString(),
          event.args.tickLower,
          event.args.tickUpper,
          event.blockNumber,
          event.transactionIndex,
          event.logIndex,
          date
        );
      }
    } else if (eventType == EventType.BURN) {
      let topic = uniswapV3Pool.filters.Burn();
      let events = await uniswapV3Pool.queryFilter(topic, fromBlock, toBlock);
      for (let event of events) {
        let block = await ethers.provider.getBlock(event.blockNumber);
        let date = new Date(block.timestamp * 1000);
        await liquidityEventDB.insertLiquidityEvent(
          eventType,
          event.args.amount.toString(),
          event.args.amount0.toString(),
          event.args.amount1.toString(),
          event.args.tickLower,
          event.args.tickUpper,
          event.blockNumber,
          event.transactionIndex,
          event.logIndex,
          date
        );
      }
    } else if (eventType == EventType.SWAP) {
      let topic = uniswapV3Pool.filters.Swap();
      let events = await uniswapV3Pool.queryFilter(topic, fromBlock, toBlock);
      for (let event of events) {
        let block = await ethers.provider.getBlock(event.blockNumber);
        let date = new Date(block.timestamp * 1000);
        await swapEventDB.insertSwapEvent(
          event.args.amount0.toString(),
          event.args.amount1.toString(),
          event.args.sqrtPriceX96.toString(),
          event.args.liquidity.toString(),
          event.args.tick,
          event.blockNumber,
          event.transactionIndex,
          event.logIndex,
          date
        );
      }
    }
  }
  await liquidityEventDB.close();
  await swapEventDB.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
