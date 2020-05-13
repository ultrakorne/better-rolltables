
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
        
        // itemToCreateData = await preItemCreationDataManipulation(itemToCreateData);

        await actor.createOwnedItem(itemToCreateData);
    }
    
}