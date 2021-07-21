import * as Utils from './utils.js'
import * as BRTHelper from './brt-helper.js'
import { BRTBuilder } from './brt-builder.js'
import { BRTCONFIG } from './config.js'

export class BetterResults {
  constructor (tableResults) {
    this.results = []
    this.currencyData = {}
    this.tableResults = tableResults
  }

  async buildResults (table) {
    const currencyString = table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_CURRENCY_KEY)
    this.currencyData = await this._generateCurrency(currencyString)

    for (let i = 0; i < this.tableResults.length; i++) {
      const betterResults = await this._parseResult(this.tableResults[i])
      // if a inner table is rolled, the result returned is undefined but the array this.tableResult is extended with the new results

      for (const r of betterResults) {
        this.results.push(r)
      }
    }
    return this.results
  }

  getCurrencyData () {
    return this.currencyData
  }

  async _parseResult (result) {
    const betterResults = []
    if (result.data.type === CONST.TABLE_RESULT_TYPES.TEXT) {
      const textResults = result.data.text.split('|')

      for (let t of textResults) {
        // if the text is a currency, we process that first
        t = await this._processTextAsCurrency(t)
        t = await this._rollInlineDice(t)

        // eslint-disable-next-line no-useless-escape
        const regex = /(\s*[^\[@]*)@*(\w+)*\[([\w.,*+-\/\(\)]+)\]/g
        let textString = t
        const commands = []
        let table
        const betterResult = {}
        let matches

        while ((matches = regex.exec(t)) !== null) {
          // matches[1] is undefined in case we are matching [tablename]
          // if we are matching @command[string] then matches[2] is the command and [3] is the arg inside []
          // console.log(`match 0: ${matches[0]}, 1: ${matches[1]}, 2: ${matches[2]}, 3: ${matches[3]}`);

          if (matches[1] !== undefined && matches[1].trim() !== '') {
            textString = matches[1]
          }
          // textString = matches[1] || textString; //the first match is the text outside [], a rollformula
          const commandName = matches[2]
          const innerTableName = matches[3]

          if (!commandName && innerTableName) {
            const out = Utils.separateIdComendiumName(innerTableName)
            const tableName = out.nameOrId
            const tableCompendiumName = out.compendiumName

            if (tableCompendiumName) {
              table = await Utils.findInCompendiumByName(tableCompendiumName, tableName)
            } else {
              table = game.tables.getName(tableName)
            }

            if (!table) {
              ui.notifications.warn(`no table named ${tableName} found in compendium ${tableCompendiumName}, did you misspell your table name in brackets?`)
            }
            break
          } else if (commandName) {
            commands.push({ command: commandName.toLowerCase(), arg: matches[3] })
            if (commandName.toLowerCase() === 'compendium') {
              betterResult.collection = matches[3]
            }
          }
        }

        // if a table definition is found, the textString is the rollFormula to be rolled on that table
        if (table) {
          const numberRolls = await BRTHelper.tryRoll(textString)
          const brtBuilder = new BRTBuilder(table)
          const innerResults = await brtBuilder.betterRoll(numberRolls)

          this.tableResults = this.tableResults.concat(innerResults)
        } else if (textString) {
          // if no table definition is found, the textString is the item name
          console.log(`results text ${textString.trim()} and commands ${commands}`)
          betterResult.img = result.data.img
          betterResult.text = textString.trim()
          betterResult.commands = commands
          betterResults.push(betterResult)
        }
      }
    } else {
      const betterResult = {}
      betterResult.img = result.data.img
      betterResult.collection = result.data.collection
      betterResult.text = result.data.text
      betterResults.push(betterResult)
    }

    return betterResults
  }

  /**
     *
     * @param {String} tableText
     * @returns
     */
  async _processTextAsCurrency (tableText) {
    const regex = /{([^}]+)}/g
    let matches

    while ((matches = regex.exec(tableText)) != null) {
      this._addCurrency(await this._generateCurrency(matches[1]))
    }

    return tableText.replace(regex, '')
  }

  /**
     * Add given currency to existing currency
     *
     * @param {array} currencyData
     */
  _addCurrency (currencyData) {
    for (const key in currencyData) {
      this.currencyData[key] = (this.currencyData[key] || 0) + currencyData[key]
    }
  }

  /**
     *
     * @param {string} tableText
     * @returns
     */
  async _rollInlineDice (tableText) {
    const regex = /\[{2}(\w*[^\]])\]{2}/g
    let matches
    while ((matches = regex.exec(tableText)) != null) {
      tableText = tableText.replace(matches[0], await BRTHelper.tryRoll(matches[1]))
    }

    return tableText
  }

  /**
     * Check given string and parse it against a regex to generate currency array
     *
     * @param {String} currencyString
     *
     * @returns
     */
  async _generateCurrency (currencyString) {
    const currenciesToAdd = {}
    if (currencyString) {
      const currenciesPieces = currencyString.split(',')
      for (const currency of currenciesPieces) {
        const match = /(.*)\[(.*?)\]/g.exec(currency) // capturing 2 groups, the formula and then the currency symbol in brakets []
        if (!match || match.length < 3) {
          ui.notifications.warn(`Currency loot field contain wrong formatting, currencies need to be define as "diceFormula[currencyType]" => "1d100[gp]" but was ${currency}`)
          continue
        }
        const rollFormula = match[1]
        const currencyString = match[2]
        const amount = await BRTHelper.tryRoll(rollFormula)

        currenciesToAdd[currencyString] = (currenciesToAdd[currencyString] || 0) + amount
      }
    }
    return currenciesToAdd
  }
}
