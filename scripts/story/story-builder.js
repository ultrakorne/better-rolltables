import { StoryBoolCondition } from './story-bool-condition.js';

export class StoryBuilder {

    constructor(tableEntity) {
        this.table = tableEntity;
        /** the story tokens with the respective values, either pulled from a rolltable or rolled with a formula */
        this.storyTokens = {};
        /** string containing the story, to be replaced with the tokens */
        this.story = "";
    }

    async drawStory() {
        const draw = await this.table.drawMany(1, { displayChat: false });

        for (const entry of draw.results) {
            console.log("draw roll ", entry);
            if (entry.collection == "JournalEntry") {

                const storyJournal = game.journal.get(entry.resultId);
                await this.parseStoryDefinition(storyJournal.data.content);
            } else {
                ui.notifications.warn(`Entry for ${entry.compendium} not supported for type story`);
            }
        }

        console.log("this.storyTokens ", this.storyTokens);
        console.log("story ", this.story);
    }

    async parseStoryDefinition(storyDefinition) {

        const PARSE_MODE = {
            NONE: 0,
            DEFINITION: 1,
            STORY: 2
        };
        /** remove html spaces */
        storyDefinition = storyDefinition.replace(/(&nbsp;|<br>)+/g, '');

        const lines = storyDefinition.split(/\r\n|\r|\n/);

        let parseMode = PARSE_MODE.DEFINITION;

        for (const line of lines) {
            // console.log("story line ", line);
            switch (parseMode) {
                case PARSE_MODE.STORY:
                    this.story += line;
                    break;
                case PARSE_MODE.DEFINITION:
                    const matches = /\s*<p>(.+)AS(.+)<\/p>/.exec(line);
                    if (matches) {
                        await this.processDefinition(matches[1], matches[2]);
                        break;
                    }
                default:
                    const sectionMatch = /.*#([a-zA-Z]+)/.exec(line);
                    if (sectionMatch && sectionMatch[1] == "story") {
                        parseMode = PARSE_MODE.STORY;
                    }
                    break;
            }
        }
    }


    async processDefinition(defValue, definitionName) {

        // console.log("value ", defValue);

        const match = /{ *([^}]*?) *}/.exec(definitionName);
        if (!match) {
            ui.notifications.error(`definition error, ${definitionName} is malformed. After keyword AS we expect a name in brackets {}`)
            return;
        }
        const definition = match[1];
        if (hasProperty(this.storyTokens, definition)) {
            console.log(`definition ${definition} is already defined, skipping line`);
            return;
        }

        // console.log("definition ", definition);

        const regexIF = /IF\s*\((.+)\)/;

        const ifMatch = regexIF.exec(defValue);
        let conditionMet = true;
        if (ifMatch) {
            const storyCondition = new StoryBoolCondition(defValue);
            conditionMet = storyCondition.evaluate();
        }

        if (!conditionMet) return;

        const regexTable = /\s*@RollTable\[ *([^\]]*?) *\]{ *([^}]*?) *}/;

        const tableMatch = regexTable.exec(defValue);
        let valueResult;
        /** there is a table definition on the left of the AS */
        if (tableMatch) {
            const tableId = tableMatch[1];
            const table = game.tables.get(tableId);
            // console.log("table id ", tableId);
            const draw = await table.drawMany(1, { displayChat: false });
            if (!draw) {
                await table.reset();
                draw = await table.drawMany(1, { displayChat: false });
            }

            if (draw.results.length != 1) {
                ui.notifications.error(`0 or more than 1 result was drawn from table ${table.name}, only 1 result is supported check your table config`);
                return;
            }

            const tableResult = draw.results[0];
            if (tableResult.type != 0) {
                ui.notifications.warn(`only text result from table are supported at the moment, check table ${table.name}`);
            }
            valueResult = tableResult.text;

        } else {
            const regexRoll = /\s*\[\[ *([^\]]*?) *\]\]/;
            /** if no table match, lets check for a formula */
            const rollMatch = regexRoll.exec(defValue)
            if (rollMatch) {
                const rollFormula = rollMatch[1];
                // console.log("roll formula ", rollFormula);
                try {
                    valueResult = new Roll(rollFormula).roll().total || 0;
                } catch (error) {
                    valueResult = 0;
                }
            } else {
                ui.notifications.error(`on the left side of the AS in a story definition a rolltable or rollformula must be provided`);
            }
        }

        if (valueResult) {
            setProperty(this.storyTokens, definition, valueResult);
        }
    }
}