import { findInCompendiumById } from '../core/utils.js';
import { MODULE, BRTCONFIG } from '../core/config.js';

export class LootManipulator {
  /**
   *
   * @param {number} level
   *
   * @returns {Item}
   */
  async _getRandomSpell(level) {
    const spells = game.betterTables
        .getSpellCache()
        .filter(
          (spell) => getProperty(spell, BRTCONFIG.SPELL_LEVEL_PATH) === level
        ),
      spell = spells[Math.floor(Math.random() * spells.length)];
    return findInCompendiumById(spell.collection, spell._id);
  }

  /**
   *
   * @param {*} itemData
   *
   * @returns
   */
  async preItemCreationDataManipulation(itemData) {
    const match = BRTCONFIG.SCROLL_REGEX.exec(itemData.name);

    itemData = duplicate(itemData);

    if (!match) {
      return itemData;
    }

    // If it is a scroll then open the compendium
    const level = match[1].toLowerCase() === 'cantrip' ? 0 : parseInt(match[1]);
    const itemEntity = await this._getRandomSpell(level);

    if (!itemEntity) {
      ui.notifications.warn(
        MODULE.ns +
          ` | No spell of level ${level} found in compendium  ${itemEntity.collection} `
      );
      return itemData;
    }

    const itemLink = `@Compendium[${itemEntity.pack}.${itemEntity._id}]`;
    // make the name shorter by removing some text
    itemData.name = itemData.name.replace(/^(Spell\s)/, '');
    itemData.name = itemData.name.replace(/(Cantrip\sLevel)/, 'Cantrip');
    itemData.name += ` (${itemEntity.name})`;
    itemData.system.description.value =
      '<blockquote>' +
      itemLink +
      '<br />' +
      itemEntity.system.description.value +
      '<hr />' +
      itemData.system.description.value +
      '</blockquote>';
    return itemData;
  }
}
