import { i18n } from './utils.js';
import { BRTCONFIG } from './config.js';
import { BetterTables } from './better-tables.js';
import { dropEventOnTable } from './core/brt-helper.js';

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
        // console.log("tableViewClass html ", tableViewClass);

        let divElement = document.createElement("div");
        let brtData = duplicate(tableEntity.data.flags);
        brtData.disabled = !rollTable.editable;
        let selectTypeHtml = await renderTemplate("modules/better-rolltables/templates/select-table-type.hbs", brtData);
        divElement.innerHTML = selectTypeHtml;

        tableViewClass.addEventListener('drop', async function (event) {
            await dropEventOnTable(event, tableEntity);
        });

        tableViewClass.insertBefore(divElement, tableViewClass.children[2]);

        const selectTypeElement = divElement.getElementsByTagName("select")[0];
        selectTypeElement.onchange = async function () { await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity); };

        /**for every result, add an input field before the text to add a formula */
        if (selectedTableType != BRTCONFIG.TABLE_TYPE_NONE) {
            console.log("selectTypeElement ", selectTypeElement);
            console.log("tableViewClass html ", tableViewClass);
            const tableResultsHTML = tableViewClass.getElementsByClassName("table-result");

            console.log("tableResultHTML  ", tableResultsHTML);
            let index = 0;
            for (let resultHTML of tableResultsHTML) {
                const resultId = resultHTML.getAttribute("data-result-id");
                if (resultId) {

                    // console.log("resultId  ", resultId);
                    const detailsHTML = resultHTML.getElementsByClassName("result-details")[0];
                    // detailsHTML.classList.add("flexrow"); //adding a new input we need to make the row flex

                    const inputsHTML = detailsHTML.getElementsByTagName("input");
                    // console.log("inputsHTML  ", inputsHTML);
                    for (let tableText of inputsHTML) {
                        if (tableText.getAttribute("type") == "text") {
                            /** tableText is for each row the text of the table */

                            const formulaInput = document.createElement("input");
                            formulaInput.classList.add("result-brt-formula");
                            formulaInput.placeholder = "formula";
                            formulaInput.type = "text";
                            formulaInput.name = `brt.${index}.formula`;
                            if (tableText.classList.contains("result-target")) {
                                tableText.classList.add("result-target-short");
                            } else {
                                tableText.classList.add("result-target-mid");
                            }
                            detailsHTML.insertBefore(formulaInput, tableText);
                            // console.log("tableText  ", tableText);
                            break;
                        }
                    }
                    // console.log("detailsHTML  ", detailsHTML);

                    index++;
                }

            }
        }

        //create generate loot button
        if (selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {

            const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0];
            const newRollButton = BetterRT.replaceRollButton(footer);

            newRollButton.getElementsByTagName("i")[0].className = "fas fa-gem";
            newRollButton.onclick = async function () { await game.betterTables.generateChatLoot(tableEntity); };

            /** Create additional Button to Generate Loot */
            await BetterRT.showGenerateLootButton(footer, tableEntity);

            /** Hide the element with displayRoll checkbox */
            const inputElements = html[0].getElementsByTagName("input");
            const displayRollElement = inputElements.namedItem("displayRoll").parentElement;

            displayRollElement.remove();
        } else if (selectedTableType === BRTCONFIG.TABLE_TYPE_STORY) {
            const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0];
            const newRollButton = BetterRT.replaceRollButton(footer);
            newRollButton.getElementsByTagName("i")[0].className = "fas fa-book";
            newRollButton.onclick = async function () { await game.betterTables.generateChatStory(tableEntity); };
        }
    }

    static replaceRollButton(footer) {
        const rollButton = footer.getElementsByClassName("roll")[0];
        //remove the default listener by cloning the button
        const rollButtonClone = rollButton.cloneNode(true);
        rollButton.parentNode.replaceChild(rollButtonClone, rollButton);
        return rollButtonClone;
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
        generateLootBtn.onclick = async function () { await game.betterTables.generateLoot(tableEntity); };
        htmlElement.insertBefore(generateLootBtn, htmlElement.firstChild);
    }

    static async onOptionTypeChanged(value, tableEntity) {
        await tableEntity.setFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY, value);
    }
}