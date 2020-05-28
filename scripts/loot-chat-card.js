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

    async findOrCreateItems() {
        const lootCreator = new LootCreator(this.loot);
        let itemsWithData = [];
        for (const item of this.loot.lootItems) {
            /** we pass though the data, since we might have some data manipulation that changes an existing item, in that case even if it was initially 
             * existing or in a compendium we have to create a new one */
            const data = await lootCreator.buildItemData(item);
            if (item.compendium) {
                const compendium = game.packs.find(t => t.collection === item.compendium);
                if (compendium) {
                    let indexes = await compendium.getIndex();
                    let entry = indexes.find(e => e.name === data.name);
                    if (entry) { //since the data from buildItemData could have been changed (e.g. the name of the scroll item that was coming from a compendium originally, entry can be undefined)
                        const itemEntity = await compendium.getEntity(entry._id);
                        itemsWithData.push({item: itemEntity, quantity: data.data.quantity || 1});
                        continue;
                    }
                }
            }

            const itemEntity = game.items.getName(data.name);
            if (itemEntity) {
                itemsWithData.push({item: itemEntity, quantity: data.data.quantity || 1});
                continue;
            }

            const itemFolder = await this.getBRTFolder();
            data.folder = itemFolder.id;

            const newItem = await Item.create(data)
            itemsWithData.push({item: newItem, quantity: data.data.quantity || 1});
        }
        return itemsWithData;
    }

    async getBRTFolder() {
        if (!this.historyFolder) {
            let historyFolder = game.folders.getName("Better RollTable Items");
            if (!historyFolder) {
                historyFolder = await Folder.create({ name: "Better RollTable Items", parent: null, type: "Item" });
            }
            this.historyFolder = historyFolder;
        }
        return this.historyFolder;
    }

    async createChatCard(table) {
        let itemsWithData = await this.findOrCreateItems();

        let chatContent = `
        <div class="table-draw">
            <div class="table-description">${table.data.description}</div>
            <ol class="table-results">
        `;

        // console.log("ITEMS ", itemsWithData);

        for (const itemData of itemsWithData) {
            const item = itemData.item;
            let itemAmount = itemData.quantity > 1 ? ` x${itemData.quantity}` : "";

            let dataLinkId;
            if (item.compendium) {
                dataLinkId = `data-pack="${item.compendium.collection}" data-lookup="${item.id}"`;
            } else {
                dataLinkId = `data-id="${item.id}"`;
            }
            chatContent +=
                `<li class="table-result flexrow">
                <img class="result-image" src="${item.img}">
                <div class="result-text"><a class="entity-link" draggable="true" data-entity="Item" ${dataLinkId}><i class="fas fa-suitcase"></i> ${item.name}</a><strong>${itemAmount}</strong></div>
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