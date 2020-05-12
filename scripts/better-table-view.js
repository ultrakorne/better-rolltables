import { i18n } from './utils.js';

export class BetterRT {
    static async enhanceRollTableView(rollTableConfig, html, rollTable) {
        console.log("rollTableConfig ", rollTableConfig);
        console.log("html ", html[0]);
        console.log("rollTable ", rollTable);

        const tableClassName = rollTable.cssClass;// "editable";
        const tableEntity = rollTableConfig.object;

        const selectedTableType = tableEntity.getFlag("better-rolltables", "table-type") || "none";

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

        let divElement = document.createElement("div");
        let selectTypeHtml = await renderTemplate("modules/better-rolltables/templates/select-table-type.html", tableEntity);
        divElement.innerHTML = selectTypeHtml;
        tableViewClass.insertBefore(divElement, tableViewClass.children[2]);

        const selectTypeElement = divElement.getElementsByTagName("select")[0];
        selectTypeElement.onchange = async function () { await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity); };

        BetterRT.configureCurrencyInputField(divElement, tableEntity);

        //create generate loot button
        if (selectedTableType === "loot") {
            const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0];
            console.log("footer ", footer);
            BetterRT.showGenerateLootButton(footer);
        }
    }

    static preUpdateRollTable(tableEntity, updateData, diff, tableId) {
        setProperty(updateData, "flags.better-rolltables.table-currency-string", updateData["currency-input"]); 
        console.log("preUpdateRollTable updateData ", updateData);
    }

    //if the currency-input exist (when selectedTableType === "loot" but configured in the handlebars rendered html) we configure the field
    static async configureCurrencyInputField(htmlElement, tableEntity) {
        const allInputs = htmlElement.getElementsByTagName("input");
        const currencyInput = allInputs.namedItem("currency-input");

        if (!currencyInput) return;

        const tableCurrencyString = await tableEntity.getFlag("better-rolltables", "table-currency-string");
        if (tableCurrencyString) {
            currencyInput.value = tableCurrencyString;
        }

        console.log("currencyInput value ", currencyInput.value);
        currencyInput.oninput = async function () { await BetterRT.onCurrencyInput(currencyInput.value, tableEntity); };
    }

    static async showGenerateLootButton(htmlElement) {
        const generateLootBtn = document.createElement("button");
        generateLootBtn.setAttribute("class", "generate");
        generateLootBtn.setAttribute("type", "button");

        generateLootBtn.innerHTML = `<i id="BRT-gen-loot" class="fas fa-coins"></i> ${i18n('BRT.GenerateLoot.Button')}`;
        generateLootBtn.onclick = () => { BetterRT.generateLoot(tableEntity); };
        htmlElement.insertBefore(generateLootBtn, htmlElement.firstChild);
    }

    static generateLoot(tableEntity) {
        console.log("Generate Loot button clicked ", tableEntity);
    }

    // game.tables.getName("Your Roll Table Name Here")
    static async onOptionTypeChanged(value, tableEntity) {
        // const table = game.tables.entities.find(t => t.id === tableId);
        console.log("entity table ", tableEntity);
        await tableEntity.setFlag("better-rolltables", "table-type", value);
    }

    static async onCurrencyInput(value, tableEntity) {
        console.log("onCurrencyInput table ", tableEntity);
        // await tableEntity.setFlag("better-rolltables", "table-currency-string", value);
    }
}