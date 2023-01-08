import { LootCreator } from './loot/loot-creator.js';
import { LootChatCard } from './loot/loot-chat-card.js';
import { StoryBuilder } from './story/story-builder.js';
import { StoryChatCard } from './story/story-chat-card.js';
import { BRTBuilder } from './core/brt-builder.js';
import { BetterResults } from './core/brt-table-results.js';
import { getIconByEntityType, i18n } from './core/utils.js';
import { BRTCONFIG, MODULE } from './core/config.js';

export class BetterTables {
  constructor() {
    this._spellCache = undefined;
  }

  /**
   * Get spells in cache for
   * @returns {*}
   */
  getSpellCache() {
    return this._spellCache;
  }

  /**
   *
   * @param {*} tableEntity
   */
  async generateLoot(tableEntity, options = {}) {
    const brtBuilder = new BRTBuilder(tableEntity),
      results = await brtBuilder.betterRoll(),
      br = new BetterResults(results),
      betterResults = await br.buildResults(tableEntity),
      currencyData = br.getCurrencyData(),
      lootCreator = new LootCreator(betterResults, currencyData);

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

    ui.notifications.info('Loot generation started.');

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

    return ui.notifications.info('Loot generation complete.');
  }

  async generateChatLoot(tableEntity, options = null) {
    const rollMode = options && 'rollMode' in options ? options.rollMode : null;
    const brtBuilder = new BRTBuilder(tableEntity),
      results = await brtBuilder.betterRoll(),
      br = new BetterResults(results),
      betterResults = await br.buildResults(tableEntity),
      currencyData = br.getCurrencyData(),
      lootChatCard = new LootChatCard(betterResults, currencyData, rollMode);

    await lootChatCard.createChatCard(tableEntity);
  }

