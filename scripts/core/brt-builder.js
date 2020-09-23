import * as BRTHelper from './brt-helper.js';
import * as Utils from '../core/utils.js';
import { BRTCONFIG } from './config.js';

export class BRTBuilder {

    constructor(tableEntity) {
        this.table = tableEntity;
    }

    async betterRoll(rollsAmount = undefined) {
        this.mainRoll = undefined;
        rollsAmount = rollsAmount || BRTHelper.rollsAmount(this.table);
        this.results = await this.rollManyOnTable(rollsAmount, this.table);
        return this.results;
    }

    async createChatCard(results) {
        await this.table.toMessage(results, { roll: this.mainRoll });
    }

    async rollManyOnTable(amount, table, { _depth = 0 } = {}) {

        // Prevent infinite recursion
        if (_depth > 5) {
            throw new Error(`Recursion depth exceeded when attempting to draw from RollTable ${table._id}`);
        }

        let drawnResults = [];

        while (amount > 0) {
            let resultToDraw = amount;
            /** if we draw without replacement we need to reset the table once all entries are drawn */
            if (!table.data.replacement) {
                const resultsLeft = table.data.results.reduce(function (n, r) { return n + (!r.drawn) }, 0);

                if (resultsLeft === 0) {
                    await table.reset();
                    continue;
                }

                resultToDraw = Math.min(resultsLeft, amount);
            }

            if (!table.data.formula) {
                ui.notifications.error(`Roll table formula in table ${table.name} is not defined!`);
                return;
            }

            const draw = await table.drawMany(resultToDraw, { displayChat: false, recursive: false });
            if (!this.mainRoll) {
                this.mainRoll = draw.roll;
            }

            for (const entry of draw.results) {
                const formulaAmount = getProperty(entry, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`) || "";
                const entryAmount = BRTHelper.tryRoll(formulaAmount);

                let innerTable;
                if (entry.type === CONST.TABLE_RESULT_TYPES.ENTITY && entry.collection === "RollTable") {
                    innerTable = game.tables.get(entry.resultId);
                } else if (entry.type === CONST.TABLE_RESULT_TYPES.COMPENDIUM) {
                    const entityInCompendium = await Utils.findInCompendiumByName(entry.collection, entry.text);
                    if (entityInCompendium.entity === "RollTable") {
                        innerTable = entityInCompendium;
                    }
                }

                if (innerTable) {
                    let innerResults = await this.rollManyOnTable(entryAmount, innerTable, { _depth: _depth + 1 });
                    drawnResults = drawnResults.concat(innerResults);
                }
                else {
                    for (let i = 0; i < entryAmount; i++) {
                        drawnResults.push(entry);
                    }
                }
            }
            amount -= resultToDraw;
        }


        return drawnResults;
    }
}