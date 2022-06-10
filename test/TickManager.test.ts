import { Tick } from "../src/model/Tick";
import { TickMath } from "../src/util/TickMath";
import { expect } from "./shared/expect";
import { TickManager } from "../src/manager/TickManager";

describe("TickManager", () => {
  describe("#getNextInitializedTick", () => {
    let highTick: Tick;
    let lowTick: Tick;
    let midTick: Tick;
    let ticks: Tick[];
    let tickManager: TickManager = new TickManager();

    beforeEach(() => {
      lowTick = new Tick(TickMath.MIN_TICK + 1);
      midTick = new Tick(0);
      highTick = new Tick(TickMath.MAX_TICK - 1);

      ticks = [lowTick, midTick, highTick];

      for (let tick of ticks) {
        tickManager.set(tick);
      }
    });

    it("lte = true", () => {
      expect(tickManager.getNextInitializedTick(-257, 1, true)).to.eql({
        nextTick: -512,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(-256, 1, true)).to.eql({
        nextTick: -256,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(-1, 1, true)).to.eql({
        nextTick: -256,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(0, 1, true)).to.eql({
        nextTick: 0,
        initialized: true,
      });
      expect(tickManager.getNextInitializedTick(1, 1, true)).to.eql({
        nextTick: 0,
        initialized: true,
      });
      expect(tickManager.getNextInitializedTick(255, 1, true)).to.eql({
        nextTick: 0,
        initialized: true,
      });
      expect(tickManager.getNextInitializedTick(256, 1, true)).to.eql({
        nextTick: 256,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(257, 1, true)).to.eql({
        nextTick: 256,
        initialized: false,
      });
    });

    it("lte = false", () => {
      expect(tickManager.getNextInitializedTick(-215041, 60, false)).to.eql({
        nextTick: -199740,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(-257, 1, false)).to.eql({
        nextTick: -1,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(-256, 1, false)).to.eql({
        nextTick: -1,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(-2, 1, false)).to.eql({
        nextTick: -1,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(-1, 1, false)).to.eql({
        nextTick: 0,
        initialized: true,
      });
      expect(tickManager.getNextInitializedTick(0, 1, false)).to.eql({
        nextTick: 255,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(1, 1, false)).to.eql({
        nextTick: 255,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(254, 1, false)).to.eql({
        nextTick: 255,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(255, 1, false)).to.eql({
        nextTick: 511,
        initialized: false,
      });
      expect(tickManager.getNextInitializedTick(256, 1, false)).to.eql({
        nextTick: 511,
        initialized: false,
      });
    });
  });
});
