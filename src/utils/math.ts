import BN from "bn.js";

export class SqrtPriceMath {
    static getAmount0Delta(sqrtRatioAX96: BN, sqrtRatioBX96: BN, liquidity: BN): BN {
        //TODO
        return new BN(0);
    }
    static getAmount1Delta(sqrtRatioAX96: BN, sqrtRatioBX96: BN, liquidity: BN): BN {
        //TODO
        return new BN(0);
    }
    static getNextSqrtPriceFromInput(sqrtRatioAX96: BN, liquidity: BN, amountIn: BN, zeroForOne: boolean): BN {
        //TODO
        return new BN(0);
    }
    static getNextSqrtPriceFromOutput(sqrtRatioAX96: BN, liquidity: BN, amountOut: BN, zeroForOne: boolean): BN {
        //TODO
        return new BN(0);
    }
}

export class TickMath {
    static getSqrtRatioAtTick(tick: number): BN {
        // TODO
        return new BN(0);
    }
    static getTickAtSqrtRatio(sqrtPriceX96: BN): number {
        // TODO
        return 0;
    }
}

export class SwapMath {
    static computeSwapStep(sqrtRatioCurrentX96: BN, sqrtRatioTargetX96: BN, liquidity: BN, amountRemaining: BN, feePips: number): { sqrtRatioNextX96: BN, amountIn: BN, amountOut: BN, feeAmount: BN } {
        // TODO
        return { sqrtRatioNextX96: new BN(0), amountIn: new BN(0), amountOut: new BN(0), feeAmount: new BN(0) };
    }
}

export class FullMath {
    static mulDiv(a: BN, b: BN, denominator: BN): BN {
        // TODO
        return new BN(0);
    }
    static mulDivRoundingUp(a: BN, b: BN, denominator: BN): BN {
        // TODO
        return new BN(0);
    }
}