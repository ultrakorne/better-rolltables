import { BetterRT } from './better-table-view.js'
import { BRTCONFIG } from './core/config.js'
import {getIconByEntityType, i18n} from './core/utils.js'
import { BetterTables } from './better-tables.js'
import VersionCheck from './versioning/version-check.js'
import renderWelcomeScreen from './versioning/welcome-screen.js'

// CONFIG.debug.hooks = true;

Hooks.once('init', () => {
  registerHandlebarsHelpers()
  registerSettings()
  game.betterTables = new BetterTables()

  Hooks.on('renderRollTableConfig', BetterRT.enhanceRollTableView)
  Hooks.on('getCompendiumDirectoryEntryContext', BetterTables.enhanceCompendiumContextMenu)
  Hooks.on('getRollTableDirectoryEntryContext', BetterTables.enhanceRolltableContextMenu)
  Hooks.on('renderChatMessage', BetterTables.handleChatMessageButtons)
  Hooks.on('renderJournalSheet', BetterTables.handleRolltableLink)
  Hooks.on('renderItemSheet', BetterTables.handleRolltableLink)
})

Hooks.once('ready', async () => {
  if (game.user.isGM && VersionCheck.check(BRTCONFIG.NAMESPACE)) {
    renderWelcomeScreen()
  }

  await game.betterTables.updateSpellCache()

  // refresh spell cache for random spell scroll generation on compendium updates
  Hooks.on('updateCompendium', async function (pack) {
    await game.betterTables.updateSpellCache(pack)
  })

  if (game.system.id === 'dnd5e') {
    Hooks.on('renderActorSheet', BetterTables.handleChatMessageButtons)
  }
})

