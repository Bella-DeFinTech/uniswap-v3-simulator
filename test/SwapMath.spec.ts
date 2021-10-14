// import { BigNumber } from "ethers";
// import { ethers } from "hardhat";
// import { SwapMathTest } from "../typechain/SwapMathTest";

import { expect } from "./shared/expect";
// import snapshotGasCost from "./shared/snapshotGasCost";
import { encodePriceSqrt, expandTo18Decimals } from "./shared/utilities";
// import { SqrtPriceMathTest } from "../typechain/SqrtPriceMathTest";
import { ONE } from "../src/enum/InternalConstants";
import JSBI from "jsbi";
// import { FeeAmount } from "../src/enum/FeeAmount";
import { SwapMath } from "../src/util/SwapMath";
import { SqrtPriceMath } from "../src/util/SqrtPriceMath";

describe("SwapMath", () => {
  describe("#computeSwapStep", () => {
    it("exact amount in that gets capped at price target in one for zero", async () => {
      const price = encodePriceSqrt(ONE, ONE);
      const priceTarget = encodePriceSqrt(JSBI.BigInt(101), JSBI.BigInt(100));
      const liquidity = expandTo18Decimals(2);
      const amount = expandTo18Decimals(1);
      const fee = 600;
      // const fee = FeeAmount.TEST;
      const zeroForOne = false;

      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          price,
          priceTarget,
          liquidity,
          amount,
          fee
        );

      expect(amountIn.toString()).to.eq("9975124224178055");
      expect(feeAmount.toString()).to.eq("5988667735148");
      expect(amountOut.toString()).to.eq("9925619580021728");
      expect(
        JSBI.LT(JSBI.add(amountIn, feeAmount), amount),
        "entire amount is not used"
      ).to.be.true;

      const priceAfterWholeInputAmount =
        await SqrtPriceMath.getNextSqrtPriceFromInput(
          price,
          liquidity,
          amount,
          zeroForOne
        );

      expect(JSBI.EQ(sqrtQ, priceTarget), "price is capped at price target").to
        .be.true;
      expect(
        JSBI.LT(sqrtQ, priceAfterWholeInputAmount),
        "price is less than price after whole input amount"
      ).to.be.true;
    });

    it("exact amount out that gets capped at price target in one for zero", async () => {
      const price = encodePriceSqrt(ONE, ONE);
      const priceTarget = encodePriceSqrt(JSBI.BigInt(101), JSBI.BigInt(100));
      const liquidity = expandTo18Decimals(2);
      const amount = JSBI.multiply(expandTo18Decimals(1), JSBI.BigInt(-1));
      const fee = 600;
      const zeroForOne = false;

      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          price,
          priceTarget,
          liquidity,
          amount,
          fee
        );

      expect(amountIn.toString()).to.eq("9975124224178055");
      expect(feeAmount.toString()).to.eq("5988667735148");
      expect(amountOut.toString()).to.eq("9925619580021728");
      expect(
        JSBI.LT(amountOut, JSBI.multiply(amount, JSBI.BigInt(-1))),
        "entire amount out is not returned"
      ).to.be.true;

      const priceAfterWholeOutputAmount =
        await SqrtPriceMath.getNextSqrtPriceFromOutput(
          price,
          liquidity,
          JSBI.multiply(amount, JSBI.BigInt(-1)),
          zeroForOne
        );

      expect(sqrtQ.toString(), "price is capped at price target").to.eq(
        priceTarget.toString()
      );
      expect(
        JSBI.LT(sqrtQ, priceAfterWholeOutputAmount),
        "price is less than price after whole output amount"
      ).to.be.true;
    });

    it("exact amount in that is fully spent in one for zero", async () => {
      const price = encodePriceSqrt(ONE, ONE);
      const priceTarget = encodePriceSqrt(JSBI.BigInt(1000), JSBI.BigInt(100));
      const liquidity = expandTo18Decimals(2);
      const amount = expandTo18Decimals(1);
      const fee = 600;
      const zeroForOne = false;

      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          price,
          priceTarget,
          liquidity,
          amount,
          fee
        );

      expect(amountIn.toString()).to.eq("999400000000000000");
      expect(feeAmount.toString()).to.eq("600000000000000");
      expect(amountOut.toString()).to.eq("666399946655997866");
      expect(
        JSBI.ADD(amountIn, feeAmount).toString(),
        "entire amount is used"
      ).to.eq(amount.toString());

      const priceAfterWholeInputAmountLessFee =
        await SqrtPriceMath.getNextSqrtPriceFromInput(
          price,
          liquidity,
          JSBI.subtract(amount, feeAmount),
          zeroForOne
        );

      expect(JSBI.LT(sqrtQ, priceTarget), "price does not reach price target")
        .to.be.true;
      expect(
        sqrtQ.toString(),
        "price is equal to price after whole input amount"
      ).to.eq(priceAfterWholeInputAmountLessFee.toString());
    });

    it("exact amount out that is fully received in one for zero", async () => {
      const price = encodePriceSqrt(ONE, ONE);
      const priceTarget = encodePriceSqrt(JSBI.BigInt(10000), JSBI.BigInt(100));
      const liquidity = expandTo18Decimals(2);
      const amount = JSBI.multiply(expandTo18Decimals(1), JSBI.BigInt(-1));
      const fee = 600;
      const zeroForOne = false;

      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          price,
          priceTarget,
          liquidity,
          amount,
          fee
        );

      expect(amountIn.toString()).to.eq("2000000000000000000");
      expect(feeAmount.toString()).to.eq("1200720432259356");
      expect(amountOut.toString()).to.eq(
        JSBI.multiply(amount, JSBI.BigInt(-1)).toString()
      );

      const priceAfterWholeOutputAmount =
        await SqrtPriceMath.getNextSqrtPriceFromOutput(
          price,
          liquidity,
          JSBI.multiply(amount, JSBI.BigInt(-1)),
          zeroForOne
        );

      expect(JSBI.LT(sqrtQ, priceTarget), "price does not reach price target")
        .to.be.true;
      expect(
        sqrtQ.toString(),
        "price is less than price after whole output amount"
      ).to.eq(priceAfterWholeOutputAmount.toString());
    });

    it("amount out is capped at the desired amount out", async () => {
      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          JSBI.BigInt("417332158212080721273783715441582"),
          JSBI.BigInt("1452870262520218020823638996"),
          JSBI.BigInt("159344665391607089467575320103"),
          JSBI.BigInt("-1"),
          1
        );
      expect(amountIn.toString()).to.eq("1");
      expect(feeAmount.toString()).to.eq("1");
      expect(amountOut.toString()).to.eq("1"); // would be 2 if not capped
      expect(sqrtQ.toString()).to.eq("417332158212080721273783715441581");
    });

    it("target price of 1 uses partial input amount", async () => {
      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          JSBI.BigInt("2"),
          JSBI.BigInt("1"),
          JSBI.BigInt("1"),
          JSBI.BigInt("3915081100057732413702495386755767"),
          1
        );
      expect(amountIn.toString()).to.eq("39614081257132168796771975168");
      expect(feeAmount.toString()).to.eq("39614120871253040049813");
      expect(
        JSBI.LE(
          JSBI.add(amountIn, feeAmount),
          "3915081100057732413702495386755767"
        )
      ).to.be.true;
      expect(amountOut.toString()).to.eq("0");
      expect(sqrtQ.toString()).to.eq("1");
    });

    it("entire input amount taken as fee", async () => {
      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          JSBI.BigInt("2413"),
          JSBI.BigInt("79887613182836312"),
          JSBI.BigInt("1985041575832132834610021537970"),
          JSBI.BigInt("10"),
          1872
        );
      expect(amountIn.toString()).to.eq("0");
      expect(feeAmount.toString()).to.eq("10");
      expect(amountOut.toString()).to.eq("0");
      expect(sqrtQ.toString()).to.eq("2413");
    });

    it("handles intermediate insufficient liquidity in zero for one exact output case", async () => {
      const sqrtP = JSBI.BigInt("20282409603651670423947251286016");
      const sqrtPTarget = JSBI.divide(
        JSBI.multiply(sqrtP, JSBI.BigInt(11)),
        JSBI.BigInt(10)
      );
      const liquidity = JSBI.BigInt(1024);
      // virtual reserves of one are only 4
      // https://www.wolframalpha.com/input/?i=1024+%2F+%2820282409603651670423947251286016+%2F+2**96%29
      const amountRemaining = JSBI.BigInt(-4);
      const feePips = 3000;
      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          sqrtP,
          sqrtPTarget,
          liquidity,
          amountRemaining,
          feePips
        );
      expect(amountOut.toString()).to.eq("0");
      expect(sqrtQ.toString()).to.eq(sqrtPTarget.toString());
      expect(amountIn.toString()).to.eq("26215");
      expect(feeAmount.toString()).to.eq("79");
    });

    it("handles intermediate insufficient liquidity in one for zero exact output case", async () => {
      const sqrtP = JSBI.BigInt("20282409603651670423947251286016");
      const sqrtPTarget = JSBI.divide(
        JSBI.multiply(sqrtP, JSBI.BigInt(9)),
        JSBI.BigInt(10)
      );
      const liquidity = JSBI.BigInt(1024);
      // virtual reserves of zero are only 262144
      // https://www.wolframalpha.com/input/?i=1024+*+%2820282409603651670423947251286016+%2F+2**96%29
      const amountRemaining = JSBI.BigInt(-263000);
      const feePips = 3000;
      const [sqrtQ, amountIn, amountOut, feeAmount] =
        await SwapMath.computeSwapStep(
          sqrtP,
          sqrtPTarget,
          liquidity,
          amountRemaining,
          feePips
        );
      expect(amountOut.toString()).to.eq("26214");
      expect(sqrtQ.toString()).to.eq(sqrtPTarget.toString());
      expect(amountIn.toString()).to.eq("1");
      expect(feeAmount.toString()).to.eq("1");
    });

    // describe('gas', () => {
    //   it('swap one for zero exact in capped', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(101, 100),
    //         expandTo18Decimals(2),
    //         expandTo18Decimals(1),
    //         600
    //       )
    //     )
    //   })
    //   it('swap zero for one exact in capped', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(99, 100),
    //         expandTo18Decimals(2),
    //         expandTo18Decimals(1),
    //         600
    //       )
    //     )
    //   })
    //   it('swap one for zero exact out capped', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(101, 100),
    //         expandTo18Decimals(2),
    //         expandTo18Decimals(1).mul(-1),
    //         600
    //       )
    //     )
    //   })
    //   it('swap zero for one exact out capped', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(99, 100),
    //         expandTo18Decimals(2),
    //         expandTo18Decimals(1).mul(-1),
    //         600
    //       )
    //     )
    //   })
    //   it('swap one for zero exact in partial', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(1010, 100),
    //         expandTo18Decimals(2),
    //         1000,
    //         600
    //       )
    //     )
    //   })
    //   it('swap zero for one exact in partial', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(99, 1000),
    //         expandTo18Decimals(2),
    //         1000,
    //         600
    //       )
    //     )
    //   })
    //   it('swap one for zero exact out partial', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(1010, 100),
    //         expandTo18Decimals(2),
    //         1000,
    //         600
    //       )
    //     )
    //   })
    //   it('swap zero for one exact out partial', async () => {
    //     await snapshotGasCost(
    //       swapMath.getGasCostOfComputeSwapStep(
    //         encodePriceSqrt(1, 1),
    //         encodePriceSqrt(99, 1000),
    //         expandTo18Decimals(2),
    //         1000,
    //         600
    //       )
    //     )
    //   })
    // })
  });
});
