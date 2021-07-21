import { findInCompendiumById } from '../core/utils.js'

export class LootManipulator {
  async _getRandomSpell (level) {
    const spells = game.betterTables.getSpellCache().filter(spell => spell.data.level === level)
    const randomIndex = Math.floor(Math.random() * spells.length)
    const spell = spells[randomIndex]
    return findInCompendiumById(spell.collection, spell._id)
  }

  async preItemCreationDataManipulation (itemData) {
    // we duplicate item now in order to modify it
    itemData = duplicate(itemData)

    // const match = BRTCONFIG.SCROLL_REGEX.exec(itemData.name);
    let match = /\s*Spell\s*Scroll\s*(\d+|cantrip)/gi.exec(itemData.name)

    if (!match) {
      // pf2e temporary FIXME add this in a proper config
      match = /\s*Scroll\s*of\s*(\d+)/gi.exec(itemData.name)
    }

    if (!match) {
      return itemData
    }

    // if its a scorll then open compendium
    const level = match[1].toLowerCase() === 'cantrip' ? 0 : parseInt(match[1])
    const itemEntity = await this._getRandomSpell(level)

    if (!itemEntity) {
      ui.notifications.warn(`no spell of level ${level} found in compendium  ${itemEntity.collection} `)
      return itemData
    }

    const itemLink = `@Compendium[${itemEntity.collection}.${itemEntity.data._id}]`
    // make the name shorter by removing some text
    itemData.name = itemData.name.replace(/^(Spell\s)/, '')
    itemData.name = itemData.name.replace(/(Cantrip\sLevel)/, 'Cantrip')
    itemData.name += ` (${itemEntity.data.name})`
    itemData.data.description.value = '<blockquote>' + itemLink + '<br />' + itemEntity.data.data.description.value + '<hr />' + itemData.data.description.value + '</blockquote>'
    return itemData
  }
}
