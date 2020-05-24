import { BRTCONFIG } from './config.js';
import { LootData } from './loot-item.js';

/**
 * This class build a LootData object based on the tableEntity
 * call generateLoot() to return the created LootData object
 */
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
        this.loot.actorName = this.actorName();
        const currencyString = this.table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_CURRENCY_KEY);
        const currenciesToAdd = this.generateCurrency(currencyString);
        this.loot.addCurrency(currenciesToAdd);

        this.rollManyOnTable(this.tableRollsAmount(), this.table);

        return this.loot;
    }

    /**
     * Rolls on a table and processes each entry
     * @param {Number} amount of rolls to do
     * @param {RollTable} table table to roll on
     */
    rollManyOnTable(amount, table) {
        for (let i = 0; i < amount; i++) {
            const roll = table.roll(); //as foundry 0.5.6 overlapping ranges are supported and a table roll can return multiple entries
            for (const entry of roll.results) {
                this.processTableEntry(entry);
            }
        }
    }

    tryToRollString(textWithRollFormula) {
        try {
            return new Roll(textWithRollFormula).roll().total || 1;
        } catch (error) {
            return 1;
        }
    }

    /**
     * @returns {string} the name of the actor to which to add the loot. if this is empty or undefined a new actor will be created instead of adding to an existing one
     */
    actorName() {
        return this.table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.ACTOR_NAME_KEY);
    }
    /**
     * we can provide a formula on how many times we roll on the table.
     * @returns {Number} how many times to roll on this table
     */
    tableRollsAmount() {
        const rollFormula = this.table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.ROLLS_AMOUNT_KEY);
        return this.tryToRollString(rollFormula);
    }

    /**
    * based on the currency string set in the flag  CONFIG.LOOT_CURRENCY_KEY (in the format of '1d6[gp], 1d4[sp]'), we roll random currencies 
    * @returns {object} an obj with currency type string as key and amount as value e.g. { "gp" : amount, "sp" : amount }
    */
    generateCurrency(currencyString) {
        const currenciesToAdd = {};
        if (currencyString) {
            const currenciesPieces = currencyString.split(",");
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
                this.processTextTableEntry(complexText, tableEntry.img);
            }
        } else if (tableEntry.type == 1 && tableEntry.collection === "Item") { //item
            this.loot.createLootTextItem(tableEntry.text);
        } else if (tableEntry.type == 2) { //collection type
            this.loot.createLootTextItem(tableEntry.text, undefined, undefined, tableEntry.collection);
        }
    }

    /**
     * We do most of the custom rolltable handling with the Text field, this method is processing the table entry text
     * @param {String} complexText the text of a table entry of type Text
     * @param {String} img the image path assigned to the text table Entry selected
     */
    processTextTableEntry(complexText, img) {
        /**extract currency first */
        complexText = this.processTextAsCurrency(complexText);

        if (complexText.trim().length == 0) {
            return;
        }

        console.log("processing ", complexText);

        /** check for commands @command[arg]
         * commands are then passed along the item name so during creation (in loot-creator.js) we can set some property of the item, for example we can set the price of an
         * item with @price[1d4]  the command is price, the arg is 1d4
        */
        let itemName;
        let commands = [];
        let compendiumName;

        let input = complexText;
        let regex = /([^@]*)@(\w+)\[([^\]]+)\]/g;

        let matches;
        while (matches = regex.exec(input)) {
            if (!itemName) {
                itemName = matches[1].trim(); //the name of the object is the first group [1]. match [0] is the entire match
            }
            /**If an Compendium command is specified (e.g. @Compendium[compendiumName]) i use that as compendium name and i dont add it to command list */
            if (matches[2].toLowerCase() === "compendium") {
                compendiumName = matches[3]
            } else {
                commands.push({ "command": matches[2], "arg": matches[3] });
            }
        }

        if (commands.length > 0 || compendiumName) {
            this.loot.createLootTextItem(itemName, commands, img, compendiumName);
            return;
        }

        /** if no command was found, we check if a simple [table name to roll match is found] 
         * matching formula [table name to roll]
        */
        const match = /([^\[]+)\[([^\]]+)\]/g.exec(complexText);
        //no table in brakets [table] is specified, so we create an item out of the text
        if (!match || match.length < 3) {
            this.loot.createLootTextItem(complexText.trim(), [], img, undefined);
            return;
        }

        const rollFormula = match[1];
        const tableName = match[2];
        let numberItems = this.tryToRollString(rollFormula);

        const table = game.tables.getName(tableName);
        if (!table) { ui.notifications.warn(`no table named ${tableName} found, did you misspell your table name in brackets?`); return; }

        this.rollManyOnTable(numberItems, table);
    }

    /** Currency is defined as a text entry in the table inside { } , the format inside brackets it's the same as the global currency set
     * in the whole rolltable. e.g. formula[gp],formula[sp] and so on
     */
    processTextAsCurrency(tableText) {
        const regex = /{([^}]+)}/g
        const input = tableText;

        let matches;
        while (matches = regex.exec(input)) {
            const currencyToAdd = this.generateCurrency(matches[1]);
            this.loot.addCurrency(currencyToAdd);
        }
        return tableText.replace(regex, '');
    }
}