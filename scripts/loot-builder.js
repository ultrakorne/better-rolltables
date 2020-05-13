import { CONFIG } from './config.js';

export class LootBuilder {

    constructor(tableEntity) {
        this.table = tableEntity;
    }

    generateLoot() {
        const tableEntry = this.rollOnTable();
        console.log("tableEntry rolled is ", tableEntry);
    }

    rollOnTable() {
        // console.log("Rolling on table: ", this.table);

        const currenciesToAdd = this.generateCurrency();
        console.log("currenciesToAdd ", currenciesToAdd);

        let entry = this.table.roll().results;
        console.log("tableEntry rolled ", entry);
        return entry[0]; //TODO maybe return the array, in 0.5.6 it is possible to return multiple results for overlapping table entries
    }

    tryToRollString(textWithRollFormula) {
        try {
            return new Roll(textWithRollFormula).roll().total || 1;
        } catch (error) {
            return 1;
        }
    }

    /*
    based on the currency string set in the flag  CONFIG.LOOT_CURRENCY_KEY (in the format of '1d6[gp], 1d4[sp]'), we roll random currencies 
    return: an obj with currency type string as key and amount as value e.g. { "gp" : amount, "sp" : amount }
    */
    generateCurrency() {
        const currencyFlag = this.table.getFlag(CONFIG.NAMESPACE, CONFIG.LOOT_CURRENCY_KEY);
        const currenciesToAdd = {};
        if (currencyFlag) {
            const currenciesPieces = currencyFlag.split(",");
            for (const currency of currenciesPieces) {
                // const currencyMatch = currency.match(/\[(.*?)\]/);

                const match = /(.*)\[(.*?)\]/g.exec(currency); //capturing 2 groups, the formula and then the currency symbol in brakets []
                if(!match || match.length<3){
                    ui.notifications.warn(`Currency loot field contain wrong formatting, currencies need to be define as "diceFormula[currencyType]" => "1d100[gp]" but was ${currency}`);
                    continue;
                }
                console.log("MATCH ", match);

                const rollFormula = match[1];
                const currencyString = match[2];
                const amount = this.tryToRollString(rollFormula);
                console.log("rolling rollFormula: " + rollFormula, " wtih result ", amount);
                currenciesToAdd[currencyString] = (currenciesToAdd[currencyString] || 0) + amount;
                // if (currencyMatch) {
                //     const currencyString = currencyMatch[1];
                    
                //     const amount = this.tryToRollString(currency);
                //     console.log("rolling currency: " + currency, " wtih result ", amount);
                //     currenciesToAdd[currencyString] = (currenciesToAdd[currencyString] || 0) + amount;
                // }
            }
        }
        return currenciesToAdd;
    }
}