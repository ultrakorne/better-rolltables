export class LootData {
    currencyData = {};
    lootItems = [];
    actorName;

    createLootItem(item, compendiumName) {
        if (compendiumName) {
            this.lootItems.push({ "compendium": compendiumName, "item": item });
        } else {
            this.lootItems.push({ "item": item });
        }
    }

    createLootTextItem(text) {
        this.lootItems.push({ "text": text });
    }

    addCurrency(currencyData) {
        this.currencyData = currencyData;
    }

    setActorName(actorName) {
        this.actorName = actorName;
    }
}