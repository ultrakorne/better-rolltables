import { BRTBuilder } from './core/brt-builder.js';
import { BetterResults } from './core/brt-table-results.js';
import { MODULE, BRTCONFIG } from './core/config.js';
import { LootChatCard } from './loot/loot-chat-card.js';
import { LootCreator } from './loot/loot-creator.js';
import { getRandomItemFromCompendium } from './core/utils.js';

/**
 * Create a new API class and export it as default
 */
class API {
  /**
   * Get better rolltable tags from settings
   *
   */
  static getTags() {
    return game.settings.get(MODULE.ns, BRTCONFIG.TAGS.USE);
  }

  /**
   * Roll a table an add the resulting loot to a given token.
   *
   * @param {RollTable} tableEntity
   * @param {TokenDocument} token
   * @param {options} object
   * @returns
   */
  async addLootToSelectedToken(tableEntity, token = null, options = null) {
    let tokenstack = [];
    const isTokenActor = options && options?.isTokenActor,
      stackSame = options && options?.stackSame ? options.stackSame : true,
      customRoll =
        options && options?.customRole ? options.customRole : undefined,
      itemLimit = options && options?.itemLimit ? Number(options.itemLimit) : 0;

    if (null == token && canvas.tokens.controlled.length === 0) {
      return ui.notifications.error('Please select a token first');
    } else {
      tokenstack = token
        ? token.length >= 0
          ? token
          : [token]
        : canvas.tokens.controlled;
    }

    ui.notifications.info(MODULE.ns + ' | API | Loot generation started.');

    const brtBuilder = new BRTBuilder(tableEntity);

    for (const token of tokenstack) {
      const results = await brtBuilder.betterRoll(customRoll);
      const br = new BetterResults(results);
      const betterResults = await br.buildResults(tableEntity);
      const currencyData = br.getCurrencyData();
      const lootCreator = new LootCreator(betterResults, currencyData);

      await lootCreator.addCurrenciesToToken(token, isTokenActor);
      await lootCreator.addItemsToToken(
        token,
        stackSame,
        isTokenActor,
        itemLimit
      );
    }

    return ui.notifications.info(
      MODULE.ns + ' | API | Loot generation complete.'
    );
  }

  /**
   *
   * @param {*} tableEntity
   */
  static async generateLoot(tableEntity, options = {}) {
    const builder = new BRTBuilder(tableEntity),
      results = await builder.betterRoll(),
      br = new BetterResults(results),
      betterResults = await br.buildResults(tableEntity),
      currencyData = br.getCurrencyData(),
      lootCreator = new LootCreator(betterResults, currencyData); //LootCreator;

    await lootCreator.createActor(tableEntity);
    await lootCreator.addCurrenciesToActor();
    await lootCreator.addItemsToActor();

    if (
      game.settings.get(
        MODULE.ns,
        BRTCONFIG.ALWAYS_SHOW_GENERATED_LOOT_AS_MESSAGE
      )
    ) {
      const rollMode =
        options && 'rollMode' in options ? options.rollMode : null;
      const lootChatCard = new LootChatCard(
        betterResults,
        currencyData,
        rollMode
      );
      await lootChatCard.createChatCard(tableEntity);
    }
  }

  /**
   *
   * @param {String} compendium ID of the compendium to roll
   */
  static async rollCompendiumAsRolltable(compendium = null, hideChatMessage) {
    if (!game.user.isGM || !compendium) return;

    // Get random item from compendium
    const item = await getRandomItemFromCompendium(compendium);

    // prepare card data
    const fontSize = Math.max(60, 100 - Math.max(0, item.name.length - 27) * 2);
    const chatCardData = {
      compendium: compendium,
      itemsData: [{ item: item, quantity: 1, fontSize: fontSize, type: 2 }],
    };
    const cardHtml = await renderTemplate(
      'modules/better-rolltables/templates/loot-chat-card.hbs',
      chatCardData
    );
    let chatData = {
      flavor: `Rolled from compendium ${item.pack}`,
      sound: 'sounds/dice.wav',
      user: game.user._id,
      content: cardHtml,
    };

    if (!hideChatMessage)
      ChatMessage.create(chatData);
    return chatData;
  }

  /**
   * @module BetterRolltables.API.createRolltableFromCompendium
   *
   * @description Create a new RollTable by extracting entries from a compendium.
   *
   * @version 1.0.1
   * @since 1.8.7
   *
   * @param {string} compendiumName the name of the compendium to use for the table generation
   * @param {string} tableName the name of the table entity that will be created
   * @param {function(Document)} weightPredicate a function that returns a weight (number) that will be used
   * for the tableResult weight for that given entity. returning 0 will exclude the entity from appearing in the table
   *
   * @returns {Promise<Document>} the table entity that was created
   */
  static async createRolltableFromCompendium(
    compendiumName,
    tableName = compendiumName + ' RollTable',
    { weightPredicate = null } = {}
  ) {
    const compendium = game.packs.get(compendiumName);
    let msg = { name: compendiumName, tableName: tableName },
      api_msg = MODULE.ns + '.api | ';

    if (compendium === undefined) {
      api.msg += game.i18n.format('BRT.api.msg.compendiumNotFound', msg);
      ui.notifications.warn(MODULE.ns + ' | ' + api_msg);
      return;
    }

    msg.title = compendium.title;
    msg.compendiumSize = (await compendium.getIndex()).size;

    if (!msg.compendiumSize) {
      ui.notifications.warn(
        api.msg + game.i18n.format('BRT.api.msg.compendiumEmpty', msg)
      );
      return;
    }

    ui.notifications.info(
      api_msg + game.i18n.format('BRT.api.msg.startRolltableGeneration', msg)
    );

    compendium
      .getDocuments()
      .then((compendiumItems) => {
        return compendiumItems.map((item) => ({
          type: CONST.TABLE_RESULT_TYPES.COMPENDIUM,
          collection: compendiumName,
          text: item.name,
          img: item.img,
          weight: weightPredicate ? weightPredicate(item) : 1,
          range: [1, 1],
        }));
      })
      .then((results) =>
        RollTable.create({
          name: tableName,
          results: results.filter((x) => x.weight !== 0), // remove empty results due to null weight
        })
      )
      .then((rolltable) => {
        rolltable.normalize();
        ui.notifications.info(
          api_msg +
            game.i18n.format('BRT.api.msg.rolltableGenerationFinished', msg)
        );
      });
  }
}

export { API };
