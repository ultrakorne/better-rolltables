import { BRTCONFIG } from './config.js';

/**
 * create actor and items based on the content of the object LootData
 */
export class LootCreator {
    /**
     * Will create an actor carring items based on the content of the object lootData
     * @param {LootData} lootData 
     */
    constructor(lootData) {
        this.loot = lootData;
    }

    async createActor() {
        let actor = game.actors.getName(this.loot.actorName);
        if (!actor) {
            actor = await Actor.create({
                name: this.loot.actorName || "New Loot",
                type: "npc",
                img: "modules/better-rolltables/artwork/chest.png",
                sort: 12000,
            });
        }

        const lootSheet = game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_SHEET_TO_USE_KEY);
        if (lootSheet in CONFIG.Actor.sheetClasses.npc) {
            await actor.setFlag("core", "sheetClass", lootSheet);
        }

        await this.addCurrencies(actor);

        for (const item of this.loot.lootItems) {
            await this.createLootItem(item, actor);
        }
    }

    /** 
     * @returns {[itemData]} an array of itemData ready to create an actor item with
     */
    async buildItemsData() {
        let allItemsData = [];
        for (const item of this.loot.lootItems) {
            allItemsData.push(await this.buildItemData(item));
        }
        return allItemsData;
    }

    async addCurrencies(actor) {
        let currencyData = duplicate(actor.data.data.currency);
        for (var key in this.loot.currencyData) {
            if (currencyData.hasOwnProperty(key)) {
                const amount = Number(currencyData[key].value || 0) + Number(this.loot.currencyData[key]);
                currencyData[key] = { "value": amount.toString() };
            }
        }

        await actor.update({ "data.currency": currencyData });
    }

    async buildItemData(item) {
        let itemData;

        /** Try first to load item from compendium */
        if (item.compendium) {
            const compendium = game.packs.find(t => t.collection === item.compendium);
            if (compendium) {
                let indexes = await compendium.getIndex();
                let entry = indexes.find(e => e.name.toLowerCase() === item.text.toLowerCase());
                const itemEntity = await compendium.getEntity(entry._id);
                itemData = itemEntity.data;
            }
        }

        /** Try first to load item from item list */
        if (!itemData) {
            /**if an item with this name exist we load that item data, otherwise we create a new one */
            const itemEntity = game.items.getName(item.text);
            if (itemEntity) {
                itemData = itemEntity.data;
            }
        }

        /** Create item from text since the item does not exist */
        if (!itemData) {
            itemData = { name: item.text, type: "loot", img: item.img }; //"icons/svg/mystery-man.svg"
        }

        if (item.hasOwnProperty('commands') && item.commands) {
            itemData = this.applyCommandToItemData(itemData, item.commands);
        }

        if (!itemData) return;
        itemData = await this.preItemCreationDataManipulation(itemData);
        return itemData;
    }

    async createLootItem(item, actor) {
        const itemData = await this.buildItemData(item);

        const itemPrice = getProperty(itemData, "data.price") || 0;
        /** if the item is already owned by the actor (same name and same PRICE) */
        const sameItemOwnedAlready = actor.getEmbeddedCollection("OwnedItem").find(i => i.name === itemData.name && itemPrice == i.data.price);

        if (sameItemOwnedAlready) {
            /** add quantity to existing item*/
            const itemQuantity = getProperty(itemData, "data.quantity") || 1;
            const updateItem = { _id: sameItemOwnedAlready._id, data: { quantity: (sameItemOwnedAlready.data.quantity + itemQuantity) } };
            await actor.updateEmbeddedEntity("OwnedItem", updateItem);
        } else {
            /**we create a new item if we don't own already */
            await actor.createOwnedItem(itemData);
        }
    }

    rndSpellIdx = [];
    async getSpellCompendiumIndex() {
        const spellCompendiumName = game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.SPELL_COMPENDIUM_KEY);
        const spellCompendiumIndex = await game.packs.find(t => t.collection === spellCompendiumName).getIndex();
        // console.log(`compenidum ${BRTCONFIG.SPELL_COMPENDIUM} has ${spellCompendiumIndex.length} index entries.`)

        for (var i = 0; i < spellCompendiumIndex.length; i++) {
            this.rndSpellIdx[i] = i;
        }

        this.rndSpellIdx.sort(() => Math.random() - 0.5);
        return spellCompendiumIndex;
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
        const match = /\s*Spell\s*Scroll\s*(\d+|cantrip)/gi.exec(itemData.name);
        if (!match) {
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
            const spellLevel = entry.data.data.level
            if (spellLevel == level) {
                itemEntity = entry;
                spellFound = true;
            }
        }

        if (!itemEntity) {
            ui.notifications.warn(`no spell of level ${level} found in compendium  ${spellCompendiumName} `);
            return itemData;
        }

        itemData.name += ` (${itemEntity.data.name})`
        return itemData;
    }
}