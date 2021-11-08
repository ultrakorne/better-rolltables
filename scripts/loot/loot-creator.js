import { getItemFromCompendium } from '../core/utils.js'
import { BRTCONFIG } from '../core/config.js'
import { LootManipulator } from './loot-manipulation.js'

export class LootCreator {
  /**
   * Will create an actor carring items based on the content of the object lootData
   * @param {object} betterResults check BetterResults
   * @param currencyData
   */
  constructor (betterResults, currencyData) {
    this.betterResults = betterResults;
    this.currencyData = currencyData;
    this.lootManipulator = new LootManipulator();
  }

  async createActor (table, overrideName = undefined) {
    const actorName = overrideName || table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.ACTOR_NAME_KEY)
    this.actor = game.actors.getName(actorName)
    if (!this.actor) {
      this.actor = await Actor.create({
        name: actorName || 'New Loot',
        type: 'npc',
        img: 'modules/better-rolltables/artwork/chest.png',
        sort: 12000,
        token: { actorLink: true }
      });
    }

    const lootSheet = game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_SHEET_TO_USE_KEY)
    if (lootSheet in CONFIG.Actor.sheetClasses.npc) {
      await this.actor.setFlag('core', 'sheetClass', lootSheet);
    }
  }

  async addCurrenciesToActor () {
    const currencyData = duplicate(this.actor.data.data.currency);
    const lootCurrency = this.currencyData;

    for (const key in lootCurrency) {
      if (Object.getOwnPropertyDescriptor(currencyData, key)) {
        const amount = Number(currencyData[key].value || 0) + Number(lootCurrency[key]);
        currencyData[key] = { value: amount.toString() };
      }
    }
    await this.actor.update({ 'data.currency': currencyData });
  }

  /**
   * 
   * @param {boolean} stackSame Should same items be stacked together? Default = true
   * @returns 
   */
  async addItemsToActor (stackSame = true) {
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
     * @returns {Item} the create Item (foundry item)
     */
  async _createLootItem (item, actor, stackSame = true) {
    const itemData = await this.buildItemData(item),
          itemPrice = getProperty(itemData, BRTCONFIG.PRICE_PROPERTY_PATH) || 0,
          embeddedItems = [...actor.getEmbeddedCollection('Item').values()],
          sameItemOwnedAlready = embeddedItems.find(i => i.name === itemData.name && itemPrice === getProperty(i.data, BRTCONFIG.PRICE_PROPERTY_PATH));
    
    /** if the item is already owned by the actor (same name and same PRICE) */
    if (sameItemOwnedAlready && stackSame) {
      /** add quantity to existing item */
      const itemQuantity = getProperty(itemData, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1,
            sameItemOwnedAlreadyQuantity = getProperty(sameItemOwnedAlready.data, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1,
            updateItem = { _id: sameItemOwnedAlready.id };
      setProperty(updateItem, BRTCONFIG.QUANTITY_PROPERTY_PATH, +sameItemOwnedAlreadyQuantity + +itemQuantity);
      await actor.updateEmbeddedDocuments('Item', [updateItem]);

      return actor.items.get(sameItemOwnedAlready.id);
    } else {
      /** we create a new item if we don't own already */
      return await actor.createEmbeddedDocuments('Item', [itemData]);
    }
  }

  /**
     *
     * @param {object} item
     * @returns
     */
  async buildItemData (item) {
    let itemData;

    /** Try first to load item from compendium */
    if (item.collection) {
      itemData = await getItemFromCompendium(item);
    }

    /** Try first to load item from item list */
    if (!itemData) {
      /** if an item with this name exist we load that item data, otherwise we create a new one */
      const itemEntity = game.items.getName(item.text);
      if (itemEntity) {
        itemData = duplicate(itemEntity.data);
      }
    }

    /** Create item from text since the item does not exist */
    if (!itemData) {
      itemData = { name: item.text, type: BRTCONFIG.ITEM_LOOT_TYPE, img: item.img }; // "icons/svg/mystery-man.svg"
    }

    if (Object.getOwnPropertyDescriptor(item, 'commands') && item.commands) {
      itemData = this._applyCommandToItemData(itemData, item.commands);
    }

    if (!itemData) return
    itemData = await this.lootManipulator.preItemCreationDataManipulation(itemData);
    return itemData;
  }

  /**
     *
     * @param {object} itemData
     * @param {object[]} commands
     * @returns {object} itemData
     */
  _applyCommandToItemData (itemData, commands) {
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
     * @param {Token} token
     * @param {Boolean} is the token passed as the token actor instead?
     */
  async addCurrenciesToToken (token, isTokenActor = false) {
    // needed for base key set in the event that a token has no currency properties
    const currencyDataInitial = {cp: 0, ep: 0, gp: 0, pp: 0,sp: 0};
    let currencyData = currencyDataInitial;

    if(isTokenActor) {
      currencyData = duplicate(token.data.data.currency);
    } else if (token.data.actorData?.data?.currency) {
      currencyData = duplicate(token.data.actorData.data.currency);
    }

    const lootCurrency = this.currencyData;

    for (const key in currencyDataInitial) {
      const amount = Number(currencyData[key] || 0) + Number(lootCurrency[key] || 0);
      currencyData[key] = amount;
    }
    await token.update({ 'actorData.data.currency': currencyData });
  }

  /**
     *
     * @param {token} token
     * @param {boolean} stackSame
     * @param {boolean} isTokenActor - is the token already the token actor?
     *
     * @returns {object[]} items
     */
  async addItemsToToken (token, stackSame = true, isTokenActor = false) {
    const items = [];
    for (const item of this.betterResults) {
      // Create the item making sure to pass the token actor and not the base actor
      const targetActor = (isTokenActor)? token : token.actor;
      const newItem = await this._createLootItem(item, targetActor, stackSame);
      items.push(newItem);
    }

    return items;
  }
}
