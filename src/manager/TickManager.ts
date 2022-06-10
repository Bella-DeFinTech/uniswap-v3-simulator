import JSBI from "jsbi";
import assert from "assert";
import { Tick } from "../model/Tick";
import { jsonMapMember, jsonObject } from "typedjson";
import { FullMath } from "../util/FullMath";
import { TickView } from "../interface/TickView";

@jsonObject
export class TickManager {
  @jsonMapMember(Number, Tick, { name: "ticks_json" })
  private _sortedTicks: Map<number, Tick>;

  public get sortedTicks(): Map<number, Tick> {
    return this._sortedTicks;
  }

  constructor(ticks: Map<number, Tick> = new Map()) {
    this._sortedTicks = ticks;
    this.sortTicks();
  }

  getTickAndInitIfAbsent(tickIndex: number): Tick {
    if (this.sortedTicks.has(tickIndex))
      return this.sortedTicks.get(tickIndex)!;
    const newTick = new Tick(tickIndex);
    this.set(newTick);
    this.sortTicks();
    return newTick;
  }

  getTickReadonly(tickIndex: number): TickView {
    if (this.sortedTicks.has(tickIndex))
      return this.sortedTicks.get(tickIndex)!;
    return new Tick(tickIndex);
  }

  set(tick: Tick) {
    this.sortedTicks.set(tick.tickIndex, tick);
    this.sortTicks();
  }

  private nextInitializedTick(
    sortedTicks: readonly Tick[],
    tick: number,
    lte: boolean
  ): Tick {
    if (lte) {
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
    lte: boolean
  ): { nextTick: number; initialized: boolean } {
    const sortedTicks = this.getSortedTicks();
    let compressed = Math.floor(tick / tickSpacing); // matches rounding in the code
    // if (tick < 0 && tick % tickSpacing != 0) compressed--;
    if (lte) {
      const wordPos = compressed >> 8;
      const minimum = (wordPos << 8) * tickSpacing;

      if (this.isBelowSmallest(sortedTicks, tick)) {
        return { nextTick: minimum, initialized: false };
      }

      const index = this.nextInitializedTick(sortedTicks, tick, lte).tickIndex;
      const nextInitializedTick = Math.max(minimum, index);
      return {
        nextTick: nextInitializedTick,
        initialized: nextInitializedTick === index,
      };
    } else {
      const wordPos = (compressed + 1) >> 8;
      // const maximum = ((wordPos + 1) << 8) * tickSpacing - 1;
      const maximum = (((wordPos + 1) << 8) - 1) * tickSpacing;

      if (this.isAtOrAboveLargest(sortedTicks, tick)) {
        return { nextTick: maximum, initialized: false };
      }

      const index = this.nextInitializedTick(sortedTicks, tick, lte).tickIndex;
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
    assert(
      this.sortedTicks.has(tickLower) && this.sortedTicks.has(tickUpper),
      "INVALID_TICK"
    );
    const lower = this.getTickAndInitIfAbsent(tickLower);
    const upper = this.getTickAndInitIfAbsent(tickUpper);
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
        FullMath.mod256Sub(feeGrowthGlobal0X128, feeGrowthBelow0X128),
        feeGrowthAbove0X128
      ),
      feeGrowthInside1X128: JSBI.subtract(
        FullMath.mod256Sub(feeGrowthGlobal1X128, feeGrowthBelow1X128),
        feeGrowthAbove1X128
      ),
    };
  }

  clear(tick: number) {
    this.sortedTicks.delete(tick);
    this.sortTicks();
  }

  private sortTicks() {
    const sortedTicks = new Map(
      [...this.sortedTicks.entries()].sort((a, b) => a[0] - b[0])
    );
    this._sortedTicks = sortedTicks;
  }

  private getSortedTicks(): Tick[] {
    return Array.from(this.sortedTicks.values());
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
