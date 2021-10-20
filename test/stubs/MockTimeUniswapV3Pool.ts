import { EventFilter, BigNumber, BigNumberish, Signer } from "ethers";
import { ContractTransaction } from "@ethersproject/contracts";
import {
  Listener,
  Provider,
  TransactionResponse,
} from "@ethersproject/providers";
import { BytesLike } from "@ethersproject/bytes";

export class MockTimeUniswapV3Pool {
  address: string = "";

  connect(signerOrProvider: Signer | Provider | string): this {
    return this;
  }
  attach(addressOrName: string): this {
    return this;
  }
  deployed(): Promise<this> {
    return new Promise((resolve) => {});
  }

  on(event: EventFilter | string, listener: Listener): this {
    return this;
  }
  once(event: EventFilter | string, listener: Listener): this {
    return this;
  }
  addListener(eventName: EventFilter | string, listener: Listener): this {
    return this;
  }
  removeAllListeners(eventName: EventFilter | string): this {
    return this;
  }
  removeListener(eventName: any, listener: Listener): this {
    return this;
  }

  advanceTime(by: BigNumberish): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  burn(
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount: BigNumberish
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  collectStatic(
    recipient: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount0Requested: BigNumberish,
    amount1Requested: BigNumberish
  ): Promise<{
    amount0: BigNumber;
    amount1: BigNumber;
    0: BigNumber;
    1: BigNumber;
  }> {
    return new Promise((resolve) => {});
  }

  collect(
    recipient: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount0Requested: BigNumberish,
    amount1Requested: BigNumberish
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  collectProtocolStatic(
    recipient: string,
    amount0Requested: BigNumberish,
    amount1Requested: BigNumberish
  ): Promise<{
    amount0: BigNumber;
    amount1: BigNumber;
    0: BigNumber;
    1: BigNumber;
  }> {
    return new Promise((resolve) => {});
  }

  collectProtocol(
    recipient: string,
    amount0Requested: BigNumberish,
    amount1Requested: BigNumberish
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  factory(): Promise<string> {
    return new Promise((resolve) => {});
  }

  fee(): Promise<number> {
    return new Promise((resolve) => {});
  }

  feeGrowthGlobal0X128(): Promise<BigNumber> {
    return new Promise((resolve) => {});
  }

  feeGrowthGlobal1X128(): Promise<BigNumber> {
    return new Promise((resolve) => {});
  }

  flash(
    recipient: string,
    amount0: BigNumberish,
    amount1: BigNumberish,
    data: BytesLike
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  increaseObservationCardinalityNext(
    observationCardinalityNext: BigNumberish
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  // initialize(sqrtPriceX96: BigNumberish): Promise<ContractTransaction> {
  //   return new Promise((resolve) => {});
  // }
  initialize(sqrtPriceX96: BigNumberish): void {
    return;
  }

  liquidity(): Promise<BigNumber> {
    return new Promise((resolve) => {});
  }

  maxLiquidityPerTick(): Promise<BigNumber> {
    return new Promise((resolve) => {});
  }

  mint(
    recipient: string,
    tickLower: BigNumberish,
    tickUpper: BigNumberish,
    amount: BigNumberish,
    data: BytesLike
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  observations(arg0: BigNumberish): Promise<{
    blockTimestamp: number;
    tickCumulative: BigNumber;
    secondsPerLiquidityCumulativeX128: BigNumber;
    initialized: boolean;
    0: number;
    1: BigNumber;
    2: BigNumber;
    3: boolean;
  }> {
    return new Promise((resolve) => {});
  }

  observe(secondsAgos: BigNumberish[]): Promise<{
    tickCumulatives: BigNumber[];
    secondsPerLiquidityCumulativeX128s: BigNumber[];
    0: BigNumber[];
    1: BigNumber[];
  }> {
    return new Promise((resolve) => {});
  }

  positions(arg0: BytesLike): Promise<{
    liquidity: BigNumber;
    feeGrowthInside0LastX128: BigNumber;
    feeGrowthInside1LastX128: BigNumber;
    tokensOwed0: BigNumber;
    tokensOwed1: BigNumber;
    0: BigNumber;
    1: BigNumber;
    2: BigNumber;
    3: BigNumber;
    4: BigNumber;
  }> {
    return new Promise((resolve) => {});
  }

  protocolFees(): Promise<{
    token0: BigNumber;
    token1: BigNumber;
    0: BigNumber;
    1: BigNumber;
  }> {
    return new Promise((resolve) => {});
  }

  setFeeGrowthGlobal0X128(
    _feeGrowthGlobal0X128: BigNumberish
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  setFeeGrowthGlobal1X128(
    _feeGrowthGlobal1X128: BigNumberish
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  setFeeProtocol(
    feeProtocol0: BigNumberish,
    feeProtocol1: BigNumberish
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  slot0(): Promise<{
    sqrtPriceX96: BigNumber;
    tick: number;
    observationIndex: number;
    observationCardinality: number;
    observationCardinalityNext: number;
    feeProtocol: number;
    unlocked: boolean;
    0: BigNumber;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: boolean;
  }> {
    return new Promise((resolve) => {});
  }

  snapshotCumulativesInside(
    tickLower: BigNumberish,
    tickUpper: BigNumberish
  ): Promise<{
    tickCumulativeInside: BigNumber;
    secondsPerLiquidityInsideX128: BigNumber;
    secondsInside: number;
    0: BigNumber;
    1: BigNumber;
    2: number;
  }> {
    return new Promise((resolve) => {});
  }

  swap(
    recipient: string,
    zeroForOne: boolean,
    amountSpecified: BigNumberish,
    sqrtPriceLimitX96: BigNumberish,
    data: BytesLike
  ): Promise<ContractTransaction> {
    return new Promise((resolve) => {});
  }

  tickBitmap(arg0: BigNumberish): Promise<BigNumber> {
    return new Promise((resolve) => {});
  }

  tickSpacing(): Promise<number> {
    return new Promise((resolve) => {});
  }

  ticks(arg0: BigNumberish): Promise<{
    liquidityGross: BigNumber;
    liquidityNet: BigNumber;
    feeGrowthOutside0X128: BigNumber;
    feeGrowthOutside1X128: BigNumber;
    tickCumulativeOutside: BigNumber;
    secondsPerLiquidityOutsideX128: BigNumber;
    secondsOutside: number;
    initialized: boolean;
    0: BigNumber;
    1: BigNumber;
    2: BigNumber;
    3: BigNumber;
    4: BigNumber;
    5: BigNumber;
    6: number;
    7: boolean;
  }> {
    return new Promise((resolve) => {});
  }

  time(): Promise<BigNumber> {
    return new Promise((resolve) => {});
  }

  token0(): Promise<string> {
    return new Promise((resolve) => {});
  }

  token1(): Promise<string> {
    return new Promise((resolve) => {});
  }
}
