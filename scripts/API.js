import { BRTBuilder } from "./core/brt-builder";
import { BetterResults } from "./core/brt-table-results";
import { BRTCONFIG, MODULE } from "./core/config";
import { LootChatCard } from "./loot/loot-chat-card";
import { LootCreator } from "./loot/loot-creator";

/**
 * Create a new API class and export it as default
 */
class API {
    constructor(version, config) {
        this.version = version;
        this.config = config;
        this.endpoints = {};
        this.methods = {};
    }

    /**
     * Get better rolltable tags from settings
     * 
     */
    getTags() {
        return game.settings.get(MODULE.ns, BRTCONFIG.TAGS.USE);
    }

    /**
   * 
   * @param {*} tableEntity 
   */
    async generateLoot(tableEntity, options = {}) {
        const builder = new BRTBuilder(tableEntity),
            results = await builder.betterRoll(),
            br = new BetterResults(results),
            betterResults = await br.buildResults(tableEntity),
            currencyData = br.getCurrencyData(),
            lootCreator = new LootCreator(betterResults, currencyData);//LootCreator;

        await lootCreator.createActor(tableEntity);
        await lootCreator.addCurrenciesToActor();
        await lootCreator.addItemsToActor();

        if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.ALWAYS_SHOW_GENERATED_LOOT_AS_MESSAGE)) {
            const rollMode = (options && ('rollMode' in options)) ? options.rollMode : null;
            const lootChatCard = new  LootChatCard(betterResults, currencyData, rollMode);
            await lootChatCard.createChatCard(tableEntity);
        }
    }
}

export default API;