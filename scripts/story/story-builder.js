import { StoryBoolCondition } from './story-bool-condition.js';

export class StoryBuilder {

    constructor(tableEntity) {
        this.table = tableEntity;
        /** the story tokens with the respective values, either pulled from a rolltable or rolled with a formula */
        this._storyTokens = {};
        /** string containing the story, to be replaced with the tokens */
        this._story = "";
        /** a story part that will only be showned to the GM */
        this._storyGm = "";
    }

    async drawStory() {
        const draw = await this.table.drawMany(1, { displayChat: false });

        let journalContent;

        for (const entry of draw.results) {
            /** entity type 2 is when an entity in the world is linked */
            if (entry.type == 1 && entry.collection == "JournalEntry") {
                const storyJournal = game.journal.get(entry.resultId);
                journalContent = storyJournal.data.content;
            } else if (entry.type == 2) {
                /** entity type 2 is when an entity inside a compendium is linked */
                const compendium = game.packs.find(t => t.collection === entry.collection);
                if (compendium) {
                    let indexes = await compendium.getIndex();
                    let index = indexes.find(e => e.name === entry.text);
                    const entity = await compendium.getEntity(index._id);

                    if (entity.entity == "JournalEntry") {
                        journalContent = entity.data.content;
                    }
                }
            }

            if (journalContent) {
                await this._parseStoryDefinition(journalContent);
            } else {
                ui.notifications.warn(`Entry for ${entry.compendium} not supported for story. only Journal type are supported for story`);
            }
        }
        // console.log("this._storyTokens ", this._storyTokens);
        // console.log("story ", this._story);
    }

    async _parseStoryDefinition(storyDefinition) {

        const PARSE_MODE = {
            NONE: 0,
            DEFINITION: 1,
            STORY: 2,
            STORYGM: 3,
        };

        /** remove html spaces */
        storyDefinition = storyDefinition.replace(/(&nbsp;|<br>)+/g, '');
        const lines = storyDefinition.split(/\r\n|\r|\n/);

        let parseMode = PARSE_MODE.DEFINITION;

        for (const line of lines) {
            const sectionMatch = /.*#([a-zA-Z]+)/.exec(line);
            if (sectionMatch) {
                switch (sectionMatch[1].toLowerCase()) {
                    case "story":
                        parseMode = PARSE_MODE.STORY;
                        break;
                    case "storygm":
                        parseMode = PARSE_MODE.STORYGM;
                        break;
                    case "definition":
                        parseMode = PARSE_MODE.DEFINITION;
                        break;
                }
            } else {
                switch (parseMode) {
                    case PARSE_MODE.STORY:
                        this._story += line;
                        break;
                    case PARSE_MODE.STORYGM:
                        this._storyGm += line;
                        break;
                    case PARSE_MODE.DEFINITION:
                        const matches = /\s*<p>(.+)\sas\s(.+)<\/p>/i.exec(line);
                        if (matches) {
                            await this._processDefinition(matches[1], matches[2]);
                        }
                        break;
                }
            }
        }
    }


    async _processDefinition(defValue, definitionName) {

        // console.log("value ", defValue);

        const match = /{ *([^}]*?) *}/.exec(definitionName);
        if (!match) {
            ui.notifications.error(`definition error, ${definitionName} is malformed. After keyword AS we expect a name in brackets {}`)
            return;
        }
        const definition = match[1];
        if (hasProperty(this._storyTokens, definition)) {
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
            setProperty(this._storyTokens, definition, valueResult);
        }
    }

    generatedStory() {
        return this._generateStory(this._story);
    }

    generatedStoryGM() {
        return this._generateStory(this._storyGm);
    }

    _generateStory(story) {
        if (!story) return story;

        const input = story;
        const regex = /{ *([^}]*?) *}/g

        let replacedStory = story;

        let matches;
        while (matches = regex.exec(input)) {
            const value = getProperty(this._storyTokens, matches[1]);
            if (!value) {
                ui.notifications.error(`cannot find a value for token ${matches[1]} in #story definition`);
                continue;
            }
            replacedStory = replacedStory.replace(matches[0], value);
        }
        return replacedStory;
    }
}