function registerSettings () {
  let defaultLootSheet = 'dnd5e.LootSheet5eNPC'
  let defaultSpellCompendium = 'dnd5e.spells'

  if (game.system.id === 'pf2e') {
    defaultLootSheet = 'pf2e.LootSheetNPC'
    defaultSpellCompendium = 'pf2e.spells-srd'

    BRTCONFIG.QUANTITY_PROPERTY_PATH = 'data.quantity.value'
    BRTCONFIG.PRICE_PROPERTY_PATH = 'data.price.value'
    BRTCONFIG.SPELL_LEVEL_PATH = 'data.level.value'
    BRTCONFIG.ITEM_LOOT_TYPE = 'treasure'
    // pf2e scroll is "Scroll of 1st-level Spell"
    BRTCONFIG.SCROLL_REGEX = /\s*Scroll\s*of\s*(\d+)/gi
  }

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_SHEET_TO_USE_KEY, {
    name: i18n('BRT.Settings.LootSheet.Title'),
    hint: i18n('BRT.Settings.LootSheet.Description'),
    config: true,
    default: defaultLootSheet,
    type: String
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.SPELL_COMPENDIUM_KEY, {
    name: i18n('BRT.Settings.SpellCompendium.Title'),
    hint: i18n('BRT.Settings.SpellCompendium.Description'),
    config: true,
    default: defaultSpellCompendium,
    type: String
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.USE_CONDENSED_BETTERROLL, {
    name: i18n('BRT.Settings.UseCondensedBetterRoll.Title'),
    hint: i18n('BRT.Settings.UseCondensedBetterRoll.Description'),
    config: true,
    default: false,
    type: Boolean
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.SHOW_REROLL_BUTTONS, {
    name: i18n('BRT.Settings.RerollButtons.Title'),
    hint: i18n('BRT.Settings.RerollButtons.Description'),
    config: true,
    default: false,
    type: Boolean
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.SHOW_OPEN_BUTTONS, {
    name: i18n('BRT.Settings.OpenButtons.Title'),
    hint: i18n('BRT.Settings.OpenButtons.Description'),
    config: true,
    default: false,
    type: Boolean
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.SHOW_WARNING_BEFORE_REROLL, {
    name: i18n('BRT.Settings.ShowWarningBeforeReroll.Title'),
    hint: i18n('BRT.Settings.ShowWarningBeforeReroll.Description'),
    config: true,
    default: false,
    type: Boolean
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.ADD_ROLL_IN_ROLLTABLE_CONTEXTMENU, {
    name: i18n('BRT.Settings.AddRollInRolltableContextMenu.Title'),
    hint: i18n('BRT.Settings.AddRollInRolltableContextMenu.Description'),
    config: true,
    default: false,
    type: Boolean
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.ADD_ROLL_IN_COMPENDIUM_CONTEXTMENU, {
    name: i18n('BRT.Settings.AddRollInCompediumContextMenu.Title'),
    hint: i18n('BRT.Settings.AddRollInCompediumContextMenu.Description'),
    config: true,
    default: false,
    type: Boolean
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.STICK_ROLLTABLE_HEADER, {
    name: i18n('BRT.Settings.StickRolltableHeader.Title'),
    hint: i18n('BRT.Settings.StickRolltableHeader.Description'),
    config: true,
    default: false,
    type: Boolean
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.ROLL_TABLE_FROM_JOURNAL, {
    name: i18n('BRT.Settings.RollTableFromJournal.Title'),
    hint: i18n('BRT.Settings.RollTableFromJournal.Description'),
    config: true,
    default: false,
    type: Boolean
  })

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.SHOW_CURRENCY_SHARE_BUTTON, {
    name: i18n('BRT.Settings.ShareCurrencyButton.Title'),
    hint: i18n('BRT.Settings.ShareCurrencyButton.Description'),
    config: true,
    default: false,
    type: Boolean
  })


  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.ALWAYS_SHOW_GENERATED_LOOT_AS_MESSAGE, {
    name: i18n('BRT.Settings.AlwaysShowGeneratedLootAsMessage.Title'),
    hint: i18n('BRT.Settings.AlwaysShowGeneratedLootAsMessage.Description'),
    config: true,
    default: false,
    type: Boolean
  })
}

function registerHandlebarsHelpers () {
  /** checks if the first argument is equal to any of the subsequent arguments */
  Handlebars.registerHelper('ifcontain', function () {
    const options = arguments[arguments.length - 1]
    for (let i = 1; i < arguments.length - 1; i++) {
      if (arguments[0] === arguments[i]) { return options.fn(this) }
    }
    return options.inverse(this)
  })

  /** checks if the first argument is greater than the second argument */
  Handlebars.registerHelper('ifgt', function (v1, v2, options) {
    return v1 > v2 ? options.fn(this) : options.inverse(this)
  })

  /** checks if the first argument is equal than the second argument */
  Handlebars.registerHelper('ifeq', function (v1, v2, options) {
    return v1 === v2 ? options.fn(this) : options.inverse(this)
  })

  /** return fas icon based on document name */
  Handlebars.registerHelper('entity-icon', function (documentName) {
    return getIconByEntityType(documentName)
  })

  Handlebars.registerHelper('format-currencies', function (currenciesData) {
    let currencyString = ''
    for (const key in currenciesData) {
      if (currencyString !== '') currencyString += ', '
      currencyString += `${currenciesData[key]}${key}`
    }
    return currencyString
  })

  Handlebars.registerHelper('switch', function(value, options) {
    this.switch_value = value;
    return options.fn(this);
  })

  Handlebars.registerHelper('isEmpty', function(value, options) {
    return (value === undefined || (value instanceof Object && Object.keys(value).length === 0) || (value instanceof Array && value.length === 0))
    ? options.fn(this)
    : options.inverse(this)
  })

  Handlebars.registerHelper('unlessEmpty', function(value, options) {
    return (value !== undefined && ((value instanceof Object && Object.keys(value).length > 0) || (value instanceof Array && value.length > 0)))
        ? options.fn(this)
        : options.inverse(this)
  })

  Handlebars.registerHelper('case', function(value, options) {
    if (value == this.switch_value) {
      return options.fn(this)
    }
  })
}
