import { BetterRT } from './better-table-view.js';
import { MODULE , BRTCONFIG } from './core/config.js';
import {getIconByEntityType, i18n} from './core/utils.js';
import { BetterTables } from './better-tables.js';
import VersionCheck from './versioning/version-check.js';
import renderWelcomeScreen from './versioning/welcome-screen.js';
import { Settings } from './core/settingsConfig.js';

// CONFIG.debug.hooks = true;

Hooks.once('init', async () => {
  registerHandlebarsHelpers();  
  registerTemplates();

  game.betterTables = new BetterTables();
});

Hooks.once('ready', async () => {
  Settings.registerSettings();
  
  Hooks.on('renderRollTableConfig', BetterRT.enhanceRollTableView);
  Hooks.on('getCompendiumDirectoryEntryContext', BetterTables.enhanceCompendiumContextMenu);
  Hooks.on('getRollTableDirectoryEntryContext', BetterTables.enhanceRolltableContextMenu);
  Hooks.on('renderChatMessage', BetterTables.handleChatMessageButtons);
  Hooks.on('renderJournalSheet', BetterTables.handleRolltableLink);
  Hooks.on('renderItemSheet', BetterTables.handleRolltableLink);


  if (game.user.isGM && VersionCheck.check(MODULE.ns)) {
    renderWelcomeScreen();
  }

  await game.betterTables.updateSpellCache();

  // refresh spell cache for random spell scroll generation on compendium updates
  Hooks.on('updateCompendium', async function (pack) {
    await game.betterTables.updateSpellCache(pack);
  });

  if (game.system.id === 'dnd5e') {
    Hooks.on('renderActorSheet', BetterTables.handleChatMessageButtons);
  }
});

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

async function registerTemplates(){
  await loadTemplates([
    `${MODULE.path}/templates/config/settings.hbs`,
    `${MODULE.path}/templates/config/new_rule_form.hbs`,
    `${MODULE.path}/templates/partials/actions.hbs`,
    `${MODULE.path}/templates/partials/dropdown_options.hbs`,
    `${MODULE.path}/templates/partials/filters.hbs`,
    `${MODULE.path}/templates/partials/settings.hbs`,
    `${MODULE.path}/templates/partials/menu.hbs`,
  ]);
}
