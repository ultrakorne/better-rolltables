import { LootCreator } from './loot/loot-creator.js';
import { LootChatCard } from './loot/loot-chat-card.js';
import { StoryBuilder } from './story/story-builder.js';
import { StoryChatCard } from './story/story-chat-card.js';
import { BRTBuilder } from './core/brt-builder.js';
import { BetterResults } from './core/brt-table-results.js';

export class BetterTables {
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
        const storyHtml = storyBuilder.generatedStory();
        const storyGMHtml = storyBuilder.generatedStoryGM();
        return { storyHtml, storyGMHtml };
    }

    async generateChatStory(tableEntity) {
        const storyBuilder = new StoryBuilder(tableEntity);
        await storyBuilder.drawStory();
        const storyHtml = storyBuilder.generatedStory();
        const storyGMHtml = storyBuilder.generatedStoryGM();
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
     * create a new RollTable by extracting entry from a compendium to use 
     * @param {string} tableName the name of the table entity that will be created
     * @param {string} compendiumName the name of the compendium to use for the table generation
     * @param {function(Entity)} weightPredicate a function that returns a weight (number) that will be used 
     * for the tableResult weight for that given entity. returning 0 will exclude the entity from appearing in the table
     */
    async createTableFromCompendium(tableName, compendiumName, { weightPredicate = null } = {}) {
        let data = { name: tableName };
        const newTable = await RollTable.create(data);

        const compendium = game.packs.find(t => t.collection === compendiumName);
        if (compendium) {
            const compendiumIndex = await compendium.getIndex();
            const firstEntity = await compendium.getEntity(compendiumIndex[0]._id);
            // console.log("FIRST ENTITY ", firstEntity);

            for (let entry of compendiumIndex) {
                const entity = await compendium.getEntity(entry._id);

                let weight = 1;
                if (weightPredicate) {
                    weight = weightPredicate(entity);
                }
                if (weight == 0) continue;

                let resultTableData = {};
                resultTableData.type = 2;
                resultTableData.collection = compendiumName;
                resultTableData.text = entity.name;
                resultTableData.img = entity.img;
                resultTableData.weight = weight;
                resultTableData.range = [1, 1];
                await newTable.createEmbeddedEntity("TableResult", resultTableData);
            }
            await newTable.normalize();
        } else {
            ui.notifications.warn(`Compendium named ${compendiumName} not found`);
        }
    }
}