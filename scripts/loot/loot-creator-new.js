import { BRTCONFIG } from '../core/config.js';
import * as BRTHelper from '../core/brt-helper.js';

export class LootCreatorNew {
    /**
     * Will create an actor carring items based on the content of the object lootData
     * @param {object} betterResults check BetterResults 
     */
    constructor(betterResults, table) {
        this.betterResults = betterResults;
        this.table = table;
    }

    async createActor(overrideName = undefined) {
        const actorName = overrideName ? overrideName : this.table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.ACTOR_NAME_KEY);
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
        const currencyString = this.table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_CURRENCY_KEY);
        const lootCurrency = this.generateCurrency(currencyString);
        for (var key in lootCurrency) {
            if (currencyData.hasOwnProperty(key)) {
                const amount = Number(currencyData[key].value || 0) + Number(lootCurrency[key]);
                currencyData[key] = { "value": amount.toString() };
            }
        }
        await this.actor.update({ "data.currency": currencyData });
    }

    generateCurrency(currencyString) {
        const currenciesToAdd = {};
        if (currencyString) {
            const currenciesPieces = currencyString.split(",");
            for (const currency of currenciesPieces) {
                const match = /(.*)\[(.*?)\]/g.exec(currency); //capturing 2 groups, the formula and then the currency symbol in brakets []
                if (!match || match.length < 3) {
                    ui.notifications.warn(`Currency loot field contain wrong formatting, currencies need to be define as "diceFormula[currencyType]" => "1d100[gp]" but was ${currency}`);
                    continue;
                }
                const rollFormula = match[1];
                const currencyString = match[2];
                const amount = BRTHelper.tryRoll(rollFormula);
                currenciesToAdd[currencyString] = (currenciesToAdd[currencyString] || 0) + amount;
            }
        }
        return currenciesToAdd;
    }

    async addItemsToActor(stackSame = true) {
        console.log("BETTER RESULTS ", this.betterResults);
        let items = [];
        for (const item of this.betterResults) {
            const newItem = await this.createLootItem(item, this.actor, stackSame);
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
    async createLootItem(item, actor, stackSame = true) {
        const itemData = await this.buildItemData(item);

        const itemPrice = getProperty(itemData, BRTCONFIG.PRICE_PROPERTY_PATH) || 0;
        /** if the item is already owned by the actor (same name and same PRICE) */
        const sameItemOwnedAlready = actor.getEmbeddedCollection("OwnedItem").find(i => i.name === itemData.name && itemPrice == getProperty(i, BRTCONFIG.PRICE_PROPERTY_PATH));

        if (sameItemOwnedAlready && stackSame) {
            /** add quantity to existing item*/
            const itemQuantity = getProperty(itemData, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1;
            const sameItemOwnedAlreadyQuantity = getProperty(sameItemOwnedAlready, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1;
            let updateItem = { _id: sameItemOwnedAlready._id };
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
            itemData = { name: item.text, type: BRTCONFIG.ITEM_LOOT_TYPE, img: item.img }; //"icons/svg/mystery-man.svg"
        }

        if (item.hasOwnProperty('commands') && item.commands) {
            itemData = this.applyCommandToItemData(itemData, item.commands);
        }

        if (!itemData) return;
        itemData = await this.preItemCreationDataManipulation(itemData);
        return itemData;
    }

    applyCommandToItemData(itemData, commands) {
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

    async preItemCreationDataManipulation(itemData) {
        // const match = BRTCONFIG.SCROLL_REGEX.exec(itemData.name);
        let match = /\s*Spell\s*Scroll\s*(\d+|cantrip)/gi.exec(itemData.name);

        if (!match) {
            //pf2e temporary FIXME add this in a proper config
            match = /\s*Scroll\s*of\s*(\d+)/gi.exec(itemData.name);
        }

        if (!match) {
            // console.log("not a SCROLL ", itemData.name);
            // console.log("match ",match);
            return itemData; //not a scroll
        }

        //if its a scorll then open compendium
        let level = match[1].toLowerCase() === "cantrip" ? 0 : match[1];

        const spellCompendiumName = game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.SPELL_COMPENDIUM_KEY);
        const compendium = game.packs.find(t => t.collection === spellCompendiumName);
        if (!compendium) {
            console.log(`Spell Compendium ${spellCompendiumName} not found`);
            return itemData;
        }
        let index = await this.getSpellCompendiumIndex();

        let spellFound = false;
        let itemEntity;

        while (this.rndSpellIdx.length > 0 && !spellFound) {

            let rnd = this.rndSpellIdx.pop();
            let entry = await compendium.getEntity(index[rnd]._id);
            const spellLevel = getProperty(entry.data, BRTCONFIG.SPELL_LEVEL_PATH);
            if (spellLevel == level) {
                itemEntity = entry;
                spellFound = true;
            }
        }

        if (!itemEntity) {
            ui.notifications.warn(`no spell of level ${level} found in compendium  ${spellCompendiumName} `);
            return itemData;
        }

        //make the name shorter by removing some text
        itemData.name = itemData.name.replace(/^(Spell\s)/, "");
        itemData.name = itemData.name.replace(/(Cantrip\sLevel)/, "Cantrip");
        itemData.name += ` (${itemEntity.data.name})`
        return itemData;
    }
}