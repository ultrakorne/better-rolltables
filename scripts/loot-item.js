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

    /**
     * 
     * @param {string} the name of the item 
     * @param {Array} and array of { "command" : commandName, "arg" : commandArgument });
     * an example of command is price and the arg is a formula to set the price of the item
     */
    createLootTextItem(itemName, commandList, img) {
        this.lootItems.push({ "text": itemName, "commands": commandList, "img" : img });
    }

    addCurrency(currencyData) {
        this.currencyData = currencyData;
    }

    setActorName(actorName) {
        this.actorName = actorName;
    }
}