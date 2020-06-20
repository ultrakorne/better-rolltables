import { LootCreator } from './loot/loot-creator.js';
import { LootBuilder } from './loot/loot-builder.js'
import { LootChatCard } from './loot/loot-chat-card.js';
import { StoryBuilder } from './story/story-builder.js';
import { StoryChatCard } from './story/story-chat-card.js';
import { BRTBuilder } from './core/brt-builder.js';

export class BetterTables {
    async generateLoot(tableEntity) {
        const lootBuilder = new LootBuilder(tableEntity);
        const generatedLoot = await lootBuilder.generateLoot();
        const lootCreator = new LootCreator(generatedLoot);
        await lootCreator.createActor();
        await lootCreator.addCurrenciesToActor();
        await lootCreator.addItemsToActor();
    }

    async generateChatLoot(tableEntity) {
        const lootBuilder = new LootBuilder(tableEntity);
        const generatedLoot = await lootBuilder.generateLoot();
        const lootChatCard = new LootChatCard(generatedLoot);
        await lootChatCard.createChatCard(tableEntity);
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

    async betterTableRoll(tableEntity) {
        const brtBuilder = new BRTBuilder(tableEntity);
        await brtBuilder.betterRoll();
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