import { StoryBoolCondition } from './story-bool-condition.js'
import * as Utils from '../core/utils.js'

export class StoryBuilder {
  constructor (tableEntity) {
    this.table = tableEntity
    /** the story tokens with the respective values, either pulled from a rolltable or rolled with a formula */
    this._storyTokens = {}
    /** string containing the story, to be replaced with the tokens */
    this._story = ''
    /** a story part that will only be showned to the GM */
    this._storyGm = ''
  }

  /**
     * Draw story from entity
     *
     */
  async drawStory () {
    const draw = await this.table.drawMany(1, { displayChat: false })

    let journalContent,
      errorString

    for (const entry of draw.results) {
      /** entity type 2 is when an entity in the world is linked */
      if (entry.data.type === 1 && entry.data.collection === 'JournalEntry') {
        const storyJournal = game.journal.get(entry.data.resultId)
        if (storyJournal) {
          journalContent = storyJournal.data.content
        } else {
          errorString = `Journal Entry ${entry.name} not found inside your world`
        }
      } else if (entry.data.type === 2) {
        /** entity type 2 is when an entity inside a compendium is linked */
        const entity = await Utils.findInCompendiumByName(entry.data.collection, entry.data.text)
        if (!entity) {
          errorString = `entity ${entry.data.text} not found in compendium ${entry.data.collection}`
        } else if (entity.entity === 'JournalEntry') {
          journalContent = entity.data.content
        } else {
          errorString = 'Only Journal entries are supported in the story generation as table results'
        }
      } else {
        errorString = 'Only Journal entries are supported in the story generation as table results'
      }

      if (journalContent) {
        await this._parseStoryDefinition(journalContent)
      }

      if (errorString) {
        ui.notifications.error(errorString)
      }
    }
    // console.log("this._storyTokens ", this._storyTokens);
    // console.log("story ", this._story);
  }

  /**
     *
     * @param {string} storyDefinition
     */
  async _parseStoryDefinition (storyDefinition) {
    const PARSE_MODE = {
      NONE: 0,
      DEFINITION: 1,
      STORY: 2,
      STORYGM: 3
    }

    /** remove html spaces and replacing with a space */
    storyDefinition = storyDefinition.replace(/(&nbsp;|<br>)+/g, ' ')
    const lines = storyDefinition.split(/\r\n|\r|\n/)

    let parseMode = PARSE_MODE.DEFINITION

    for (const line of lines) {
      // console.log("LINE ", line);
      const sectionMatch = /.*#([a-zA-Z]+)/.exec(line)
      if (sectionMatch) {
        switch (sectionMatch[1].toLowerCase()) {
          case 'story':
            parseMode = PARSE_MODE.STORY
            break
          case 'storygm':
            parseMode = PARSE_MODE.STORYGM
            break
          case 'definition':
            parseMode = PARSE_MODE.DEFINITION
            break
        }
      } else {
        if (parseMode === PARSE_MODE.STORY) {
          this._story += line
        } else if (parseMode === PARSE_MODE.STORYGM) {
          this._storyGm += line
        } else if (parseMode === PARSE_MODE.DEFINITION) {
          const matches = /\s*<p>(.+)\sas\s(.+)<\/p>/i.exec(line)
          if (matches) {
            await this._processDefinition(matches[1], matches[2])
          }
        }
      }
    }
  }

  /**
     *
     * @param {*} defValue
     * @param {string} definitionName
     * @returns
     */
  async _processDefinition (defValue, definitionName) {
    // console.log("value ", defValue);

    const match = /{ *([^}]*?) *}/.exec(definitionName)
    if (!match) {
      ui.notifications.error(`definition error, ${definitionName} is malformed. After keyword AS we expect a name in brackets {}`)
      return
    }
    const definition = match[1]
    if (hasProperty(this._storyTokens, definition)) {
      console.log(`definition ${definition} is already defined, skipping line`)
      return
    }

    // console.log("definition ", definition);
    const regexIF = /IF\s*\((.+)\)/
    const ifMatch = regexIF.exec(defValue)
    let conditionMet = true
    if (ifMatch) {
      const storyCondition = new StoryBoolCondition(defValue)
      conditionMet = storyCondition.evaluate()
    }

    if (!conditionMet) return

    const regexTable = /\s*@(RollTable|Compendium)\[ *([^\]]*?) *\]/
    const tableMatch = regexTable.exec(defValue)
    let valueResult
    /** there is a table definition on the left of the AS */
    if (tableMatch) {
      /** if it's a compendium the match is 'tablename.id' if it's a rolltable the match is directly the id */

      const out = Utils.separateIdComendiumName(tableMatch[2])
      const tableId = out.nameOrId
      const compendiumName = out.compendiumName
      let table
      if (compendiumName) {
        table = await Utils.findInCompendiumById(compendiumName, tableId)
      } else {
        table = game.tables.get(tableId)
      }

      if (!table) {
        ui.notifications.error(`table with id ${tableId} not found in the world, check the generation journal for broken links`)
        return
      }
      let draw = await table.drawMany(1, { displayChat: false })
      if (!draw) {
        await table.reset()
        draw = await table.drawMany(1, { displayChat: false })
      }

      if (draw.results.length !== 1) {
        ui.notifications.error(`0 or more than 1 result was drawn from table ${table.name}, only 1 result is supported check your table config`)
        return
      }

      const tableResult = draw.results[0]
      if (tableResult.data.type !== 0) {
        ui.notifications.warn(`only text result from table are supported at the moment, check table ${table.name}`)
      }
      valueResult = tableResult.data.text
    } else {
      const regexRoll = /\s*\[\[ *([^\]]*?) *\]\]/
      /** if no table match, lets check for a formula */
      const rollMatch = regexRoll.exec(defValue)
      if (rollMatch) {
        const rollFormula = rollMatch[1]
        try {
          let rollResult = await new Roll(rollFormula).evaluate({async: true});
          valueResult = rollResult.total || 0;
        } catch (error) {
          valueResult = 0
        }
      } else {
        ui.notifications.error('on the left side of the AS in a story definition a rolltable or rollformula must be provided')
      }
    }

    if (valueResult) {
      setProperty(this._storyTokens, definition, valueResult)
    }
  }

  getGeneratedStory () {
    return this._generateStory(this._story)
  }

  getGeneratedStoryGM () {
    return this._generateStory(this._storyGm)
  }

  /**
     * @param {*} story
     * @returns {string}
     */
  _generateStory (story) {
    if (!story) return story

    const regex = /{ *([^}]*?) *}/g
    let replacedStory = story
    let matches

    while ((matches = regex.exec(story)) != null) {
      const value = getProperty(this._storyTokens, matches[1])
      if (!value) {
        ui.notifications.error(`cannot find a value for token ${matches[1]} in #story definition`)
        continue
      }
      replacedStory = replacedStory.replace(matches[0], value)
    }
    return replacedStory
  }
}
