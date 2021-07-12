import { LootCreator } from './loot/loot-creator.js';
import { LootChatCard } from './loot/loot-chat-card.js';
import { StoryBuilder } from './story/story-builder.js';
import { StoryChatCard } from './story/story-chat-card.js';
import { BRTBuilder } from './core/brt-builder.js';
import { BetterResults } from './core/brt-table-results.js';
import { BRTCONFIG } from "./core/config.js";

export class BetterTables {
    __constructor() {
        this._spellCache = undefined;
    }

    /**
     * Get spells in cache for
     * @returns {*}
     */
    getSpellCache() {
        return this._spellCache;
    }

    async generateLoot(tableEntity) {
        const brtBuilder = new BRTBuilder(tableEntity);
        const results = await brtBuilder.betterRoll();

        const br = new BetterResults(results);
        const betterResults = await br.buildResults(tableEntity);
        const currencyData = br.getCurrencyData();
        // console.log("++BETTER RESULTS ", betterResults);
        // console.log("++ currencyData", currencyData);

        const lootCreator = new LootCreator(betterResults, currencyData);
        await lootCreator.createActor(tableEntity);
        await lootCreator.addCurrenciesToActor();
        await lootCreator.addItemsToActor();
    }

    async addLootToSelectedToken(tableEntity) {
        //VaderDojo: Only allow if tokens are selected
        //TODO:  This check could be enhanced to only function if a UI toggle to use
        // token logic is enabled
        if (canvas.tokens.controlled.length === 0)
            return ui.notifications.error("Please select a token first");

        ui.notifications.info("Loot generation started.");
        const brtBuilder = new BRTBuilder(tableEntity);

        for ( let token of canvas.tokens.controlled ) {
            const results = await brtBuilder.betterRoll();

            const br = new BetterResults(results);
            const betterResults = await br.buildResults(tableEntity);
            const currencyData = br.getCurrencyData();
            // console.log("++BETTER RESULTS ", betterResults);
            // console.log("++ currencyData", currencyData);

            const lootCreator = new LootCreator(betterResults, currencyData);

            await lootCreator.addCurrenciesToToken(token);
            await lootCreator.addItemsToToken(token);
        }
        ui.notifications.info("Loot generation complete.");
    }

    async generateChatLoot(tableEntity) {
        const brtBuilder = new BRTBuilder(tableEntity);
        const results = await brtBuilder.betterRoll();

        const br = new BetterResults(results);
        const betterResults = await br.buildResults(tableEntity);
        const currencyData = br.getCurrencyData();

        const lootChatCard = new LootChatCard(betterResults, currencyData);
        await lootChatCard.createChatCard(tableEntity);
    }

    async getStoryResults(tableEntity){
        const storyBuilder = new StoryBuilder(tableEntity);
        await storyBuilder.drawStory();
        const storyHtml = storyBuilder.getGeneratedStory();
        const storyGMHtml = storyBuilder.getGeneratedStoryGM();
        return { storyHtml, storyGMHtml };
    }

    async generateChatStory(tableEntity) {
        const storyBuilder = new StoryBuilder(tableEntity);
        await storyBuilder.drawStory();
        const storyHtml = storyBuilder.getGeneratedStory();
        const storyGMHtml = storyBuilder.getGeneratedStoryGM();
        const storyChat = new StoryChatCard(tableEntity);
        storyChat.createChatCard(storyHtml);
        storyChat.createChatCard(storyGMHtml, { gmOnly: true });
    }

    async getBetterTableResults(tableEntity){
        const brtBuilder = new BRTBuilder(tableEntity);
        return await brtBuilder.betterRoll();
    }

    async betterTableRoll(tableEntity) {
        const brtBuilder = new BRTBuilder(tableEntity);
        const results = await brtBuilder.betterRoll();
        await brtBuilder.createChatCard(results);
    }


    /**
     * Create a new RollTable by extracting entries from a compendium.
     *
     * @param {string} tableName the name of the table entity that will be created
     * @param {string} compendiumName the name of the compendium to use for the table generation
     * @param {function(Entity)} weightPredicate a function that returns a weight (number) that will be used
     * for the tableResult weight for that given entity. returning 0 will exclude the entity from appearing in the table
     */
    async createTableFromCompendium(tableName, compendiumName, { weightPredicate = null } = {}) {
        let data = { name: tableName },
            tableArray = [];
        const compendium = game.packs.find(t => t.collection === compendiumName);

        if (compendium && (compendium.size > 0)) {
            const newTable = await RollTable.create(data);

            ui.notifications.info(`Starting generation of rolltable for ${compendiumName} with ${compendium.size} entries.`);

            const compendiumItems = await compendium.getDocuments();
            // const compendiumIndex = await compendium.getIndex();
            // const firstEntity = await compendium.getEntity(compendiumIndex[0]._id);
            // console.log("FIRST ENTITY ", firstEntity);

            for (let item of compendiumItems) {
                let weight = 1;
                if (weightPredicate) {
                    weight = weightPredicate(item);
                }
                if (weight == 0) continue;

                let tableEntryData = {};
                tableEntryData.type = 2;
                tableEntryData.collection = compendiumName;
                tableEntryData.text = item.name;
                tableEntryData.img = item.img;
                tableEntryData.weight = weight;
                tableEntryData.range = [1, 1];

                tableArray.push(tableEntryData);
            }
            await newTable.createEmbeddedDocuments("TableResult", tableArray);
            await newTable.normalize();

            ui.notifications.info(`Rolltable ${tableName} with ${tableArray.length} entries was generated.`);
        } else {
            ui.notifications.warn(`Compendium named ${compendiumName} not found`);
        }
    }

    /**
     * Update spell cache used for random spell scroll generation
     * @returns {Promise<void>}
     */
    async updateSpellCache() {
        const spellCompendiumKey = game.settings.get("better-rolltables", "default-spell-compendium");
        const spellCompendium = game.packs.get(spellCompendiumKey);
        const spellCompendiumIndex = await spellCompendium.getIndex({fields: ['data.level']});
        this._spellCache = spellCompendiumIndex.map(i => mergeObject(i, {collection: spellCompendium.collection}));
    }

    /**
     *
     * @param {html} html
     * @param {Array} options
     */
    static async enhanceCompendiumContextMenu(html, options) {
        options.push({
            "name": "Generate rolltable",
            "icon": '<i class="fas fa-th-list"></i>',
            "callback": li => {
                BetterTables.menuCallBackCreateTable(li.data('pack'));
            }
        });
    }

    /**
     *
     * @param {String} compendium
     */
    static async menuCallBackCreateTable(compendium_id){
        await game.betterTables.createTableFromCompendium('BRT | '+ compendium_id,compendium_id);
    }
}