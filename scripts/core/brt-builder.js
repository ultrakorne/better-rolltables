import * as BRTHelper from './brt-helper.js'
import * as Utils from '../core/utils.js'
import { BRTCONFIG } from './config.js'

export class BRTBuilder {
  constructor (tableEntity) {
    this.table = tableEntity
  }

  /**
     *
     * @param {*} rollsAmount
     * @returns {array} results
     */
  async betterRoll (rollsAmount = undefined) {
    this.mainRoll = undefined
    rollsAmount = rollsAmount || await BRTHelper.rollsAmount(this.table)
    this.results = await this.rollManyOnTable(rollsAmount, this.table)
    return this.results
  }

  /**
     *
     * @param {array} results
     */
  async createChatCard (results) {
    await this.table.toMessage(results, { roll: this.mainRoll })
  }

  /**
     *
     * @param {number} amount
     * @param {RollTable} table
     * @param {object} options
     *
     * @returns {array}
     */
  async rollManyOnTable (amount, table, { _depth = 0 } = {}) {
    const maxRecursions = 5
    // Prevent infinite recursion
    if (_depth > maxRecursions) {
      throw new Error(`Recursion depth of ${maxRecursions} exceeded when attempting to draw from RollTable ${table._id}`)
    }

    let drawnResults = []

    while (amount > 0) {
      let resultToDraw = amount
      /** if we draw without replacement we need to reset the table once all entries are drawn */
      if (!table.data.replacement) {
        const resultsLeft = table.data.results.reduce(function (n, r) { return n + (!r.drawn) }, 0)

        if (resultsLeft === 0) {
          await table.reset()
          continue
        }

        resultToDraw = Math.min(resultsLeft, amount)
      }

      if (!table.data.formula) {
        ui.notifications.error(`Roll table formula in table ${table.name} is not defined!`)
        return
      }

      const draw = await table.drawMany(resultToDraw, { displayChat: false, recursive: false })
      if (!this.mainRoll) {
        this.mainRoll = draw.roll
      }

      for (const entry of draw.results) {
        const formulaAmount = getProperty(entry, `data.flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`) || ''
        const entryAmount = await BRTHelper.tryRoll(formulaAmount)

        let innerTable
        if (entry.data.type === CONST.TABLE_RESULT_TYPES.ENTITY && entry.data.collection === 'RollTable') {
          innerTable = game.tables.get(entry.data.resultId)
        } else if (entry.data.type === CONST.TABLE_RESULT_TYPES.COMPENDIUM) {
          const entityInCompendium = await Utils.findInCompendiumByName(entry.data.collection, entry.data.text)
          if ((entityInCompendium !== undefined) && entityInCompendium.documentName === 'RollTable') {
            innerTable = entityInCompendium
          }
        }

        if (innerTable) {
          const innerResults = await this.rollManyOnTable(entryAmount, innerTable, { _depth: _depth + 1 })
          drawnResults = drawnResults.concat(innerResults)
        } else {
          for (let i = 0; i < entryAmount; i++) {
            drawnResults.push(entry)
          }
        }
      }
      amount -= resultToDraw
    }

    return drawnResults
  }
}
