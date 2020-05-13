import { BRTCONFIG } from './config.js';

export class LootCreator {

    constructor(lootData) {
        this.loot = lootData;
    }

    async createActor() {

        console.log("createActor with data ", this.loot);
        let actor = await Actor.create({
            name: "New Loot",
            type: "npc",
            img: "modules/better-rolltables/artwork/chest.png",
            sort: 12000,
        });

        if ("dnd5e.LootSheet5eNPC" in CONFIG.Actor.sheetClasses.npc) {
            await actor.setFlag("core", "sheetClass", "dnd5e.LootSheet5eNPC");
        }

        for (const item of this.loot.lootItems) {
            await this.createLootItem(item, actor);
        }
        await this.addCurrencies(actor);
    }

    async addCurrencies(actor) {
        let currencyData = actor.data.data.currency;
        for (var key in this.loot.currencyData) {
            if (currencyData.hasOwnProperty(key)) {
                console.log("has key ", key, "with value ", currencyData[key]);
                const amount = (currencyData[key].value || 0) + this.loot.currencyData[key];
                currencyData[key] = { "value": amount.toString() };
                console.log("after value newCurrencyData", currencyData[key]);
            }
        }

        await actor.update({ "data.currency": currencyData });
    }

    async createLootItem(item, actor) {
        let itemToCreateData;
        if (item.compendium) { //item belongs to a compendium
            const compendium = game.packs.find(t => t.collection === item.compendium);
            let indexes = await compendium.getIndex();
            let entry = indexes.find(e => e.name.toLowerCase() === item.item.text.toLowerCase());
            const itemEntity = await compendium.getEntity(entry._id);
            itemToCreateData = itemEntity.data;
        } else if (item.item) { //item is not in a compendium
            const itemEntity = game.items.entities.find(t => t.name.toLowerCase() === item.item.text.toLowerCase());
            itemToCreateData = itemEntity.data;
        } else if (item.text) { //there is no item, just a text name
            let itemData = { name: item.text, type: "loot", img: "icons/svg/mystery-man.svg" };
            itemToCreateData = itemData;
        }
    
        if(!itemToCreateData) return;
        
        itemToCreateData = await this.preItemCreationDataManipulation(itemToCreateData);

        await actor.createOwnedItem(itemToCreateData);
    }
    
    rndSpellIdx = [];
    async getSpellCompendiumIndex() {
        const spellCompendiumIndex = await game.packs.find(t => t.collection === BRTCONFIG.SPELL_COMPENDIUM).getIndex();
        console.log(`compenidum ${BRTCONFIG.SPELL_COMPENDIUM} has ${spellCompendiumIndex.length} index entries.`)
    
        for (var i = 0; i < spellCompendiumIndex.length; i++) {
            this.rndSpellIdx[i] = i;
        }
    
        this.rndSpellIdx.sort(() => Math.random() - 0.5);
        return spellCompendiumIndex;
    }

    async preItemCreationDataManipulation(itemData) {
        const match = /\s*Spell\s*Scroll\s*(\d+|cantrip)/gi.exec(itemData.name);
        if (!match) {
            return itemData; //not a scroll
        }
    
        //if its a scorll then open compendium
        let level = match[1].toLowerCase() === "cantrip" ? 0 : match[1];
        console.log("Spell Scroll found of level", level);
    
        const compendium = game.packs.find(t => t.collection === BRTCONFIG.SPELL_COMPENDIUM);
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
            ui.notifications.warn(`no spell of level ${level} found in compendium  ${BRTCONFIG.SPELL_COMPENDIUM} `);
            return itemData;
        }

        console.log(itemEntity);
        itemData.name += ` (${itemEntity.data.name})`
        return itemData;
    }
}