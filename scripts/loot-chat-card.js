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
        let items = await Item.create(itemsData);
        // console.log("LOOT", this.loot);
        // console.log("table", table);
        // console.log("items !!! ", items);

        let chatContent = `
        <div class="table-draw">
            <div class="table-description">${table.data.description}</div>
            <ol class="table-results">
        `;


        for (const item of items) {
            let itemAmount = item.data.data.quantity > 1 ? ` x${item.data.data.quantity}` : "";

            chatContent +=
            `<li class="table-result flexrow">
                <img class="result-image" src="${item.img}">
                <div class="result-text"><a class="entity-link" draggable="true" data-entity="Item" data-id="${item.id}"><i class="fas fa-suitcase"></i> ${item.name}</a><strong>${itemAmount}</strong></div>
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
}