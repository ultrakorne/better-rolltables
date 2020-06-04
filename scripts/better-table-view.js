import { i18n } from './utils.js';
import { LootBuilder } from './loot-builder.js'
import { BRTCONFIG } from './config.js';
import { LootCreator } from './loot-creator.js';
import { LootChatCard } from './loot-chat-card.js';

export class BetterRT {
    static async enhanceRollTableView(rollTableConfig, html, rollTable) {
        const tableClassName = rollTable.cssClass;// "editable";
        const tableEditable = rollTable.editable;
        const tableEntity = rollTableConfig.object;

        const selectedTableType = tableEntity.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY) || BRTCONFIG.TABLE_TYPE_NONE;

        let tableViewClass = html[0].getElementsByClassName(tableClassName)[0];

        //re-renders, without this the view has a scroll bar and its not sized correctly
        if (tableViewClass) {
            html[0].style.display = 'none';
            html[0].style.display = 'block';
        }

        if (!tableViewClass) { //when the table is updated, the html is different
            if (html[0].getAttribute("class") === tableClassName) {
                tableViewClass = html[0];
            } else {
                console.log(`cannot find table class element ${tableClassName}`);
            }
        }

        // console.log("tableViewClass html ", tableViewClass);

        let divElement = document.createElement("div");
        let brtData = duplicate(tableEntity.data.flags);
        brtData.disabled = !tableEditable;
        let selectTypeHtml = await renderTemplate("modules/better-rolltables/templates/select-table-type.hbs", brtData);
        divElement.innerHTML = selectTypeHtml;

        tableViewClass.addEventListener('drop', async function (event) {
            await BetterRT.onDropEvent(event, tableEntity);
        });

        tableViewClass.insertBefore(divElement, tableViewClass.children[2]);

        const selectTypeElement = divElement.getElementsByTagName("select")[0];
        selectTypeElement.onchange = async function () { await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity); };

        //create generate loot button
        if (selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {
            /** Create additional Button to Generate Loot */
            const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0];

            const rollButton = footer.getElementsByClassName("roll")[0];
            //remove the default listener by cloning the button
            let rollButtonClone = rollButton.cloneNode(true);
            rollButton.parentNode.replaceChild(rollButtonClone, rollButton);
            rollButtonClone.onclick = async function () { await BetterRT.onRollClicked(selectTypeElement.value, tableEntity); };

            await BetterRT.showGenerateLootButton(footer, tableEntity);

            /** Hide the element with displayRoll checkbox */
            const inputElements = html[0].getElementsByTagName("input");
            const displayRollElement = inputElements.namedItem("displayRoll").parentElement;

            displayRollElement.remove();
        }
    }

    static async onDropEvent(event, table) {
        console.log("EVENT ", event);
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        } catch (err) {
            console.log("no entity dropped");
            return;
        }
        console.log("DATA ", data);
        console.log("TABLE ", table);

        const targetName = event.target.name;
        console.log("targetName ", targetName);
        // const elements = event.target.form.elements;
        // console.log("elements ", elements);
        // const namedItem = elements.namedItem(targetName);
        // console.log("namedItem ", namedItem);

        let resultIndex = -1;
        /** dropping on a table result line the target will be results.2.type, results.2.collection, results.2.text*/
        if (targetName && targetName.startsWith("results.")) {
            const splitString = targetName.split(".");
            if (splitString.length > 1) {
                resultIndex = Number(splitString[1]);
            }
        }

        let resultTableData = {};
        if (resultIndex >= 0) {
            console.log("table result dropped on ", resultIndex);
            resultTableData._id = table.results[resultIndex]._id;
        }
        let entityToLink;

        if (data.pack) {
            resultTableData.type = 2;
            resultTableData.collection = data.pack;

            const compendium = game.packs.find(t => t.collection === data.pack);
            if (compendium) {
                let indexes = await compendium.getIndex();
                let entry = indexes.find(e => e._id === data.id);

                if (entry) { //since the data from buildItemData could have been changed (e.g. the name of the scroll item that was coming from a compendium originally, entry can be undefined)
                    entityToLink = await compendium.getEntity(entry._id);
                }
            }
        } else {
            resultTableData.type = 1;
            resultTableData.collection = data.type;

            switch (data.type) {
                case "RollTable":
                    entityToLink = game.tables.get(data.id);
                    break;
                case "Actor":
                    entityToLink = game.actors.get(data.id);
                    break;
                case "Item":
                    entityToLink = game.items.get(data.id);
                    break;
                case "JournalEntry":
                    entityToLink = game.journal.get(data.id);
                    break;
                case "Playlist":
                    entityToLink = game.playlists.get(data.id);
                    break;
                case "Scene":
                    entityToLink = game.scenes.get(data.id);
                    break;
                case "Macro":
                    entityToLink = game.macros.get(data.id);
                    break;
            }
        }

        if (entityToLink) {
            resultTableData.text = entityToLink.name;
            resultTableData.img = entityToLink.img;
        } else {
            ui.notifications.error(`Item of type ${data.type} or Embedded items not supported`);
            return;
        }

        if (resultTableData._id) {
            table.updateEmbeddedEntity("TableResult", resultTableData);
        } else {
            /**create a new embedded entity if we dropped the entity on the sheet but not on a specific result */
            console.log("creating tableresult");
            const lastTableResult = table.results[table.results.length - 1];
            const rangeLenght = lastTableResult.range[1] - lastTableResult.range[0]
            resultTableData.weight = lastTableResult.weight;
            resultTableData.range = [lastTableResult.range[1], lastTableResult.range[1] + rangeLenght];
            table.createEmbeddedEntity("TableResult", resultTableData);
        }



    }


    static preUpdateRollTable(tableEntity, updateData, diff, tableId) {
        setProperty(updateData, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.LOOT_CURRENCY_KEY}`, updateData["currency-input"]);
        setProperty(updateData, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.ACTOR_NAME_KEY}`, updateData["loot-name-input"]);
        setProperty(updateData, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.ROLLS_AMOUNT_KEY}`, updateData["loot-rolls-amount-input"]);
        // console.log("preUpdateRollTable updateData ", updateData);
    }

    static async showGenerateLootButton(htmlElement, tableEntity) {
        const generateLootBtn = document.createElement("button");
        generateLootBtn.setAttribute("class", "generate");
        generateLootBtn.setAttribute("type", "button");

        generateLootBtn.innerHTML = `<i id="BRT-gen-loot" class="fas fa-coins"></i> ${i18n('BRT.GenerateLoot.Button')}`;
        generateLootBtn.onclick = async function () { await BetterRT.generateLoot(tableEntity); };
        htmlElement.insertBefore(generateLootBtn, htmlElement.firstChild);
    }

    static async generateLoot(tableEntity) {
        const lootBuilder = new LootBuilder(tableEntity);
        const generatedLoot = await lootBuilder.generateLoot();
        const lootCreator = new LootCreator(generatedLoot);
        await lootCreator.createActor();
        await lootCreator.addCurrenciesToActor();
        await lootCreator.addItemsToActor();
    }

    static async onOptionTypeChanged(value, tableEntity) {
        await tableEntity.setFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY, value);
    }

    static async onRollClicked(value, tableEntity) {

        const lootBuilder = new LootBuilder(tableEntity);
        const generatedLoot = await lootBuilder.generateLoot();
        const lootChatCard = new LootChatCard(generatedLoot);
        await lootChatCard.createChatCard(tableEntity);
    }
}