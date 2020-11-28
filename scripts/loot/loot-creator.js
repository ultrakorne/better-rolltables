import {BRTCONFIG} from '../core/config.js';
import {LootManipulator} from './loot-manipulation.js';

export class LootCreator {
    /**
     * Will create an actor carring items based on the content of the object lootData
     * @param {object} betterResults check BetterResults
     */
    constructor(betterResults, currencyData) {
        this.betterResults = betterResults;
        this.currencyData = currencyData;
        this.lootManipulator = new LootManipulator();
    }

    async createActor(table, overrideName = undefined) {
        const actorName = overrideName ? overrideName : table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.ACTOR_NAME_KEY);
        this.actor = game.actors.getName(actorName);
        if (!this.actor) {
            this.actor = await Actor.create({
                name: actorName || "New Loot",
                type: "npc",
                img: "modules/better-rolltables/artwork/chest.png",
                sort: 12000,
                token: {actorLink: true}
            });
        }

        const lootSheet = game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_SHEET_TO_USE_KEY);
        if (lootSheet in CONFIG.Actor.sheetClasses.npc) {
            await this.actor.setFlag("core", "sheetClass", lootSheet);
        }
    }

    async addCurrenciesToActor() {
        let currencyData = duplicate(this.actor.data.data.currency);
        const lootCurrency = this.currencyData;
        for (var key in lootCurrency) {
            if (currencyData.hasOwnProperty(key)) {
                const amount = Number(currencyData[key].value || 0) + Number(lootCurrency[key]);
                currencyData[key] = {"value": amount.toString()};
            }
        }
        await this.actor.update({"data.currency": currencyData});
    }

    async addItemsToActor(stackSame = true) {
        let items = [];
        for (const item of this.betterResults) {
            const newItem = await this._createLootItem(item, this.actor, stackSame);
            items.push(newItem);
        }
        return items;
    }

    /**
     *
     * @param {object} item rapresentation
     * @param {Actor} actor to which to add items to
     * @param {boolean} stackSame if true add quantity to an existing item of same name in the current actor
     * @returns {Item} the create Item (foundry item)
     */
    async _createLootItem(item, actor, stackSame = true) {
        const itemData = await this.buildItemData(item);

        const itemPrice = getProperty(itemData, BRTCONFIG.PRICE_PROPERTY_PATH) || 0;
        /** if the item is already owned by the actor (same name and same PRICE) */
        const sameItemOwnedAlready = actor.getEmbeddedCollection("OwnedItem").find(i => i.name === itemData.name && itemPrice == getProperty(i, BRTCONFIG.PRICE_PROPERTY_PATH));

        if (sameItemOwnedAlready && stackSame) {
            /** add quantity to existing item*/
            const itemQuantity = getProperty(itemData, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1;
            const sameItemOwnedAlreadyQuantity = getProperty(sameItemOwnedAlready, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1;
            let updateItem = {_id: sameItemOwnedAlready._id};
            setProperty(updateItem, BRTCONFIG.QUANTITY_PROPERTY_PATH, +sameItemOwnedAlreadyQuantity + +itemQuantity);

            await actor.updateEmbeddedEntity("OwnedItem", updateItem);
            return actor.getOwnedItem(sameItemOwnedAlready._id);
        } else {
            /**we create a new item if we don't own already */
            return await actor.createOwnedItem(itemData);
        }
    }

    async buildItemData(item) {
        let itemData;

        /** Try first to load item from compendium */
        if (item.collection) {
            const compendium = game.packs.find(t => t.collection === item.collection);
            if (compendium) {
                let indexes = await compendium.getIndex();
                let entry = indexes.find(e => e.name.toLowerCase() === item.text.toLowerCase());
                const itemEntity = await compendium.getEntity(entry._id);
                itemData = duplicate(itemEntity.data);
            }
        }

        /** Try first to load item from item list */
        if (!itemData) {
            /**if an item with this name exist we load that item data, otherwise we create a new one */
            const itemEntity = game.items.getName(item.text);
            if (itemEntity) {
                itemData = duplicate(itemEntity.data);
            }
        }

        /** Create item from text since the item does not exist */
        if (!itemData) {
            itemData = {name: item.text, type: BRTCONFIG.ITEM_LOOT_TYPE, img: item.img}; //"icons/svg/mystery-man.svg"
        }

        if (item.hasOwnProperty('commands') && item.commands) {
            itemData = this._applyCommandToItemData(itemData, item.commands);
        }

        if (!itemData) return;
        itemData = await this.lootManipulator.preItemCreationDataManipulation(itemData);
        return itemData;
    }

    _applyCommandToItemData(itemData, commands) {
        for (let cmd of commands) {
            //TODO check the type of command, that is a command to be rolled and a valid command
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

    async addCurrenciesToToken(token) {
        //needed for base key set in the event that a token has no currency properties
        let currencyDataInitial = {
            cp: {value: "0"},
            ep: {value: "0"},
            gp: {value: "0"},
            pp: {value: "0"},
            sp: {value: "0"}
        }

        let currencyData = undefined;

        if (token.data.actorData.data == undefined) {
            token.data.actorData['data'] = {}
        }
        if (token.data.actorData.data.currency == undefined) {
            currencyData = currencyDataInitial;
        } else {
            currencyData = duplicate(token.data.actorData.data.currency);
        }
        const lootCurrency = this.currencyData;

        for (var key in currencyDataInitial) {
            const amount = Number(currencyData[key].value || 0) + Number(lootCurrency[key] || 0);
            currencyData[key] = {"value": amount.toString()};
        }
        await token.update({"actorData.data.currency": currencyData});

    }

    async addItemsToToken(token, stackSame = true) {
        let items = [];
        for (const item of this.betterResults) {
            //Create the item making sure to pass the token actor and not the base actor
            const newItem = await this._createLootItem(item, token.actor, stackSame);
            items.push(newItem);
        }

        return items;
    }
}