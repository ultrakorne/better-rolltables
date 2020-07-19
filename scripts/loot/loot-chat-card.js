import { LootCreator } from './loot-creator.js';
import { addRollModeToChatData } from '../core/utils.js';
import { BRTCONFIG } from '../core/config.js';

/**
 * create a chat card based on the content of the object LootData
 */
export class LootChatCard {
    /**
     * @param {object} betterResults 
     * @param {object} currencyData
     */
    constructor(betterResults, currencyData) {
        this.betterResults = betterResults;
        this.currencyData = currencyData;

        this.itemsData = [];
        this.numberOfDraws = 0;
    }

    async findOrCreateItems() {
        const lootCreator = new LootCreator(this.betterResults, this.currencyData);
        for (const item of this.betterResults) {
            this.numberOfDraws++;
            /** we pass though the data, since we might have some data manipulation that changes an existing item, in that case even if it was initially 
             * existing or in a compendium we have to create a new one */
            const data = await lootCreator.buildItemData(item);
            if (item.collection) {
                const compendium = game.packs.find(t => t.collection === item.collection);
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

            setProperty(data, "permission.default", ENTITY_PERMISSIONS.OBSERVER);
            const newItem = await Item.create(data);
            this.addToItemData(newItem, data);
        }
    }

    addToItemData(itemEntity, data) {
        const existingItem = this.itemsData.find(i => i.item.id === itemEntity.id);
        const quantity = getProperty(data, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1;
        if (existingItem) {
            existingItem.quantity = +existingItem.quantity + +quantity;
        } else {
            //we will scale down the font size if an item name is too long
            const fontSize = Math.max(60, 100 - Math.max(0, itemEntity.name.length - 27) * 2);
            this.itemsData.push({
                item: itemEntity,
                quantity: quantity,
                fontSize: fontSize
            });
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
        for (var key in this.currencyData) {
            if (currencyString !== "") currencyString += ", ";
            currencyString += `${this.currencyData[key]}${key}`;
        }

        const chatCardData = {
            tableData: table.data,
            itemsData: this.itemsData,
            currency: currencyString
        }
        const cardHtml = await renderTemplate("modules/better-rolltables/templates/loot-chat-card.hbs", chatCardData);

        let flavorString;
        if (this.numberOfDraws > 1) {
            flavorString = game.i18n.format('BRT.DrawResultPlural', { amount: this.numberOfDraws, name: table.data.name });
        } else if (this.numberOfDraws > 0) {
            flavorString = game.i18n.format('BRT.DrawResultSingular', { amount: this.numberOfDraws, name: table.data.name });
        } else {
            flavorString = game.i18n.format('BRT.DrawResultZero', { name: table.data.name });;
        }

        let chatData = {
            flavor: flavorString,
            sound: "sounds/dice.wav",
            user: game.user._id,
            content: cardHtml
        }
        addRollModeToChatData(chatData);
        ChatMessage.create(chatData);
    }
}