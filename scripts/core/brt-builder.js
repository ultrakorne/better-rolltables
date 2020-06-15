import * as BRTHelper from './brt-helper.js';
import { ResultsData } from './results-data.js';
import { drawMany } from './brt-api-changes.js';
import { BRTCONFIG } from './config.js';

export class BRTBuilder {

    constructor(tableEntity) {
        this.table = tableEntity;
        this.results = new ResultsData();
    }
    async betterRoll() {
        console.log("better roll");
        const tableResults = await this.rollManyOnTable(BRTHelper.rollsAmount(this.table), this.table);
        await this.table.toMessage(tableResults);
        return this.results;
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
            //change the implementation of drawMany with a patched version that can disable recursion on innerTables
            table.drawMany = drawMany;
            const draw = await table.drawMany(resultToDraw, { displayChat: false, expandInnerTables: false });
            for (const entry of draw.results) {
                const formulaAmount = getProperty(entry, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`) || "";
                const entryAmount = BRTHelper.tryRoll(formulaAmount);
                if (entry.type === CONST.TABLE_RESULT_TYPES.ENTITY && entry.collection === "RollTable") {
                    const innerTable = game.tables.get(entry.resultId);
                    if (innerTable) {
                        let innerResults = await this.rollManyOnTable(entryAmount, innerTable, { _depth: _depth + 1 });
                        drawnResults = drawnResults.concat(innerResults);
                    }
                    //TODO draw from compendium rolltables recursively
                } else {
                    for (let i = 0; i < entryAmount; i++) {
                        drawnResults.push(entry);
                    }
                }
            }
            amount -= resultToDraw;
        }

        console.log("drawnResults", drawnResults);
        return drawnResults;
    }
}