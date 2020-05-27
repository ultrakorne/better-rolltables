import { BRTCONFIG } from './config.js';

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


    createChatCard(table) {
        console.log("LOOT", this.loot);
        console.log("table", table);

        let chatContent = `
        <div class="table-draw">
            <div class="table-description">${table.data.description}</div>
            <ol class="table-results">
        `;


        for (const item of this.loot.lootItems) {

            let itemText = this.buildItemName(item);

            chatContent +=
                `
            <li class="table-result flexrow" data-result-id="SKRPmWGFKkq00fJC">
                <img class="result-image" src="${item.img}">
                <div class="result-text">${itemText}</div>
            </li>
            `;
        }

        chatContent += `</ol></div>`;

        let chatData = {
            flavor: `Draws ${this.loot.lootItems.length} results from ${table.data.name}`,
            sound: "sounds/dice.wav",
            user: game.user._id,
            content: chatContent
        }
        ChatMessage.create(chatData);
    }

    buildItemName(item) {
        console.log("commands ", item.commands);

        const quantityCommand = item.commands.find(i => i.command === "quantity");

        console.log("quantityCommand ", quantityCommand);

        if (quantityCommand && quantityCommand.arg > 1) {
            return `${quantityCommand.arg}x ${item.text}`;
        }

        return item.text;
    }
}