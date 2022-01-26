import { getItemFromCompendium } from '../core/utils.js'
import { MODULE, BRTCONFIG } from '../core/config.js'
import { LootManipulator } from './loot-manipulation.js'

export class LootCreator {
  /**
   * Will create an actor carring items based on the content of the object lootData
   * @param {object} betterResults check BetterResults
   * @param currencyData
   */
  constructor(betterResults, currencyData) {
    this.betterResults = betterResults;
    this.currencyData = currencyData;
    this.lootManipulator = new LootManipulator();
  }

  async createActor(table, overrideName = undefined) {
    const actorName = overrideName || table.getFlag(MODULE.ns, BRTCONFIG.ACTOR_NAME_KEY);
    this.actor = game.actors.getName(actorName);
    if (!this.actor) {
      this.actor = await Actor.create({
        name: actorName || 'New Loot',
        type: 'npc',
        img: 'modules/better-rolltables/artwork/chest.webp',
        sort: 12000,
        token: { actorLink: true }
      });
    }

    const lootSheet = game.settings.get(MODULE.ns, BRTCONFIG.LOOT_SHEET_TO_USE_KEY)
    if (lootSheet in CONFIG.Actor.sheetClasses.npc) {
      await this.actor.setFlag('core', 'sheetClass', lootSheet);
    }
  }

  async addCurrenciesToActor() {
    const currencyData = duplicate(this.actor.data.data.currency);
    const lootCurrency = this.currencyData;

    for (const key in currencyData) {
      const amount = Number(currencyData[key] || 0) + Number(lootCurrency[key] || 0);
      currencyData[key] = amount;
    }

    await this.actor.update({ 'data.currency': currencyData });
  }

  /**
   *
   * @param {boolean} stackSame Should same items be stacked together? Default = true
   * @returns
   */
  async addItemsToActor(stackSame = true) {
    const items = [];
    for (const item of this.betterResults) {
      const newItem = await this._createLootItem(item, this.actor, stackSame);
      items.push(newItem);
    }
    return items;
  }

