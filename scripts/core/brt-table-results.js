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
            const betterResult = await this.parseResult(this.tableResults[i]);
            //if a inner table is rolled, the result returned is undefined but the array this.tableResult is extended with the new results
            
            if(betterResult) {
                this.results.push(betterResult);
            }
        }

        console.log("better result ", this.results);
    }

    async parseResult(result) {
    console.log("parsing result ", result);
        let betterResult = {};
        if (result.type === CONST.TABLE_RESULT_TYPES.TEXT) {
            const textResults = result.text.split("|");
            for (const t of textResults) {
                const regex = /(\s*\w+\s*)*@*(\w+)*\[([^\]\[]+)\]/g;
                let matches;
                
                let textString;
                while (matches = regex.exec(t)) {
                    //matches[1] is undefined in case we are matching [tablename]
                    //if we are matching @command[string] then matches[2] is the command and [3] is the arg inside []
                    console.log(`match 0: ${matches[0]}, 1: ${matches[1]}, 2: ${matches[2]}, 3: ${matches[3]}`);

                    textString = textString || matches[1]; //the first match is the text outside [], a rollformula
                    const commandName = matches[2];
                    const innerTableName = matches[3];
                    if(!commandName && innerTableName) {
                        const out = Utils.separateIdComendiumName(innerTableName);
                        const tableName = out.nameOrId;
                        const tableCompendiumName = out.compendiumName;
                        let table;
                        if (tableCompendiumName) {
                            table = await Utils.findInCompendiumByName(tableCompendiumName, tableName);
                        } else {
                            table = game.tables.getName(tableName);
                        }

                        if (!table) { 
                            ui.notifications.warn(`no table named ${tableName} found in compendium ${tableCompendiumName}, did you misspell your table name in brackets?`); 
                            return; 
                        }
                       
                        const numberRolls = BRTHelper.tryRoll(textString);
                        const brtBuilder = new BRTBuilder(table);
                        const innerResults = await brtBuilder.betterRoll(numberRolls);
                        console.log("innerResults ", innerResults);
                        this.tableResults = this.tableResults.concat(innerResults);
                    }
                }
            }
        } else {

            betterResult.img = result.img;
            betterResult.collection = result.collection;
            betterResult.text = result.text;

            return betterResult;
        }

        return undefined;
    }
}