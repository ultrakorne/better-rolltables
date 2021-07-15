import { LootCreator } from './loot/loot-creator.js';
import { LootChatCard } from './loot/loot-chat-card.js';
import { StoryBuilder } from './story/story-builder.js';
import { StoryChatCard } from './story/story-chat-card.js';
import { BRTBuilder } from './core/brt-builder.js';
import { BetterResults } from './core/brt-table-results.js';
import { getRandomItemFromCompendium } from "./core/utils.js";
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

        if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.USE_CONDENSED_BETTERROLL)) {
            const br = new BetterResults(results);
            const betterResults = await br.buildResults(tableEntity);

            const lootChatCard = new LootChatCard(betterResults, undefined);
            await lootChatCard.createChatCard(tableEntity);
        } else {
            await brtBuilder.createChatCard(results);
        }
    }

    /**
     * Create a new RollTable by extracting entries from a compendium.
     *
     * @param {string} tableName the name of the table entity that will be created
     * @param {string} compendiumName the name of the compendium to use for the table generation
     * @param {function(Entity)} weightPredicate a function that returns a weight (number) that will be used
     * for the tableResult weight for that given entity. returning 0 will exclude the entity from appearing in the table
     */

    async createTableFromCompendium(tableName, compendiumName, {weightPredicate = null} = {}) {
        const compendium = game.packs.get(compendiumName);
        if (compendium === undefined) {
            ui.notifications.warn(`Compendium named ${compendiumName} not found.`);
            return;
        }

        const compendiumSize = (await compendium.getIndex()).size;
        if (compendiumSize === 0) {
            ui.notifications.warn(`Compendium named ${compendium.title} (${compendiumName}) is empty.`);
            return;
        }

        ui.notifications.info(`Starting generation of rolltable for ${compendium.title} (${compendiumName}) with ${compendiumSize} entries.`);
        compendium.getDocuments()
            .then(compendiumItems => {
                const weight = (weightPredicate) ? weightPredicate(item) : 1;
                if (weight <= 0) return undefined;

                return compendiumItems.map(item => ({
                    type: CONST.TABLE_RESULT_TYPES.COMPENDIUM,
                    collection: compendiumName,
                    text: item.name,
                    img: item.img,
                    weight: weight,
                    range: [1, 1]
                }));
            })
            .then(results => RollTable.create({
                name: tableName,
                results: results.filter(x => x !== undefined) // remove empty results due to null weight
            }))
            .then(rolltable => {
                rolltable.normalize()
                ui.notifications.info(`Rolltable ${tableName} with ${rolltable.results.size} entries was generated.`);
            });
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

        if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.ADD_ROLL_IN_COMPENDIUM_CONTEXTMENU))
        {
            options.push({
                "name": "Roll on compendium",
                "icon": '<i class="fas fa-dice-d20"></i>',
                "callback": li => {
                    BetterTables.menuCallBackRollCompendium(li.data('pack'));
                }
            });
        }
    }

    /**
     *
     * @param {String} compendium_id
     */
    static async menuCallBackCreateTable(compendium_id){
        await game.betterTables.createTableFromCompendium('BRT | '+ compendium_id,compendium_id);
    }

    /**
     * Add a roll option in context menu of rolltables
     * @param {html} html
     * @param {Array} options
     */
    static async enhanceRolltableContextMenu(html, options) {
        if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.ADD_ROLL_IN_ROLLTABLE_CONTEXTMENU)) {
            options.push({
                "name": "Roll table",
                "icon": '<i class="fas fa-dice-d20"></i>',
                "callback": li => {
                    BetterTables.menuCallBackRollTable(li.data("entityId"));
                }
            });
        }
    }

    /**
     *
     * @param {String} rolltable_id ID of the rolltable to roll
     */
    static async menuCallBackRollTable(rolltable_id){
        const rolltable = game.tables.get(rolltable_id);
        await game.betterTables.betterTableRoll(rolltable);
    }

    /**
     * Create card content from compendium content
      * @param {String} compendium compendium name
     * @returns {Promise<{flavor: string, sound: string, user: *, content: *}>}
     */
    static async rollCompendiumAsRolltable(compendium) {
        // Get random item from compendium
        const item = await getRandomItemFromCompendium(compendium);

        // prepare card data
        const fontSize = Math.max(60, 100 - Math.max(0, item.name.length - 27) * 2);
        const chatCardData = {
            compendium: compendium,
            itemsData: [
                { item: item, quantity: 1, fontSize: fontSize }
            ]
        };
        const cardHtml = await renderTemplate("modules/better-rolltables/templates/loot-chat-card.hbs", chatCardData);
        return {
            flavor: `Rolled from compendium ${item.pack}`,
            sound: "sounds/dice.wav",
            user: game.user.data._id,
            content: cardHtml
        };
    }

    /**
     *
     * @param {String} compendium ID of the compendium to roll
     */
    static async menuCallBackRollCompendium(compendium) {
        const chatData = await BetterTables.rollCompendiumAsRolltable(compendium);
        ChatMessage.create(chatData);
    }
    /**
     * Create card content from rolltable
     * @param {RollTable} tableEntity rolltable to generate content from
     * @returns {Promise<{flavor: *, sound: string, user: *, content: *}>}
     */
    static async prepareCardData(tableEntity) {
        const brtBuilder = new BRTBuilder(tableEntity);
        const results = await brtBuilder.betterRoll();

        const br = new BetterResults(results);
        const betterResults = await br.buildResults(tableEntity);
        const currencyData = br.getCurrencyData();

        const lootChatCard = new LootChatCard(betterResults, currencyData);
        return lootChatCard.prepareCharCart(tableEntity);
    }

    static async _addRerollButtonToMessage(message, html) {
        if (game.user.isGM && game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.ROLL_TABLE_FROM_JOURNAL)) {
            if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.SHOW_REROLL_BUTTONS)) {
                const tableDrawNode = $(html).find(".table-draw");
                const id = $(tableDrawNode).data("id");
                const pack = $(tableDrawNode).data("pack");
                if (!id && !pack) return;

                let rerollButton = $(`<a class="roll-table-reroll-button" title="${game.i18n.localize("BRT.DrawReroll")}">`).append("<i class='fas fa-dice-d20'></i>");
                let cardContent = undefined;

                if (pack && !id) {
                    cardContent = await BetterTables.rollCompendiumAsRolltable(pack);
                } else {
                    let rolltable = undefined;
                    if (pack && id) {
                        rolltable = await game.packs.get(pack)?.getDocument(id);
                    } else {
                        rolltable = game.tables.get(id);
                    }
                    if (rolltable) {
                        cardContent = await BetterTables.prepareCardData(rolltable);
                    }
                }
                rerollButton.click(async () => BetterTables.updateChatMessage(message, cardContent.content));
                $(html).find(".message-sender").prepend(rerollButton);
            }
        }
    }

    static async _addRollButtonsToEntityLink( html) {
        // handling rolltables imported in campaign
        $(html).find("a.entity-link[data-entity='RollTable']").each((index,link) => {
            const id = $(link).data("id");
            const rolltable = game.tables.get(id);

            const rollNode = $(`<a class="roll-table-roll-link" title="${game.i18n.localize("BRT.DrawReroll")}"><i class="fas fa-dice-d20"></i></a>`)
                .click(async () => {
                    await game.betterTables.generateChatLoot(rolltable);
                })
            $(link).after(rollNode);
        });

        // handling rolltables in compendiums
        $(html).find("a.entity-link[data-pack]").each(async (index,link) => {
            const pack_name = $(link).data("pack");
            const pack = game.packs.get(pack_name);
            if (!pack) return;

            const id = $(link).data("id");
            const document = await pack.getDocument(id);
            if (!document || document.documentName !== "RollTable") return;

            const rollNode = $(`<a class="roll-table-roll-link" title="${game.i18n.localize("BRT.DrawReroll")}"><i class="fas fa-dice-d20"></i></a>`)
                .click(async () => {
                    await game.betterTables.generateChatLoot(document);
                })
            $(link).after(rollNode);
        });
    }

    /**
     * Handle Reroll buttons on cards
     * @param {ChatMessage} message newly created message
     * @param {Object} html message content
     * @returns {Promise<void>}
     */
    static async handleChatMessageButtons(message, html) {
        BetterTables._addRerollButtonToMessage(message, html);
        BetterTables._addRollButtonsToEntityLink(html);
    }

    /**
     * Update a message with a new content
     * @param {ChatMessage} message message to update
     * @param {String} content new HTML content of message
     * @returns {Promise<void>}
     */
    static async updateChatMessage(message, content) {
        if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.SHOW_WARNING_BEFORE_REROLL)) {
            Dialog.confirm({
                title: game.i18n.localize("BRT.Settings.RerollWarning.Title"),
                content: game.i18n.localize("BRT.Settings.RerollWarning.Description"),
                yes: () => message.update({"content": content, "timestamp": Date.now()}),
                defaultYes: false
            });
        } else {
            message.update({"content": content, "timestamp": Date.now()});
        }
    }

    static async handleRolltableLink(sheet, html, data) {
        // handling rolltables imported in campaign
        $(html).find("a.entity-link[data-entity='RollTable']").each((index,link) => {
            const id = $(link).data("id");
            const rolltable = game.tables.get(id);

            const rollNode = $(`<a class="roll-table-roll-link" title="${game.i18n.localize("BRT.DrawReroll")}"><i class="fas fa-dice-d20"></i></a>`)
                .click(async () => {
                    await game.betterTables.generateChatLoot(rolltable);
            })
            $(link).after(rollNode);
        });

        // handling rolltables in compendiums
        $(html).find("a.entity-link[data-pack]").each(async (index,link) => {
            const pack_name = $(link).data("pack");
            const pack = game.packs.get(pack_name);
            if (!pack) return;

            const id = $(link).data("id");
            const document = await pack.getDocument(id);
            if (!document || document.documentName !== "RollTable") return;

            const rollNode = $(`<a class="roll-table-roll-link" title="${game.i18n.localize("BRT.DrawReroll")}"><i class="fas fa-dice-d20"></i></a>`)
                .click(async () => {
                    await game.betterTables.generateChatLoot(document);
                })
            $(link).after(rollNode);
        });
    }
}