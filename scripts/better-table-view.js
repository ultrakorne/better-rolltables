import { i18n } from './core/utils.js';
import { BRTCONFIG } from './core/config.js';
import { dropEventOnTable } from './core/brt-helper.js';

export class BetterRT {
    static async enhanceRollTableView(rollTableConfig, html, rollTable) {
        const tableClassName = rollTable.cssClass,// "editable";
            tableEntity = rollTableConfig.object,
            selectedTableType = tableEntity.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY) || BRTCONFIG.TABLE_TYPE_NONE,
            tableElement = document.querySelector(`[data-appid="${rollTableConfig.appId}"]`);

        let tableViewClass = tableElement.getElementsByClassName(tableClassName)[0];


        if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.STICK_ROLLTABLE_HEADER)) {
            const header = $(html).find("section.results ol li:first-child");
            // we need to use <ol> parent to preserve styling
            const newHeader = header.clone();
            header.remove();

            newHeader.find("a.create-result")[0].onclick = async (event) => {
                event.preventDefault();
                if (!game.keyboard.isCtrl(event)) {
                    await rollTableConfig._onCreateResult(event);
                } else {
                    for (let i=0; i < 10; i++) {
                        await rollTableConfig._onCreateResult(event);
                    }
                }
            };

            newHeader.find("a.normalize-results")[0].onclick = async (event) => {
                event.preventDefault();
                await rollTableConfig._onNormalizeResults(event);
            };

            $(html).find("section.results").prepend($('<ol class="table-results">').append(newHeader));

        }

        /** height size increase by type: */
        let addHeight = 0;
        switch (selectedTableType) {
            case BRTCONFIG.TABLE_TYPE_LOOT:
                addHeight = 80;
                break;
            case BRTCONFIG.TABLE_TYPE_BETTER:
                addHeight = 55;
                break;
            default:
                addHeight = 28;
        }
        const match = tableElement.style.height.match(/\d+/);
        const height = match[0];
        tableElement.style.height = (+height + addHeight) + "px";

        let divElement = document.createElement("div"),
            brtData = duplicate(tableEntity.data.flags);

        brtData.disabled = !rollTable.editable;
        let selectTypeHtml = await renderTemplate("modules/better-rolltables/templates/select-table-type.hbs", brtData);
        divElement.innerHTML = selectTypeHtml;

        // tableViewClass.addEventListener('drop', async function (event) {
        //     await dropEventOnTable(event, tableEntity);
        // });

        tableViewClass.insertBefore(divElement, tableViewClass.children[2]);

        const selectTypeElement = divElement.getElementsByTagName("select")[0];
        selectTypeElement.onchange = async function () { await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity); };

        /** If we use default table, we stop here */
        if (selectedTableType === BRTCONFIG.TABLE_TYPE_NONE) return;

        /**for every result, add an input field before the text to add a formula */
        if (selectedTableType === BRTCONFIG.TABLE_TYPE_BETTER || selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {
            BetterRT.ShowFormulaField(tableViewClass, tableEntity, rollTable.editable);
        }

        const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0],
            newRollButton = BetterRT.replaceRollButton(footer);

        /** change footer with new click event on rolls */
        switch (selectedTableType) {
            case BRTCONFIG.TABLE_TYPE_LOOT:
                newRollButton.getElementsByTagName("i")[0].className = "fas fa-gem";
                newRollButton.onclick = async function () { await game.betterTables.generateChatLoot(tableEntity); };

                /** Create additional Button to Generate Loot */
                await BetterRT.showGenerateLootButton(footer, tableEntity);

                /** Hide the element with displayRoll checkbox */
                const inputElements = html[0].getElementsByTagName("input");
                const displayRollElement = inputElements.namedItem("displayRoll").parentElement;

                displayRollElement.remove();
                break;
            case BRTCONFIG.TABLE_TYPE_STORY:
                newRollButton.getElementsByTagName("i")[0].className = "fas fa-book";
                newRollButton.onclick = async function () { await game.betterTables.generateChatStory(tableEntity); };
                break;
            case BRTCONFIG.TABLE_TYPE_BETTER:
                // newRollButton.getElementsByTagName("i")[0].className = "fas fa-dice";
                newRollButton.innerHTML = `<i class ="fas fa-dice-d20"></i> Roll+`;
                newRollButton.onclick = async function () { await game.betterTables.betterTableRoll(tableEntity); };
                break;
        }
    }

    /**
     * Injecting for each result row (beside a text result) a field formula to roll multiple times on multiple row table
     */
    static ShowFormulaField(tableViewClass, tableEntity, editable) {
        const tableResultsHTML = tableViewClass.getElementsByClassName("table-result");
        let index = 0;
        for (let resultHTML of tableResultsHTML) {
            const resultId = resultHTML.getAttribute("data-result-id");
            if (resultId) {
                const tableResult = tableEntity.results.get(resultId),
                    detailsHTML = resultHTML.getElementsByClassName("result-details")[0],
                    inputsHTML = detailsHTML.getElementsByTagName("input");

                for (let tableText of inputsHTML) {
                    if (tableText.getAttribute("type") == "text") {
                        /** tableText is for each row the text of the table */
                        const formulaInput = document.createElement("input");

                        formulaInput.classList.add("result-brt-formula");
                        formulaInput.placeholder = "formula";
                        formulaInput.type = "text";
                        formulaInput.disabled = !editable;
                        /** based on the name of the elents the value will be added in the preUpdateRollTable and override the table.data */
                        formulaInput.name = `results.${index}.flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`;
                        if (tableText.classList.contains("result-target")) {
                            formulaInput.value = getProperty(tableResult, `data.flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`) || "";
                            tableText.classList.add("result-target-short");
                        } else {
                            /** text type result, we disable the formula field for text */
                            formulaInput.value = "";
                            formulaInput.hidden = true;
                            // tableText.classList.add("result-target-mid");
                        }
                        detailsHTML.insertBefore(formulaInput, tableText);
                        break;
                    }
                }
                index++;
            }
        }
    }

    /**
     * 
     * @param {document} footer 
     * @returns 
     */
    static replaceRollButton(footer) {
        const rollButton = footer.getElementsByClassName("roll")[0];
        //remove the default listener by cloning the button
        const rollButtonClone = rollButton.cloneNode(true);
        rollButton.parentNode.replaceChild(rollButtonClone, rollButton);
        return rollButtonClone;
    }

    /**
     * 
     * @param {html} htmlElement 
     * @param {tableEntity} tableEntity 
     */
    static async showGenerateLootButton(htmlElement, tableEntity) {
        const generateLootBtn = document.createElement("button");
        generateLootBtn.setAttribute("class", "generate");
        generateLootBtn.setAttribute("type", "button");

        generateLootBtn.innerHTML = `<i id="BRT-gen-loot" class="fas fa-coins"></i> ${i18n('BRT.GenerateLoot.Button')}`;
        generateLootBtn.onclick = async function () { await game.betterTables.generateLoot(tableEntity); };
        htmlElement.insertBefore(generateLootBtn, htmlElement.firstChild);
    }

    static async onOptionTypeChanged(value, tableEntity) {
        // console.log("onOptionTypeChanged");
        // console.log(tableEntity);
        await tableEntity.setFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY, value);
    }
}