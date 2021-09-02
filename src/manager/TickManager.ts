import JSBI from "jsbi";
import assert from "assert";
import { Tick } from "../model/Tick";
import { jsonMapMember, jsonObject } from "typedjson";

@jsonObject
export class TickManager {
  @jsonMapMember(Number, Tick, { name: "ticks_json" })
  // key = Tick.tickIndex
  private ticks: Map<number, Tick>;

  constructor(ticks: Map<number, Tick> = new Map()) {
    this.ticks = ticks;
  }

  get(tickIndex: number): Tick {
    if (this.ticks.has(tickIndex)) return this.ticks.get(tickIndex)!;
    const newTick = new Tick(tickIndex);
    this.set(newTick);
    return newTick;
  }

  set(tick: Tick) {
    this.ticks.set(tick.tickIndex, tick);
  }

  private nextInitializedTick(
    sortedTicks: readonly Tick[],
    tick: number,
    leftToRight: boolean
  ): Tick {
    if (leftToRight) {
      assert(!this.isBelowSmallest(sortedTicks, tick), "BELOW_SMALLEST");
      if (this.isAtOrAboveLargest(sortedTicks, tick)) {
        return sortedTicks[sortedTicks.length - 1];
      }
      const index = this.binarySearch(sortedTicks, tick);
      return sortedTicks[index];
    } else {
      assert(
        !this.isAtOrAboveLargest(sortedTicks, tick),
        "AT_OR_ABOVE_LARGEST"
      );
      if (this.isBelowSmallest(sortedTicks, tick)) {
        return sortedTicks[0];
      }
      const index = this.binarySearch(sortedTicks, tick);
      return sortedTicks[index + 1];
    }
  }

  getNextInitializedTick(
    tick: number,
    tickSpacing: number,
    leftToRight: boolean
  ): { nextTick: number; initialized: boolean } {
    const sortedTicks = this.getSortedTicks();
    const compressed = Math.floor(tick / tickSpacing); // matches rounding in the code

    if (leftToRight) {
      const wordPos = compressed >> 8;
      const minimum = (wordPos << 8) * tickSpacing;

      if (this.isBelowSmallest(sortedTicks, tick)) {
        return { nextTick: minimum, initialized: false };
      }

      const index = this.nextInitializedTick(sortedTicks, tick, leftToRight)
        .tickIndex;
      const nextInitializedTick = Math.max(minimum, index);
      return {
        nextTick: nextInitializedTick,
        initialized: nextInitializedTick === index,
      };
    } else {
      const wordPos = (compressed + 1) >> 8;
      const maximum = ((wordPos + 1) << 8) * tickSpacing - 1;

      if (this.isAtOrAboveLargest(sortedTicks, tick)) {
        return { nextTick: maximum, initialized: false };
      }

      const index = this.nextInitializedTick(sortedTicks, tick, leftToRight)
        .tickIndex;
      const nextInitializedTick = Math.min(maximum, index);
      return {
        nextTick: nextInitializedTick,
        initialized: nextInitializedTick === index,
      };
    }
  }

  getFeeGrowthInside(
    tickLower: number,
    tickUpper: number,
    tickCurrent: number,
    feeGrowthGlobal0X128: JSBI,
    feeGrowthGlobal1X128: JSBI
  ): { feeGrowthInside0X128: JSBI; feeGrowthInside1X128: JSBI } {
    const lower = this.get(tickLower);
    const upper = this.get(tickUpper);
    let feeGrowthBelow0X128: JSBI;
    let feeGrowthBelow1X128: JSBI;
    if (tickCurrent >= tickLower) {
      feeGrowthBelow0X128 = lower.feeGrowthOutside0X128;
      feeGrowthBelow1X128 = lower.feeGrowthOutside1X128;
    } else {
      feeGrowthBelow0X128 = JSBI.subtract(
        feeGrowthGlobal0X128,
        lower.feeGrowthOutside0X128
      );
      feeGrowthBelow1X128 = JSBI.subtract(
        feeGrowthGlobal1X128,
        lower.feeGrowthOutside1X128
      );
    }

    let feeGrowthAbove0X128: JSBI;
    let feeGrowthAbove1X128: JSBI;
    if (tickCurrent < tickUpper) {
      feeGrowthAbove0X128 = upper.feeGrowthOutside0X128;
      feeGrowthAbove1X128 = upper.feeGrowthOutside1X128;
    } else {
      feeGrowthAbove0X128 = JSBI.subtract(
        feeGrowthGlobal0X128,
        upper.feeGrowthOutside0X128
      );
      feeGrowthAbove1X128 = JSBI.subtract(
        feeGrowthGlobal1X128,
        upper.feeGrowthOutside1X128
      );
    }
    return {
      feeGrowthInside0X128: JSBI.subtract(
        JSBI.subtract(feeGrowthGlobal0X128, feeGrowthBelow0X128),
        feeGrowthAbove0X128
      ),
      feeGrowthInside1X128: JSBI.subtract(
        JSBI.subtract(feeGrowthGlobal1X128, feeGrowthBelow1X128),
        feeGrowthAbove1X128
      ),
    };
  }

  clear(tick: number) {
    this.ticks.delete(tick);
  }

  private getSortedTicks(): Tick[] {
    const sortedTicks = new Map([...this.ticks.entries()].sort());
    return Array.from(sortedTicks.values());
  }

  private isBelowSmallest(sortedTicks: readonly Tick[], tick: number): boolean {
    assert(sortedTicks.length > 0, "LENGTH");
    return tick < sortedTicks[0].tickIndex;
  }

  private isAtOrAboveLargest(
    sortedTicks: readonly Tick[],
    tick: number
  ): boolean {
    assert(sortedTicks.length > 0, "LENGTH");
    return tick >= sortedTicks[sortedTicks.length - 1].tickIndex;
  }

  private binarySearch(sortedTicks: readonly Tick[], tick: number): number {
    assert(!this.isBelowSmallest(sortedTicks, tick), "BELOW_SMALLEST");

    let l = 0;
    let r = sortedTicks.length - 1;
    let i;
    while (true) {
      i = Math.floor((l + r) / 2);

      if (
        sortedTicks[i].tickIndex <= tick &&
        (i === sortedTicks.length - 1 || sortedTicks[i + 1].tickIndex > tick)
      ) {
        return i;
      }

      if (sortedTicks[i].tickIndex < tick) {
        l = i + 1;
      } else {
        r = i - 1;
      }
    }
  }
}
