import { LootCreator } from './loot-creator.js';
import { addRollModeToChatData, getItemFromCompendium } from '../core/utils.js';
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
            const itemData = await lootCreator.buildItemData(item);
            if (item.collection) {                
                const itemEntity = await getItemFromCompendium(item);

                if (itemEntity && (itemEntity.name == itemData.name)) {
                    this.addToItemData(itemEntity, itemData);
                    continue;
                }                         
            }

            const itemEntity = game.items.getName(itemData.name);
            if (itemEntity) {
                this.addToItemData(itemEntity, itemData);
                continue;
            }

            const itemFolder = await this.getBRTFolder();
            itemData.folder = itemFolder.id;

            setProperty(itemData, "permission.default", CONST.ENTITY_PERMISSIONS.OBSERVER);
            const newItem = await Item.create(itemData);
            this.addToItemData(newItem, itemData);
        }
    }

    addToItemData(itemEntity, data) {
        const existingItem = this.itemsData.find(i => i.item.id === itemEntity.id),
            quantity = getProperty(data, BRTCONFIG.QUANTITY_PROPERTY_PATH) || 1;

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

    async prepareCharCart(table) {
        await this.findOrCreateItems();

        let currencyString = "";
        for (var key in this.currencyData) {
            if (currencyString !== "") currencyString += ", ";
            currencyString += `${this.currencyData[key]}${key}`;
        }

        const chatCardData = {
            tableData: table.data,
            itemsData: this.itemsData,
            currency: currencyString,
            compendium: table.pack,
            id: table.id
        };

        const cardHtml = await renderTemplate("modules/better-rolltables/templates/loot-chat-card.hbs", chatCardData);

        let flavorString;
        if (this.numberOfDraws > 1) {
            flavorString = game.i18n.format('BRT.DrawResultPlural', { amount: this.numberOfDraws, name: table.data.name });
        } else if (this.numberOfDraws > 0) {
            flavorString = game.i18n.format('BRT.DrawResultSingular', { amount: this.numberOfDraws, name: table.data.name });
        } else {
            flavorString = game.i18n.format('BRT.DrawResultZero', { name: table.data.name });
        }

        return {
            flavor: flavorString,
            sound: "sounds/dice.wav",
            user: game.user.data._id,
            content: cardHtml
        };
    }

    async createChatCard(table) {
        const chatData = await this.prepareCharCart(table);
        addRollModeToChatData(chatData);
        ChatMessage.create(chatData);
    }
}