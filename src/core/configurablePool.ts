import BN from "bn.js";
import { PositionManager, TickManager } from "../managers/pool";
import { PoolConfig, Snapshot, Record } from '../model/config';
import { CorePool } from './pool'

export class ConfigurableCorePool extends CorePool {
    private _snapshot: Snapshot;
    private postProcessorCallback: (this, recordId: string, actionName: string, actionParams: object) => void

    constructor(poolConfig: PoolConfig, snapshot: Snapshot) {
        if (poolConfig) {
            super(poolConfig.token0, poolConfig.token1, poolConfig.fee, poolConfig.tickSpacing);
        } else if (snapshot) {
            let poolConfig = snapshot.poolConfig;
            let states = snapshot.snapshotStorage;
            super(poolConfig.token0, poolConfig.token1, poolConfig.fee, poolConfig.tickSpacing,
                states.token0Balance, states.token1Balance, states.sqrtPriceX96, states.tickCurrent,
                states.feeGrowthGlobal0X128, states.feeGrowthGlobal1X128,
                new TickManager().fromJSON(states.ticks_json), new PositionManager().fromJSON(states.positions_json));
            this._snapshot = snapshot;
        }
    }

    mint(tickLower: number, tickUpper: number, amount: BN) {
        // TODO
        this.postProcess('mint', { tickLower: tickLower, tickUpper: tickUpper, amount: amount })
    }

    burn(tickLower: number, tickUpper: number, amount: BN) {
        // TODO
    }

    collect(tickLower: number, tickUpper: number, amount0Requested: BN, amount1Requested: BN) {
        // TODO
    }

    swap(zeroForOne: boolean, amountSpecified: BN, sqrtPriceLimitX96: BN) {
        // TODO
    }

    updatePostProcessor(callback: (this, recordId: string, actionName: string, actionParams: object) => void) {
        this.postProcessorCallback = callback;
    }

    snapshot(): string {
        // TODO 
        return '0';
    }

    recover(snapshotId: string) {
        // TODO 
    }

    private doRecord(actionName: string, actionParams: object): Record {
        // TODO 
        return new Record()
    }

    private postProcess(actionName: string, actionParams: object) {
        let record = this.doRecord(actionName, actionParams);
        this.postProcessorCallback(record.id, record.actionName, record.actionParams);
    }

}