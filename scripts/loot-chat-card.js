import { LootCreator } from './loot-creator.js';
import { i18n } from './utils.js';

/**
 * create a chat card based on the content of the object LootData
 */
export class LootChatCard {
    /**
     * @param {LootData} lootData 
     */
    constructor(lootData) {
        this.loot = lootData;
        this.itemsData = [];
    }

    async findOrCreateItems() {
        const lootCreator = new LootCreator(this.loot);
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
                        this.addToItemData(itemEntity, data);
                        continue;
                    }
                }
            }

            const itemEntity = game.items.getName(data.name);
            if (itemEntity) {
                this.addToItemData(itemEntity, data);
                continue;
            }

            const itemFolder = await this.getBRTFolder();
            data.folder = itemFolder.id;

            setProperty(data, "permission.default", ENTITY_PERMISSIONS.OBSERVER); //{"permission.default": ENTITY_PERMISSIONS.OBSERVER}
            const newItem = await Item.create(data);
            this.addToItemData(newItem, data);
        }
    }

    addToItemData(itemEntity, data) {
        const existingItem = this.itemsData.find(i => i.item.id === itemEntity.id);
        if (existingItem) {
            existingItem.quantity += data.data.quantity || 1;
        } else {
            this.itemsData.push({ item: itemEntity, quantity: data.data.quantity || 1 });
        }
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
        await this.findOrCreateItems();

        let currencyString = "";
        for (var key in this.loot.currencyData) {
            if (currencyString !== "") currencyString += ", ";
            currencyString += `${this.loot.currencyData[key]}${key}`;
        }

        let chatContent = `<div class="table-draw">`;

        if (table.data.description.trim().length != 0) {
            chatContent += `<div class="table-description">${table.data.description}</div>`;
        }
        if (currencyString.length != 0) {
            chatContent += `<div class="table-description" style="font-size: 15px; text-align: center;"><strong>${i18n('BRT.Currency')} </strong>${currencyString}</div>`;
        }
        chatContent += `<ol class="table-results">`;

        for (const itemData of this.itemsData) {
            const item = itemData.item;
            const itemAmount = itemData.quantity > 1 ? ` x${itemData.quantity}` : "";

            let fontSizeStyle = "";
            if (item.name.length > 30) {
                fontSizeStyle = `style="font-size: ${Math.max(60, 100-(item.name.length-30)*2)}%;"`
            }
            let dataLinkId;
            if (item.compendium) {
                dataLinkId = `data-pack="${item.compendium.collection}" data-lookup="${item.id}"`;
            } else {
                dataLinkId = `data-id="${item.id}"`;
            }
            chatContent +=
                `<li class="table-result flexrow">
                <img class="result-image" src="${item.img}">
                <div class="result-text" ${fontSizeStyle}><a class="entity-link" draggable="true" data-entity="Item" ${dataLinkId}><i class="fas fa-suitcase"></i> ${item.name}</a><strong>${itemAmount}</strong></div>
            </li>`;
        }

        chatContent += `</ol></div>`;

        let chatData = {
            flavor: `Draws ${this.itemsData.length} results from ${table.data.name}`,
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