  async getStoryResults(tableEntity) {
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

  async getBetterTableResults(tableEntity) {
    const brtBuilder = new BRTBuilder(tableEntity);
    return await brtBuilder.betterRoll();
  }

  async betterTableRoll(tableEntity, options = null) {
    const rollMode = options && 'rollMode' in options ? options.rollMode : null;

    const brtBuilder = new BRTBuilder(tableEntity);
    const results = await brtBuilder.betterRoll();

    if (game.settings.get(MODULE.ns, BRTCONFIG.USE_CONDENSED_BETTERROLL)) {
      const br = new BetterResults(results);
      const betterResults = await br.buildResults(tableEntity);
      const currencyData = br.getCurrencyData();

      const lootChatCard = new LootChatCard(
        betterResults,
        currencyData,
        rollMode
      );
      await lootChatCard.createChatCard(tableEntity);
    } else {
      await brtBuilder.createChatCard(results, rollMode);
    }
  }

  async roll(tableEntity) {
    const data = await BetterTables.prepareCardData(tableEntity);
    return data.flags?.betterTables?.loot;
  }

  /**
   * Create a new RollTable by extracting entries from a compendium.
   *
   * @param {string} tableName the name of the table entity that will be created
   * @param {string} compendiumName the name of the compendium to use for the table generation
   * @param {function(Document)} weightPredicate a function that returns a weight (number) that will be used
   * for the tableResult weight for that given entity. returning 0 will exclude the entity from appearing in the table
   *
   * @deprecated use api.createRolltableFromCompendium instead
   */

  async createTableFromCompendium(
    tableName,
    compendiumName,
    { weightPredicate = null } = {}
  ) {
    const compendium = game.packs.get(compendiumName);
    if (compendium === undefined) {
      ui.notifications.warn(`Compendium named ${compendiumName} not found.`);
      return;
    }

    const compendiumSize = (await compendium.getIndex()).size;
    if (compendiumSize === 0) {
      ui.notifications.warn(
        MODULE.ns +
          ` | Compendium named ${compendium.title} (${compendiumName}) is empty.`
      );
      return;
    }

    ui.notifications.info(
      MODULE.ns +
        ` | Starting generation of rolltable for ${compendium.title} (${compendiumName}) with ${compendiumSize} entries.`
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
          `Rolltable ${tableName} with ${rolltable.results.size} entries was generated.`
        );
      });
  }

  /**
   * Update spell cache used for random spell scroll generation
   *
   * @returns {Promise<void>}
   */
  async updateSpellCache(pack) {
    if (game.user.isGM) {
      const defaultPack = game.settings.get(
          MODULE.ns,
          BRTCONFIG.SPELL_COMPENDIUM_KEY
        ),
        spellCompendium = game.packs.get(defaultPack);

      if ((!pack && spellCompendium) || pack === defaultPack) {
        const spellCompendiumIndex = await spellCompendium.getIndex({
          fields: ['system.level', 'img'],
        });
        this._spellCache = spellCompendiumIndex
          .filter((entry) => entry.type === 'spell')
          .map((i) =>
            mergeObject(i, { collection: spellCompendium.collection })
          );
      } else {
        ui.notifications.error(
          MODULE.ns + `| Spell cache could not be initialized/updated.`
        );
      }
    }
  }

  /**
   *
   * @param {HTMLElement} html
   * @param {Array} options
   */
  static async enhanceCompendiumContextMenu(html, options) {
    const api = game.modules.get(MODULE.ns).public.API;

    if (game.user.isGM) {
      options.push({
        name: i18n('BRT.api.msg.generateRolltableFromCompendium'),
        icon: '<i class="fas fa-th-list"></i>',
        callback: (li) => {
          api.createRolltableFromCompendium(li.data('pack'));
        },
      });

      if (
        game.settings.get(
          MODULE.ns,
          BRTCONFIG.ADD_ROLL_IN_COMPENDIUM_CONTEXTMENU
        )
      ) {
        options.push({
          name: i18n('BRT.api.msg.rollCompendiumAsRolltable'),
          icon: '<i class="fas fa-dice-d20"></i>',
          callback: (li) => {
            api.rollCompendiumAsRolltable(li.data('pack'));
          },
        });
      }
    }
  }

  /**
   * Add a roll option in context menu of rolltables
   * @param {HTMLElement} html
   * @param {Array} options
   */
  static async enhanceRolltableContextMenu(html, options) {
    if (
      game.user.isGM &&
      game.settings.get(MODULE.ns, BRTCONFIG.ADD_ROLL_IN_ROLLTABLE_CONTEXTMENU)
    ) {
      options.unshift({
        name: 'Roll table',
        icon: '<i class="fas fa-dice-d20"></i>',
        callback: (li) => {
          BetterTables.menuCallBackRollTable(li.data('documentId'));
        },
      });
    }
  }

  /**
   *
   * @param {String} rolltableId ID of the rolltable to roll
   */
  static async menuCallBackRollTable(rolltableId) {
    const rolltable = game.tables.get(rolltableId);
    await game.betterTables.betterTableRoll(rolltable);
  }

  /**
   * Create card content from compendium content
   *
   * @param {String} compendium compendium name
   *
   * @returns {Promise<{flavor: string, sound: string, user: *, content: *}>}
   *
   * @deprecated use api.rollCompendiumAsRolltable instead
   */
  static async rollCompendiumAsRolltable(compendium) {
    const api = game.modules.get(MODULE.ns).public.API;
    api.rollCompendiumAsRolltable(compendium);
  }

  static async _renderMessage(message) {
    const cardHtml = await renderTemplate(
      'modules/better-rolltables/templates/loot-chat-card.hbs',
      message.flags.betterTables.loot
    );
    message.content = cardHtml;
    return message;
    /*
    return {
      flavor: message.data.flavor,
      sound: message.data.sound,
      user: message.data.user,
      content: cardHtml,
      flags: {
        betterTables: {
          loot: data
        }
      }
    }
    */
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

  static async _toggleCurrenciesShareSection(message, html) {
    const section = html[0].querySelector('section.brt-share-currencies');
    section.classList.toggle('brt-hidden');
    // await BetterTables.updateChatMessage(message, html, {"force":true});
  }

  static async _addButtonsToMessage(message, html) {
    const tableDrawNode = $(html).find('.table-draw');
    const id = $(tableDrawNode).data('id');
    const pack = $(tableDrawNode).data('pack');
    if (!id && !pack) return;

    if (game.settings.get(MODULE.ns, BRTCONFIG.SHOW_REROLL_BUTTONS)) {
      // reroll button
      const rerollButton = $(
        `<a class="roll-table-reroll-button" title="${game.i18n.localize(
          'BRT.DrawReroll'
        )}">`
      ).append("<i class='fas fa-dice-d20'></i>");
      rerollButton.click(async () => {
        let cardContent;
        if (pack && !id) {
           const api = game.modules.get(MODULE.ns).public.API;
           cardContent = await api.rollCompendiumAsRolltable(pack,MODULE.ns);
        } else {
          let rolltable;
          if (pack && id) {
            rolltable = await game.packs.get(pack)?.getDocument(id);
          } else {
            rolltable = game.tables.get(id);
          }
          if (rolltable) {
            cardContent = await BetterTables.prepareCardData(rolltable);
          }
        }
        await BetterTables.updateChatMessage(message, cardContent, {
          flags: cardContent.flags,
        });
      });
      $(html).find('.message-delete').before(rerollButton);
    }

    if (
      game.system.id === 'dnd5e' &&
      game.settings.get(MODULE.ns, BRTCONFIG.SHOW_CURRENCY_SHARE_BUTTON) &&
      message.flags?.betterTables?.loot.currency &&
      Object.keys(message.flags.betterTables.loot.currency).length > 0
    ) {
      // Currency share button
      const currencyShareButton = $(
        `<a class="roll-table-share-currencies" title="${game.i18n.localize(
          'BRT.Buttons.Currency.Share'
        )}">`
      ).append("<i class='fas fa-coins'></i>");
      currencyShareButton.click(async () =>
        BetterTables._toggleCurrenciesShareSection(message, html)
      );
      $(html).find('.message-delete').before(currencyShareButton);
      const shareButton = html[0].querySelector(
        'button.brt-share-currencies-button'
      );
      shareButton.addEventListener('click', async (event) => {
        await BetterTables._shareCurrenciesToPlayers(message, html);
      });
    }

    if (game.settings.get(MODULE.ns, BRTCONFIG.SHOW_OPEN_BUTTONS)) {
      // Open link
      let document;
      if (pack && id) {
        document = await game.packs.get(pack)?.getDocument(id);
      } else {
        document = game.tables.get(id);
      }
      if (document) {
        const openLink = $(
          `<a class="roll-table-open-table" title="${game.i18n.localize(
            'BRT.OpenRolltable'
          )}">`
        ).append("<i class='fas fa-th-list'></i>");
        if (id) openLink.data('id', id);
        if (pack) openLink.data('pack', pack);
        openLink.click(async () => document.sheet.render(true));
        $(html).find('.message-delete').before(openLink);
      }
    }
  }

  /**
   *
   * @param {ChatMessage} message
   * @param {HTMLElement} html
   * @returns {Promise<undefined>}
   * @private
   */
  static async _shareCurrenciesToPlayers(message, html) {
    await BetterTables._toggleCurrenciesShareSection(message, html);
    const usersId = Array.from(
      html[0]
        .querySelector('section.brt-share-currencies')
        ?.querySelectorAll('input:checked')
    ).map((x) => x.dataset.userId);
    if (!usersId) return undefined;

    const currenciesToShare = message.flags.betterTables.loot.currency;
    const usersCount = usersId.length;
    const share = Object.keys(currenciesToShare)
      .map((x) => ({ [x]: Math.floor(currenciesToShare[x] / usersCount) }))
      .reduce((a, b) => Object.assign(a, b), {});

    for (const userId of usersId) {
      const user = game.users.get(userId);
      const currency = user.character.system.currency;
      for (let key of Object.keys(currency)) {
        const increment = share[key] || 0;
        if (increment > 0) {
          currency[key] += increment;
        }
      }
      await user.character.update({ 'currency': currency });
    }
    const newMessage = await BetterTables._renderMessage(
      mergeObject(message, { 'flags.betterTables.loot.shared': true })
    );
    await BetterTables.updateChatMessage(message, newMessage);
  }

  static async _addRollButtonsToEntityLink(html) {
    if (game.settings.get(MODULE.ns, BRTCONFIG.ROLL_TABLE_FROM_JOURNAL)) {
      // handling rolltables imported in campaign
      $(html)
        .find("a.content-link[data-entity='RollTable']")
        .each((index, link) => {
          const id = $(link).data('id');
          const rolltable = game.tables.get(id);

          const rollNode = $(
            `<a class="roll-table-roll-link" title="${game.i18n.localize(
              'BRT.DrawReroll'
            )}"><i class="fas fa-dice-d20"></i></a>`
          ).click(async () => {
            await game.betterTables.generateChatLoot(rolltable);
          });
          $(link).after(rollNode);
        });

      // handling rolltables in compendiums
      $(html)
        .find('a.content-link[data-pack]')
        .each(async (index, link) => {
          const packName = $(link).data('pack');
          const pack = game.packs.get(packName);
          if (!pack) return;

          const id = $(link).data('id');
          const document = await pack.getDocument(id);
          if (!document || document.documentName !== 'RollTable') return;

          const rollNode = $(
            `<a class="roll-table-roll-link" title="${game.i18n.localize(
              'BRT.DrawReroll'
            )}"><i class="fas fa-dice-d20"></i></a>`
          ).click(async () => {
            await game.betterTables.generateChatLoot(document);
          });
          $(link).after(rollNode);
        });
    }
  }

  /**
   * Handle Reroll buttons on cards
   * @param {ChatMessage} message newly created message
   * @param {Object} html message content
   * @returns {Promise<void>}
   */
  static async handleChatMessageButtons(message, html) {
    if (game.user.isGM) {
      BetterTables._addButtonsToMessage(message, html);
      BetterTables._addRollButtonsToEntityLink(html);
    }
  }

  /**
   * Update a message with a new content
   * @param {ChatMessage} message message to update
   * @param {ChatMessage} content new HTML content of message
   * @param {Object} options
   * @returns {Promise<void>}
   */
  static async updateChatMessage(message, content, options = {}) {
    if (game.user.isGM) {
      if (
        !options.force &&
        game.settings.get(MODULE.ns, BRTCONFIG.SHOW_WARNING_BEFORE_REROLL)
      ) {
        Dialog.confirm({
          title: game.i18n.localize('BRT.Settings.RerollWarning.Title'),
          content: game.i18n.localize('BRT.Settings.RerollWarning.Description'),
          yes: () =>
            BetterTables.updateChatMessage(message, content, { force: true }),
          defaultYes: false,
        });
      } else {
        message.update({
          content: content.content,
          flags: options.flags,
          timestamp: Date.now(),
        });
      }
    }
  }

  static async handleRolltableLink(sheet, html) {
    if (
      game.user.isGM &&
      game.settings.get(MODULE.ns, BRTCONFIG.ROLL_TABLE_FROM_JOURNAL)
    ) {
      // handling rolltables imported in campaign
      $(html)
        .find("a.content-link[data-uuid^='RollTable']")
        .each((index, link) => {
          const id = $(link).data('id');
          const rolltable = game.tables.get(id);

          const rollNode = $(
            `<a class="roll-table-roll-link" title="${game.i18n.localize(
              'BRT.DrawReroll'
            )}"><i class="fas fa-dice-d20"></i></a>`
          ).click(async () => {
            await game.betterTables.generateChatLoot(rolltable);
          });
          $(link).after(rollNode);
        });

      // handling rolltables in compendiums
      $(html)
        .find('a.content-link[data-pack]')
        .each(async (index, link) => {
          const packName = $(link).data('pack');
          const pack = game.packs.get(packName);
          if (!pack) return;

          const id = $(link).data('id');
          const document = await pack.getDocument(id);
          if (!document || document.documentName !== 'RollTable') return;

          const rollNode = $(
            `<a class="roll-table-roll-link" title="${game.i18n.localize(
              'BRT.DrawReroll'
            )}"><i class="fas fa-dice-d20"></i></a>`
          ).click(async () => {
            await game.betterTables.generateChatLoot(document);
          });
          $(link).after(rollNode);
        });
    }
  }

  createLink(item) {
    if (!item) return undefined;

    if (!item.type || item.type > 0) {
      const id = item.id;
      const text = item.name || item.text;
      const entity = item.documentName;
      const pack =
        item.pack ||
        game.collections.get(item.collectionName)?.documentName ||
        '';
      const packPart = pack !== '' ? `data-pack="${pack}"` : '';
      const icon = getIconByEntityType(entity);
      return `<a class="content-link" draggable="true" ${packPart} data-entity="${entity}" data-id="${id}"><i class="fas ${icon}"></i>${text}</a>`;
    }

    return item.text;
  }
}
