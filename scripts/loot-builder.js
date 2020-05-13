import { BRTCONFIG } from './config.js';
import { LootData } from './loot-item.js';

export class LootBuilder {

    constructor(tableEntity) {
        this.table = tableEntity;
        this.loot = new LootData();
    }

    /**
     * Generate loot based on the table definition
     * @returns {LootData} containing all the rolled item selected
     */
    generateLoot() {      
        const currenciesToAdd = this.generateCurrency();
        this.loot.addCurrency(currenciesToAdd);
        const tableEntry = this.rollOnTable(this.table);
        this.processTableEntry(tableEntry);

        return this.loot;
    }

    /**
     * Rolls on a table and returns the entry result
     * @param table table to roll on
     * @returns tableEntry selected    
     */
    rollOnTable(table) {
        let entry = table.roll().results;
        // console.log("tableEntry rolled ", entry);
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
        const currencyFlag = this.table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_CURRENCY_KEY);
        const currenciesToAdd = {};
        if (currencyFlag) {
            const currenciesPieces = currencyFlag.split(",");
            for (const currency of currenciesPieces) {
                const match = /(.*)\[(.*?)\]/g.exec(currency); //capturing 2 groups, the formula and then the currency symbol in brakets []
                if (!match || match.length < 3) {
                    ui.notifications.warn(`Currency loot field contain wrong formatting, currencies need to be define as "diceFormula[currencyType]" => "1d100[gp]" but was ${currency}`);
                    continue;
                }
                const rollFormula = match[1];
                const currencyString = match[2];
                const amount = this.tryToRollString(rollFormula);
                currenciesToAdd[currencyString] = (currenciesToAdd[currencyString] || 0) + amount;
            }
        }
        return currenciesToAdd;
    }

    processTableEntry(tableEntry) {
        if (!tableEntry) return;

        if (tableEntry.type == 0) { //text type
            let resultText = tableEntry.text;
            let complexTextList = resultText.split("|");
            for (const complexText of complexTextList) {
                this.processTextTableEntry(complexText);
            }
        } else if (tableEntry.type == 1 && tableEntry.collection === "Item") { //item
            this.loot.createLootItem(tableEntry);
        } else if (tableEntry.type == 2) { //collection type
            this.loot.createLootItem(tableEntry, tableEntry.collection);
        }
    }

    processTextTableEntry(complexText) {
        let numberItems = this.tryToRollString(complexText);
        const tableNameMatch = complexText.match(/\[(.*?)\]/);

        if (!tableNameMatch) {
            //no table in brakets [table] is specified, so if its text we pick that
            this.loot.createLootTextItem(complexText);
            return;
        }

        let tableName;
        if (tableNameMatch.length >= 2) {
            tableName = tableNameMatch[1];
        } else {
            ui.notifications.warn(`no table for complexText ${complexText} found, check that the table name is in sqaure brackets`);
            return;
        }

        const table = game.tables.getName(tableName);
        if (!table) { ui.notifications.warn(`no table named ${tableName} found, Please create a table`); return; }

        for (let i = 0; i < numberItems; i++) {
            let tableEntry = this.rollOnTable(table);
            this.processTableEntry(tableEntry);
        }
    }
}