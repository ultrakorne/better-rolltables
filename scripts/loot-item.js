export class LootData {
    currencyData = {};
    lootItems = [];
    actorName;
    
    /**
     * 
     * @param {string} itemName the name of the item 
     * @param {Array} commandList and array of { "command" : commandName, "arg" : commandArgument });
     * @param {string} img the image to use for the item
     * @param {string} compendiumName if the item is to be found in a compendium
     * an example of command is price and the arg is a formula to set the price of the item
     */
    createLootTextItem(itemName, commandList, img, compendiumName) {
        this.lootItems.push({ "text": itemName, "commands": commandList, "img" : img, "compendium": compendiumName });
    }

    addCurrency(currencyData) {
        for(var key in currencyData){
            this.currencyData[key] = (this.currencyData[key] || 0) + currencyData[key];
        }
    }

    setActorName(actorName) {
        this.actorName = actorName;
    }
}