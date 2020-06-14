import * as BRTHelper from './brt-helper.js';

export class BRTBuilder {

    constructor(tableEntity) {
        this.table = tableEntity;
    }
    async betterRoll() {
        await this.rollManyOnTable(BRTHelper.rollsAmount(this.table), this.table);
        // return this.loot;
    }

    async rollManyOnTable(amount, table) {
    
    }
}