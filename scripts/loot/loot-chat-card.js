import { LootCreator } from './loot-creator.js';
import { addRollModeToChatData, getItemFromCompendium } from '../core/utils.js';
import { MODULE, BRTCONFIG } from '../core/config.js';

/**
 * create a chat card based on the content of the object LootData
 */
export class LootChatCard {
  /**
   * @param {object} betterResults
   * @param {object} currencyData
   */
  constructor(betterResults, currencyData, rollMode) {
    this.betterResults = betterResults;
    this.currencyData = currencyData;
    this.rollMode = rollMode;

    this.itemsData = [];
    this.numberOfDraws = 0;
  }

  async findOrCreateItems() {
    const lootCreator = new LootCreator(this.betterResults, this.currencyData);
    for (const item of this.betterResults) {
      if (item.type === CONST.TABLE_RESULT_TYPES.TEXT) {
        this.addToItemData({
          id: item.text,
          text: item.text,
          img: item.img,
          isText: true,
        });
        continue;
      }

      this.numberOfDraws++;
      /** we pass though the data, since we might have some data manipulation that changes an existing item, in that case even if it was initially
       * existing or in a compendium we have to create a new one */
      const itemData = await lootCreator.buildItemData(item);
      if (item.collection) {
        const itemEntity = await getItemFromCompendium(item);

        if (itemEntity && itemEntity.name === itemData.name) {
          this.addToItemData(itemEntity, itemData);
          continue;
        }
      }

      const itemEntity = game.items.getName(itemData.name);
      if (itemEntity) {
        this.addToItemData(itemEntity, itemData);
        continue;
      }

      const itemFolder = await this.getBRTFolder();
      itemData.folder = itemFolder.id;

      setProperty(
        itemData,
        'permission.default',
        CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER
      );
      const newItem = await Item.create(itemData);
      this.addToItemData(newItem, itemData);
    }
  }

  addToItemData(itemEntity, data) {
    const existingItem = this.itemsData.find(
      (i) => i.item.id === itemEntity.id
    );
    const quantity = getProperty(data, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1;

    if (existingItem) {
      existingItem.quantity = +existingItem.quantity + +quantity;
    } else {
      // we will scale down the font size if an item name is too long
      const fontSize = Math.max(
        60,
        100 - Math.max(0, (itemEntity.name || itemEntity.text).length - 27) * 2
      );

      let type = undefined;
      if (itemEntity.isText) type = CONST.TABLE_RESULT_TYPES.TEXT;
      else if (itemEntity.pack) type = CONST.TABLE_RESULT_TYPES.COMPENDIUM;
      else type = CONST.TABLE_RESULT_TYPES.DOCUMENT;

      this.itemsData.push({
        documentName: itemEntity.documentName,
        compendiumName: itemEntity.pack,
        type: type,
        item: {
          id: itemEntity.id,
          name: itemEntity.name,
          img: itemEntity.img,
          text: itemEntity.text,
        },
        quantity: quantity,
        fontSize: fontSize,
      });
    }
  }

  async renderMessage(data) {
    return renderTemplate(
      'modules/better-rolltables/templates/loot-chat-card.hbs',
      data
    );
  }

  async getBRTFolder() {
    if (!this.historyFolder) {
      let historyFolder = game.folders.getName('Better RollTable Items');
      if (!historyFolder) {
        historyFolder = await Folder.create({
          name: 'Better RollTable Items',
          parent: null,
          type: 'Item',
        });
      }
      this.historyFolder = historyFolder;
    }
    return this.historyFolder;
  }

  async prepareCharCart(table) {
    await this.findOrCreateItems();

    const chatCardData = {
      tableData: table,
      itemsData: this.itemsData,
      currency: this.currencyData,
      compendium: table.pack,
      id: table.id,
      users: game.users
        .filter((user) => !user.isGM && user.character)
        .map((user) => ({
          id: user.id,
          name: user.character.name,
          img: user.character.token?.img || user.avatar,
        })),
    };

    const cardHtml = await this.renderMessage(chatCardData);

    let flavorString;
    if (this.numberOfDraws > 1) {
      flavorString = game.i18n.format('BRT.DrawResultPlural', {
        amount: this.numberOfDraws,
        name: table.name,
      });
    } else if (this.numberOfDraws > 0) {
      flavorString = game.i18n.format('BRT.DrawResultSingular', {
        amount: this.numberOfDraws,
        name: table.name,
      });
    } else {
      flavorString = game.i18n.format('BRT.DrawResultZero', {
        name: table.name,
      });
    }

    return {
      flavor: flavorString,
      sound: 'sounds/dice.wav',
      user: game.user._id,
      content: cardHtml,
      flags: {
        betterTables: {
          loot: chatCardData,
        },
      },
    };
  }

  async createChatCard(table) {
    const chatData = await this.prepareCharCart(table);
    addRollModeToChatData(chatData, this.rollMode);
    ChatMessage.create(chatData);
  }
}
