import { BigNumber } from "ethers";
import JSBI from "jsbi";
import {
  ConfigurableCorePool,
  FullMath,
  LiquidityMath,
  TickMath,
  toJSBI,
  toBN,
  get10pow,
} from "../../src";
import { ZERO } from "../../src/enum/InternalConstants";

export interface VisorVault {
  state: VaultState;
  mint: (deposit0: BigNumber, deposit1: BigNumber) => Promise<BigNumber>;
  burn: (
    shares: BigNumber
  ) => Promise<{ amount0: BigNumber; amount1: BigNumber }>;
}

export interface VaultState {
  baseLower: number;
  baseUpper: number;
  limitLower: number;
  limitUpper: number;
  balance0: BigNumber;
  balance1: BigNumber;
  totalSupply: BigNumber;
}

export async function buildVisorVault(
  configurableCorePool: ConfigurableCorePool,
  visorAddress: string,
  vaultState: VaultState
): Promise<VisorVault> {
  let state = vaultState;

  async function mint(
    deposit0: BigNumber,
    deposit1: BigNumber
  ): Promise<BigNumber> {
    let { baseLower, baseUpper, limitLower, limitUpper, totalSupply } = state;

    let sqrtPrice = configurableCorePool.getCorePool().sqrtPriceX96;

    let PRECISION = get10pow(36);
    let price = toBN(
      FullMath.mulDiv(
        JSBI.multiply(sqrtPrice, sqrtPrice),
        toJSBI(PRECISION),
        toJSBI(BigNumber.from(2).pow(96 * 2))
      )
    );

    await configurableCorePool.burn(visorAddress, baseLower, baseUpper, ZERO);
    await configurableCorePool.burn(visorAddress, limitLower, limitUpper, ZERO);

    let { total0, total1 } = getTotalAmounts();
    let deposit0PricedInToken1 = deposit0.mul(price).div(PRECISION);
    let shares = deposit1.add(deposit0PricedInToken1);

    if (!totalSupply.eq(BigNumber.from(0))) {
      let pool0PricedInToken1 = total0.mul(price).div(PRECISION);
      shares = shares.mul(totalSupply).div(pool0PricedInToken1.add(total1));
    }

    state.totalSupply = state.totalSupply.add(shares);
    state.balance0 = state.balance0.add(deposit0);
    state.balance1 = state.balance1.add(deposit1);

    return shares;
  }

  async function burn(
    shares: BigNumber
  ): Promise<{ amount0: BigNumber; amount1: BigNumber }> {
    let {
      baseLower,
      baseUpper,
      limitLower,
      limitUpper,
      balance0,
      balance1,
      totalSupply,
    } = state;

    let basePosition = configurableCorePool
      .getCorePool()
      .getPosition(visorAddress, baseLower, baseUpper);
    let limitPosition = configurableCorePool
      .getCorePool()
      .getPosition(visorAddress, limitLower, limitUpper);

    let { amount0: base0, amount1: base1 } = await configurableCorePool.burn(
      visorAddress,
      baseLower,
      baseUpper,
      toJSBI(
        liquidityForShares(toBN(basePosition.liquidity), shares, totalSupply)
      )
    );

    await configurableCorePool.collect(
      visorAddress,
      baseLower,
      baseUpper,
      base0,
      base1
    );

    let { amount0: limit0, amount1: limit1 } = await configurableCorePool.burn(
      visorAddress,
      limitLower,
      limitUpper,
      toJSBI(
        liquidityForShares(toBN(limitPosition.liquidity), shares, totalSupply)
      )
    );

    await configurableCorePool.collect(
      visorAddress,
      limitLower,
      limitUpper,
      limit0,
      limit1
    );

    let unusedAmount0 = balance0.mul(shares).div(totalSupply);
    let unusedAmount1 = balance1.mul(shares).div(totalSupply);

    state.totalSupply = state.totalSupply.sub(shares);
    state.balance0 = state.balance0.sub(unusedAmount0);
    state.balance1 = state.balance1.sub(unusedAmount1);

    return {
      amount0: toBN(base0).add(toBN(limit0)).add(unusedAmount0),
      amount1: toBN(base1).add(toBN(limit1)).add(unusedAmount1),
    };
  }

  function getTotalAmounts(): { total0: BigNumber; total1: BigNumber } {
    let { baseLower, baseUpper, limitLower, limitUpper, balance0, balance1 } =
      state;

    let basePosition = configurableCorePool
      .getCorePool()
      .getPosition(visorAddress, baseLower, baseUpper);
    let limitPosition = configurableCorePool
      .getCorePool()
      .getPosition(visorAddress, limitLower, limitUpper);
    let sqrtPrice = configurableCorePool.getCorePool().sqrtPriceX96;

    let { amount0: baseAmount0, amount1: baseAmount1 } =
      LiquidityMath.getAmountsForLiquidity(
        sqrtPrice,
        TickMath.getSqrtRatioAtTick(baseLower),
        TickMath.getSqrtRatioAtTick(baseUpper),
        toJSBI(basePosition.liquidity)
      );
    let { amount0: limitAmount0, amount1: limitAmount1 } =
      LiquidityMath.getAmountsForLiquidity(
        sqrtPrice,
        TickMath.getSqrtRatioAtTick(limitLower),
        TickMath.getSqrtRatioAtTick(limitUpper),
        toJSBI(limitPosition.liquidity)
      );
    return {
      total0: toBN(baseAmount0)
        .add(toBN(limitAmount0))
        .add(toBN(basePosition.tokensOwed0))
        .add(toBN(limitPosition.tokensOwed0))
        .add(balance0),
      total1: toBN(baseAmount1)
        .add(toBN(limitAmount1))
        .add(toBN(basePosition.tokensOwed1))
        .add(toBN(limitPosition.tokensOwed1))
        .add(balance1),
    };
  }

  function liquidityForShares(
    liquidity: BigNumber,
    shares: BigNumber,
    totalSupply: BigNumber
  ): BigNumber {
    return liquidity.mul(shares).div(totalSupply);
  }

  return {
    state,
    mint,
    burn,
  };
}
