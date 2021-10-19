import { i18n } from './core/utils.js'
import { BRTCONFIG } from './core/config.js'

export class BetterRT {
  static _calcHeight (element) {
    const style = getComputedStyle(element.parentElement)
    const height = parseInt(style.height.slice(0, -2))
    const marginTop = parseInt(style.marginTop.slice(0, -2))
    const marginBottom = parseInt(style.marginBottom.slice(0, -2))
    const paddingTop = parseInt(style.paddingTop.slice(0, -2))
    const paddingBottom = parseInt(style.paddingBottom.slice(0, -2))
    const borderTop = parseInt(style.borderTop.slice(0, -2))
    const borderBottom = parseInt(style.borderBottom.slice(0, -2))
    return height + marginTop + marginBottom + paddingTop + paddingBottom + borderTop + borderBottom
  }

  static async enhanceRollTableView (rollTableConfig, html, rollTable) {
    const tableClassName = rollTable.cssClass; const // "editable";
      tableEntity = rollTableConfig.object
    const selectedTableType = tableEntity.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY) || BRTCONFIG.TABLE_TYPE_NONE
    const tableElement = document.querySelector(`[data-appid="${rollTableConfig.appId}"]`)

    if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.STICK_ROLLTABLE_HEADER)) {
      const section = html[0].querySelector('section.results')
      const ol = section.querySelector('ol')
      const li = section.querySelector('li:first-child')

      section.style = 'position: relative; padding-top: 42px;'
      ol.style = 'position: static;'
      li.style = 'position: absolute; top: 0; left: 0; width: 100%;'
    }

    const tableViewClass = tableElement.getElementsByClassName(tableClassName)[0]

    const divElement = document.createElement('div')
    const brtData = duplicate(tableEntity.data.flags)

    brtData.disabled = !rollTable.editable
    divElement.innerHTML = await renderTemplate('modules/better-rolltables/templates/select-table-type.hbs', brtData)

    tableViewClass.insertBefore(divElement, tableViewClass.children[2])

    const selectTypeElement = divElement.getElementsByTagName('select')[0]
    selectTypeElement.onchange = async function () { await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity) }

    /** height size increase by type: */
    let addHeight
    if (selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {
      addHeight = BetterRT._calcHeight(html[0].querySelector("select[name='flags.better-rolltables.table-type']")) +
              BetterRT._calcHeight(html[0].querySelector("input[name='flags.better-rolltables.loot-amount-key']")) +
              BetterRT._calcHeight(html[0].querySelector("input[name='flags.better-rolltables.loot-actor-name']")) +
              BetterRT._calcHeight(html[0].querySelector("input[name='flags.better-rolltables.table-currency-string']")) -
              BetterRT._calcHeight(html[0].querySelector("input[name='displayRoll']"))
    } else if (selectedTableType === BRTCONFIG.TABLE_TYPE_STORY || selectedTableType === BRTCONFIG.TABLE_TYPE_BETTER) {
      addHeight = BetterRT._calcHeight(html[0].querySelector("select[name='flags.better-rolltables.table-type']")) +
              BetterRT._calcHeight(html[0].querySelector("input[name='flags.better-rolltables.loot-amount-key']"))
    } else {
      addHeight = BetterRT._calcHeight(html[0].querySelector("select[name='flags.better-rolltables.table-type']"))
    }

    if (game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.STICK_ROLLTABLE_HEADER)) {
      const section = html[0].querySelector('section.results')
      const tableMaxHeight = parseInt(getComputedStyle(html[0].querySelector('ol.table-results')).maxHeight.slice(0, -2))
      if (section.scrollHeight > tableMaxHeight) { addHeight += section.scrollHeight - tableMaxHeight }
    }

    const height = parseInt(tableElement.style.height.slice(0, -2))
    tableElement.style.height = (+height + addHeight) + 'px'

    /** If we use default table, we stop here */
    if (selectedTableType === BRTCONFIG.TABLE_TYPE_NONE) return

    // tableViewClass.addEventListener('drop', async function (event) {
    //     await dropEventOnTable(event, tableEntity);
    // });

    /** for every result, add an input field before the text to add a formula */
    if (selectedTableType === BRTCONFIG.TABLE_TYPE_BETTER || selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {
      BetterRT.ShowFormulaField(tableViewClass, tableEntity, rollTable.editable)
    }

    const footer = html[0].getElementsByClassName('sheet-footer flexrow')[0]
    const newRollButton = BetterRT.replaceRollButton(footer)

    /** change footer with new click event on rolls */
    if (selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {
      newRollButton.getElementsByTagName('i')[0].className = 'fas fa-gem'
      newRollButton.onclick = async function () {
        await game.betterTables.generateChatLoot(tableEntity)
      }

      /** Create additional Button to Generate Loot */
      await BetterRT.showGenerateLootButton(footer, tableEntity)

      /** Hide the element with displayRoll checkbox */
      const inputElements = html[0].getElementsByTagName('input')
      const displayRollElement = inputElements.namedItem('displayRoll').parentElement
      displayRollElement.remove()
    } else if (selectedTableType === BRTCONFIG.TABLE_TYPE_STORY) {
      newRollButton.getElementsByTagName('i')[0].className = 'fas fa-book'
      newRollButton.onclick = async function () {
        await game.betterTables.generateChatStory(tableEntity)
      }
    } else if (selectedTableType === BRTCONFIG.TABLE_TYPE_BETTER) { // newRollButton.getElementsByTagName("i")[0].className = "fas fa-dice";
      newRollButton.innerHTML = '<i class ="fas fa-dice-d20"></i> Roll+'
      newRollButton.onclick = async function () {
        await game.betterTables.betterTableRoll(tableEntity)
      }
    }
  }

  /**
     * Injecting for each result row (beside a text result) a field formula to roll multiple times on multiple row table
     */
  static ShowFormulaField (tableViewClass, tableEntity, editable) {
    const tableResultsHTML = tableViewClass.getElementsByClassName('table-result')
    let index = 0
    for (const resultHTML of tableResultsHTML) {
      const resultId = resultHTML.getAttribute('data-result-id')
      if (resultId) {
        const tableResult = tableEntity.results.get(resultId)
        const detailsHTML = resultHTML.getElementsByClassName('result-details')[0]
        const inputsHTML = detailsHTML.getElementsByTagName('input')

        for (const tableText of inputsHTML) {
          if (tableText.getAttribute('type') === 'text') {
            /** tableText is for each row the text of the table */
            const formulaInput = document.createElement('input')

            formulaInput.classList.add('result-brt-formula')
            formulaInput.placeholder = 'formula'
            formulaInput.type = 'text'
            formulaInput.disabled = !editable
            /** based on the name of the elents the value will be added in the preUpdateRollTable and override the table.data */
            formulaInput.name = `results.${index}.flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`
            if (tableText.classList.contains('result-target')) {
              formulaInput.value = getProperty(tableResult, `data.flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`) || ''
              tableText.classList.add('result-target-short')
            } else {
              /** text type result, we disable the formula field for text */
              formulaInput.value = ''
              formulaInput.hidden = true
              // tableText.classList.add("result-target-mid");
            }
            detailsHTML.insertBefore(formulaInput, tableText)
            break
          }
        }
        index++
      }
    }
  }

  /**
     *
     * @param {document} footer
     * @returns
     */
  static replaceRollButton (footer) {
    const rollButton = footer.getElementsByClassName('roll')[0]
    // remove the default listener by cloning the button
    const rollButtonClone = rollButton.cloneNode(true)
    rollButton.parentNode.replaceChild(rollButtonClone, rollButton)
    return rollButtonClone
  }

  /**
     *
     * @param {HTMLElement} htmlElement
     * @param {RollTable} tableEntity
     */
  static async showGenerateLootButton (htmlElement, tableEntity) {
    const generateLootBtn = document.createElement('button')
    generateLootBtn.setAttribute('class', 'generate')
    generateLootBtn.setAttribute('type', 'button')

    generateLootBtn.innerHTML = `<i id="BRT-gen-loot" class="fas fa-coins"></i> ${i18n('BRT.GenerateLoot.Button')}`
    generateLootBtn.onclick = async function () { await game.betterTables.generateLoot(tableEntity) }
    htmlElement.insertBefore(generateLootBtn, htmlElement.firstChild)
  }

  static async onOptionTypeChanged (value, tableEntity) {
    // console.log("onOptionTypeChanged");
    // console.log(tableEntity);
    await tableEntity.setFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.TABLE_TYPE_KEY, value)
  }
}
