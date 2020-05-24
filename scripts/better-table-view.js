import { i18n } from './utils.js';
import { LootBuilder } from './loot-builder.js'
import { BRTCONFIG } from './config.js';
import { LootCreator } from './loot-creator.js';

export class BetterRT {
    static async enhanceRollTableView(rollTableConfig, html, rollTable) {
        const tableClassName = rollTable.cssClass;// "editable";
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

        // console.log("html[0] ", html[0]);

        let divElement = document.createElement("div");
        let selectTypeHtml = await renderTemplate("modules/better-rolltables/templates/select-table-type.html", tableEntity);
        divElement.innerHTML = selectTypeHtml;
        tableViewClass.insertBefore(divElement, tableViewClass.children[2]);

        const selectTypeElement = divElement.getElementsByTagName("select")[0];
        selectTypeElement.onchange = async function () { await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity); };

        //create generate loot button
        if (selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {
            /** Create additional Button to Generate Loot */
            const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0];
            await BetterRT.showGenerateLootButton(footer, tableEntity);

            /** Hide the element with displayRoll checkbox */
            const inputElements = html[0].getElementsByTagName("input");
            const displayRollElement = inputElements.namedItem("displayRoll").parentElement;
            // const replacementElement = inputElements.namedItem("replacement").parentElement;
            // console.log("displayRollElement ", displayRollElement);
            displayRollElement.remove();
            // replacementElement.remove();
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
    }

    static async onOptionTypeChanged(value, tableEntity) {
        await tableEntity.setFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY, value);
    }
}