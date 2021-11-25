import { ethers } from "hardhat";
import { expect } from "chai";
import { ConfigurableCorePool } from "../../src/core/ConfigurableCorePool";
import { SQLiteSimulationDataManager } from "../../src/manager/SQLiteSimulationDataManager";
import { SimulatorRoadmapManager } from "../../src/manager/SimulatorRoadmapManager";
import { PoolState } from "../../src/model/PoolState";
import type { UniswapV3Pool2 } from "../typechain";
import { SimulationDataManager } from "../../src/interface/SimulationDataManager";
import { SimulatorConsoleVisitor } from "../../src/manager/SimulatorConsoleVisitor";
import { SimulatorPersistenceVisitor } from "../../src/manager/SimulatorPersistenceVisitor";

describe("Test Ticks", function () {
  it("should be identical between state of simulator implementation and mainnet state at certain block number", async function () {
    let simulationDataManager: SimulationDataManager =
      await SQLiteSimulationDataManager.buildInstance("./test/database.db");
    let simulatorRoadmapManager: SimulatorRoadmapManager =
      new SimulatorRoadmapManager(simulationDataManager);
    let snapshot = await simulationDataManager.getSnapshot(
      "9577f400-5012-4492-8f1f-44c6dcb5980c"
      // "f5d54d99-3148-4b9b-9661-73f3f229dce8"
    );
    let testPool = new ConfigurableCorePool(
      PoolState.from(snapshot!),
      simulatorRoadmapManager,
      new SimulatorConsoleVisitor(),
      new SimulatorPersistenceVisitor(simulationDataManager)
    );

    let blockNum: number = 12464951;
    // let blockNum: number = 12420636;

    let uniswapV3PoolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
    let uniswapV3Pool = (await ethers.getContractAt(
      "UniswapV3Pool2",
      uniswapV3PoolAddress
    )) as UniswapV3Pool2;

    let liquidityOnChain = await uniswapV3Pool.liquidity({
      blockTag: blockNum,
    });
    let slot0OnChain = await uniswapV3Pool.slot0({
      blockTag: blockNum,
    });
    let sqrtPriceOnChain = slot0OnChain.sqrtPriceX96;
    let currentTickIndexOnChain = slot0OnChain.tick;
    expect(liquidityOnChain.toString()).to.eql(
      testPool.getCorePool().liquidity.toString()
    );
    expect(sqrtPriceOnChain.toString()).to.eql(
      testPool.getCorePool().sqrtPriceX96.toString()
    );
    expect(currentTickIndexOnChain.toString()).to.eql(
      testPool.getCorePool().tickCurrent.toString()
    );

    // count: 29475 of legal available tick index between MIN_TICK and MAX_TICK
    function findAvailableTicks(): number[] {
      let minTick = 199080; //-887220;
      let maxTick = 200280; //887220;
      let ticks: number[] = [];
      let currTick = minTick;
      while (currTick <= maxTick) {
        ticks.push(currTick);
        currTick += 60;
      }
      return ticks;
    }

    let availableTicks = findAvailableTicks();

    for (let tickIndex of availableTicks) {
      let tickOnChain = await uniswapV3Pool.ticks(tickIndex, {
        blockTag: blockNum,
      });
      if (!tickOnChain.initialized) {
        continue;
      }
      let tickInTuner = testPool.getCorePool().getTick(tickIndex);
      expect(tickOnChain.initialized).to.be.true;
      expect(tickOnChain.liquidityGross.toString()).to.eql(
        tickInTuner.liquidityGross.toString()
      );
      expect(tickOnChain.liquidityNet.toString()).to.eql(
        tickInTuner.liquidityNet.toString()
      );
      expect(tickOnChain.feeGrowthOutside0X128.toString()).to.eql(
        tickInTuner.feeGrowthOutside0X128.toString()
      );
      expect(tickOnChain.feeGrowthOutside1X128.toString()).to.eql(
        tickInTuner.feeGrowthOutside1X128.toString()
      );
    }
    await simulationDataManager.close();
  });
});
