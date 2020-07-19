import * as Utils from './utils.js';
import * as BRTHelper from './brt-helper.js';
import { BRTBuilder } from './brt-builder.js';

export class BetterResults {

    constructor(tableResults) {
        this.results = [];
        this.tableResults = tableResults;
    }

    async buildResults() {

        console.log("buildResults from ", this.tableResults);
        for (let i = 0; i < this.tableResults.length; i++) {
            const betterResults = await this.parseResult(this.tableResults[i]);
            //if a inner table is rolled, the result returned is undefined but the array this.tableResult is extended with the new results

            for (const r of betterResults) {
                this.results.push(r);
            }
        }
        return this.results;
    }

    async parseResult(result) {
        console.log("parsing result ", result);
        let betterResults = [];
        if (result.type === CONST.TABLE_RESULT_TYPES.TEXT) {
            const textResults = result.text.split("|");
            for (const t of textResults) {
                const regex = /(\s*[^\[@]+\s*)*@*(\w+)*\[([^\]\[]+)\]/g;
                let matches;

                let textString;
                let commands = [];
                let table;
                let betterResult = {};

                while (matches = regex.exec(t)) {
                    //matches[1] is undefined in case we are matching [tablename]
                    //if we are matching @command[string] then matches[2] is the command and [3] is the arg inside []
                    console.log(`match 0: ${matches[0]}, 1: ${matches[1]}, 2: ${matches[2]}, 3: ${matches[3]}`);

                    textString = textString || matches[1]; //the first match is the text outside [], a rollformula
                    const commandName = matches[2];
                    const innerTableName = matches[3];
                    if (!commandName && innerTableName) {
                        const out = Utils.separateIdComendiumName(innerTableName);
                        const tableName = out.nameOrId;
                        const tableCompendiumName = out.compendiumName;

                        if (tableCompendiumName) {
                            table = await Utils.findInCompendiumByName(tableCompendiumName, tableName);
                        } else {
                            table = game.tables.getName(tableName);
                        }

                        if (!table) {
                            ui.notifications.warn(`no table named ${tableName} found in compendium ${tableCompendiumName}, did you misspell your table name in brackets?`);
                        }
                        break;
                    } else if(commandName) {
                        commands.push({"command": commandName.toLowerCase(), "arg": matches[3]});
                        if(commandName.toLowerCase() === "compendium") {
                            betterResult.collection = matches[3];
                        }
                    }
                }

                //if a table definition is found, the textString is the rollFormula to be rolled on that table
                if (table) {
                    const numberRolls = BRTHelper.tryRoll(textString);
                    const brtBuilder = new BRTBuilder(table);
                    const innerResults = await brtBuilder.betterRoll(numberRolls);
                    console.log("innerResults ", innerResults);
                    this.tableResults = this.tableResults.concat(innerResults);
                } else if (textString) {
                    //if no table definition is found, the textString is the item name
                    
                    betterResult.img = result.img;
                    betterResult.text = textString.trim();
                    betterResult.commands = commands;
                    betterResults.push(betterResult);
                }
            }
        } else {

            let betterResult = {};
            betterResult.img = result.img;
            betterResult.collection = result.collection;
            betterResult.text = result.text;
            betterResults.push(betterResult);
        }

        return betterResults;
    }
}