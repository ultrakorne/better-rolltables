import { LootCreator } from './loot-creator.js';

/**
 * create a chat card based on the content of the object LootData
 */
export class LootChatCard {
    /**
     * @param {LootData} lootData 
     */
    constructor(lootData) {
        this.loot = lootData;
    }

    async createChatCard(table) {

        const lootCreator = new LootCreator(this.loot);
        const itemsData = await lootCreator.buildItemsData();

        console.log("itemsData", itemsData);

        let items = await Item.create(itemsData);
        console.log("LOOT", this.loot);
        console.log("table", table);
        console.log("items !!! ", items);

        let chatContent = `
        <div class="table-draw">
            <div class="table-description">${table.data.description}</div>
            <ol class="table-results">
        `;


        for (const item of items) {

            let itemText = item.name;// this.buildItemName(item);

            chatContent +=
            `<li class="table-result flexrow">
                <img class="result-image" src="${item.img}">
                <div class="result-text"><a class="entity-link" draggable="true" data-entity="Item" data-id="${item.id}"><i class="fas fa-suitcase"></i> ${itemText}</a></div>
            </li>`;
        }

        chatContent += `</ol></div>`;


        let chatData = {
            flavor: `Draws ${items.length} results from ${table.data.name}`,
            sound: "sounds/dice.wav",
            user: game.user._id,
            content: chatContent
        }

        switch (game.settings.get("core", "rollMode")) {
            case "blindroll":
                chatData.blind = true;
            case "gmroll":
                chatData.whisper = [game.users.find(u => u.isGM).id];
                break;
            case "selfroll":
                chatData.whisper = [game.userId];
                break;
        }
        ChatMessage.create(chatData);
    }

    buildItemName(item) {
        const quantityCommand = item.commands.find(i => i.command === "quantity");
        if (quantityCommand && quantityCommand.arg > 1) {
            return `${quantityCommand.arg}x ${item.text}`;
        }

        return item.text;
    }
}

/*
"<div class="table-draw" data-table-id="kyKwGSHtjm9bOn5h">
    <div class="table-description">a table that creates a loot reward actor containing multiple rolls from multiple tables at once.</div>
    
    <ol class="table-results">
        <li class="table-result flexrow" data-result-id="zIMkvFKq6lYd5ukF">
            <img class="result-image" src="systems/dnd5e/icons/items/potions/grand-yellow.jpg">
            <div class="result-text"><a class="entity-link" draggable="true" data-entity="Item" data-id="04t2ZO2pH9Gb1n00"><i class="fas fa-suitcase"></i> Alchemist's Fire</a></div>
        </li>
    </ol>
</div>"

*/