  /**
     *
     * @param {object} item representation
     * @param {Actor} actor to which to add items to
     * @param {boolean} stackSame if true add quantity to an existing item of same name in the current actor
     * @param {number} customLimit
     * @returns {Item} the create Item (foundry item)
     */
  async _createLootItem(item, actor, stackSame = true, customLimit = 0) {
    const newItemData = await this.buildItemData(item),
      itemPrice = getProperty(newItemData, BRTCONFIG.PRICE_PROPERTY_PATH) || 0,
      embeddedItems = [...actor.getEmbeddedCollection('Item').values()],
      originalItem = embeddedItems.find(i => i.name === newItemData.name && itemPrice === getProperty(i.data, BRTCONFIG.PRICE_PROPERTY_PATH));

    /** if the item is already owned by the actor (same name and same PRICE) */
    if (originalItem && stackSame) {
      /** add quantity to existing item */
      const newItemQty = getProperty(newItemData, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1,
        originalQty = getProperty(originalItem.data, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1,
        updateItem = { _id: originalItem.id },
        newQty = this._handleLimitedQuantity(newItemQty, originalQty, customLimit);

      if (newQty != newItemQty) {
        setProperty(updateItem, BRTCONFIG.QUANTITY_PROPERTY_PATH, newQty);
        await actor.updateEmbeddedDocuments('Item', [updateItem]);
      }
      return actor.items.get(originalItem.id);
    } else {
      /** we create a new item if we don't own already */
      return await actor.createEmbeddedDocuments('Item', [newItemData]);
    }
  }

  /**
   *
   * @param {number} currentQty Quantity of item we want to add
   * @param {number} originalQty Quantity of the originalItem already in posession
   * @param {number} customLimit A custom Limit
   * @returns
   */
  _handleLimitedQuantity(currentQty, originalQty, customLimit = 0) {
    const newQty = Number(originalQty) + Number(currentQty);

    if (customLimit > 0) {
      // limit is bigger or equal to newQty
      if (Number(customLimit) >= Number(newQty)) {
        return newQty;
      }
      //limit was reached, we stick to that limit
      return customLimit;
    }

    //we don't care for the limit
    return newQty;
  }

  /**
     *
     * @param {object} item
     * @returns
     */
  async buildItemData(item) {
    let itemData = {},
      existingItem = false;
    /** Try first to load item from compendium */
    if (item.collection) {
      existingItem = await getItemFromCompendium(item);
    } else {
      /** if an item with this name exist we load that item data, otherwise we create a new one */
      existingItem = game.items.getName(item.text);
    }

    if (existingItem) {
      itemData = duplicate(existingItem.data);
      itemData.type = BRTCONFIG.ITEM_LOOT_TYPE;
    }

    itemData = await this.applyItemConversions(itemData);

    if (Object.getOwnPropertyDescriptor(item, 'commands') && item.commands) {
      itemData = this._applyCommandToItemData(itemData, item.commands);
    }

    if (!itemData) return
    itemData = await this.lootManipulator.preItemCreationDataManipulation(itemData);
    return itemData;
  }

  /**
   * Converts certain documents to loot items
   *
   * @param {object} itemData
   * @param {object} conversions
   * @returns
   */
  async applyItemConversions(item, conversions) {
    if (item.type === "spell" && game.system.id === "dnd5e") {
      item = await Item5e.createScrollFromSpell(item);
    }

    const defaultConversions = {
      Actor: {
        text: `${item.text} Portrait`,
        img: item?.img || "icons/svg/mystery-man.svg"
      },
      Scene: {
        text: 'Map of ' + item?.data?.name,
        img: item?.data?.thumb || "icons/svg/direction.svg",
        data: {
          price: new Roll('1d20 + 10').roll().total || 1
        }
      }
    };

    conversions = conversions || defaultConversions;

    const convert = conversions[item.documentName] ?? false;

    if (convert) {
      for (const prop in convert) {
        item[prop] = convert[prop];
      }
    }

    return item;
  }

  /**
     *
     * @param {object} itemData
     * @param {object[]} commands
     * @returns {object} itemData
     */
  _applyCommandToItemData(itemData, commands) {
    for (const cmd of commands) {
      // TODO check the type of command, that is a command to be rolled and a valid command
      let rolledValue;
      try {
        rolledValue = new Roll(cmd.arg).roll().total;
      } catch (error) {
        continue;
      }
      setProperty(itemData, `data.${cmd.command.toLowerCase()}`, rolledValue);
    }
    return itemData;
  }

  /**
     *
     * @param {Token|Actor} token
     * @param {Boolean} is the token passed as the token actor instead?
     */
  async addCurrenciesToToken(token, isTokenActor = false) {
    // needed for base key set in the event that a token has no currency properties
    const currencyDataInitial = { cp: 0, ep: 0, gp: 0, pp: 0, sp: 0 };
    let currencyData = currencyDataInitial;

    if (isTokenActor) {
      currencyData = duplicate(token.data.data.currency);
    } else if (token.data.actorData?.data?.currency) {
      currencyData = duplicate(token.data.actorData.data.currency);
    }

    const lootCurrency = this.currencyData;

    for (const key in currencyDataInitial) {
      const amount = Number(currencyData[key] || 0) + Number(lootCurrency[key] || 0);
      currencyData[key] = amount;
    }

    if (isTokenActor) {
      // @type {Actor}
      return await token.update({ 'actorData.data.currency': currencyData });
    } else {
      return await token.actor.update({ 'data.currency': currencyData });
    }
  }

  /**
     *
     * @param {token} token
     * @param {boolean} stackSame
     * @param {boolean} isTokenActor - is the token already the token actor?
     * @param {number} customLimit
     *
     * @returns {object[]} items
     */
  async addItemsToToken(token, stackSame = true, isTokenActor = false, customLimit = 0) {
    const items = [];
    for (const item of this.betterResults) {
      // Create the item making sure to pass the token actor and not the base actor
      const targetActor = (isTokenActor) ? token : token.actor;
      const newItem = await this._createLootItem(item, targetActor, stackSame, customLimit);
      items.push(newItem);
    }

    return items;
  }
}
