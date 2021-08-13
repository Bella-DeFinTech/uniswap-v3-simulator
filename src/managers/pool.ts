import BN from "bn.js";
import { Position, Tick } from "../model/pool"
import { Serialize } from "../model/decorator"
import { Element } from "../model/element"

export class PositionManager extends Element {
    @Serialize('positions_json')
    private positions: Map<string, Position>;

    constructor(positions: Map<string, Position> = new Map()) {
        super();
        this.positions = positions;
    }

    get(owner: string, tickLower: number, tickUpper: number): Position {
        // TODO
        return new Position();
    }

    getKey(key: string): Position {
        return this.positions.get(key) || new Position();
    }
}

export class TickManager extends Element {
    @Serialize('ticks_json')
    private ticks: Map<number, Tick>;

    constructor(ticks: Map<number, Tick> = new Map()) {
        super();
        this.ticks = ticks;
    }

    get(tick: number): Tick {
        return this.ticks.get(tick) || new Tick();
    }

    flipTick(tickIndex: number, tickSpacing: number) {
        // TODO
    }

    nextInitializedTick(tick: number, tickSpacing: number, leftToRight: boolean): { nextTick: number, initialized: boolean } {
        // TODO
        return { nextTick: 0, initialized: false }
    }

    getFeeGrowthInside(tickLower: number, tickUpper: number, tickCurrent: number, feeGrowthGlobal0X128: BN, feeGrowthGlobal1X128: BN, leftToRight: boolean): BN {
        // TODO
        return new BN(0);
    }

}
