import { API } from '../API.js';
import { MODULE } from '../core/config.js';
import { BetterRT } from '../better-table-view.js';
import { Settings } from '../core/settingsConfig.js';
import { BetterTables } from '../better-tables.js';
import renderWelcomeScreen from '../versioning/welcome-screen.js';
import VersionCheck from '../versioning/version-check.js';
import { getIconByEntityType } from '../core/utils.js';


/**
 * @module BetterRollTables.BetterRolltableHooks
 * @typicalname BetterRolltableHooks
 *
 * @version 1.0.0
 *
 */
class BetterRolltableHooks {

  /**
  * Hooks on game hooks and attaches methods
  */
  static init() {
    Hooks.once("init", BetterRolltableHooks.foundryInit);
    Hooks.once("ready", BetterRolltableHooks.foundryReady);
    Hooks.once('aipSetup', BetterRolltableHooks.onAIPSetup);
    Hooks.once('devModeReady', BetterRolltableHooks.onDevModeReady);
    Hooks.once('setup', BetterRolltableHooks.foundrySetup);
  }

  static foundrySetup() {
      const moduleData = game.modules.get(MODULE.ns);

      /**
       * @type {API}
       */
      moduleData.public = {
          API
      };

      // Freeze the public API so it can't be modified.
      Object.freeze(moduleData.public);
  }

  static async foundryReady() {
    const moduleSettings = new Settings();
    moduleSettings.registerSettings();

    Hooks.on('renderRollTableConfig', BetterRT.enhanceRollTableView);
    Hooks.on('renderChatMessage', BetterTables.handleChatMessageButtons);
    Hooks.on('renderJournalSheet', BetterTables.handleRolltableLink);
    Hooks.on('renderItemSheet', BetterTables.handleRolltableLink);
    if (game.system.id === 'dnd5e') {
      Hooks.on('renderActorSheet', BetterTables.handleChatMessageButtons);
    }

    if (game.user.isGM && VersionCheck.check(MODULE.ns)) {
      renderWelcomeScreen();
    }

    /** Register Handlebar helpers **/
    /** checks if the first argument is equal to any of the subsequent arguments */
    Handlebars.registerHelper('ifcontain', function () {
      const options = arguments[arguments.length - 1]
      for (let i = 1; i < arguments.length - 1; i++) {
        if (arguments[0] === arguments[i]) { return options.fn(this) }
      }
      return options.inverse(this)
    });

    /** checks if the first argument is greater than the second argument */
    Handlebars.registerHelper('ifgt', function (a, b, options) {
      return a > b ? options.fn(this) : options.inverse(this)
    });

    Handlebars.registerHelper('ifeq', function (a, b, options) {
      return (a == b) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('uneq', function (a, b, options) {
      return (a != b) ? options.fn(this) : options.inverse(this);
    });

    /** return fas icon based on document name */
    Handlebars.registerHelper('entity-icon', function (documentName) {
      return getIconByEntityType(documentName)
    });

    Handlebars.registerHelper('format-currencies', function (currenciesData) {
      let currencyString = ''
      for (const key in currenciesData) {
        if (currencyString !== '') currencyString += ', '
        currencyString += `${currenciesData[key]}${key}`
      }
      return currencyString
    })

    Handlebars.registerHelper('switch', function (value, options) {
      this.switch_value = value;
      return options.fn(this);
    })

    Handlebars.registerHelper('isEmpty', function (value, options) {
      return (value === undefined || (value instanceof Object && Object.keys(value).length === 0) || (value instanceof Array && value.length === 0))
        ? options.fn(this)
        : options.inverse(this)
    })

    Handlebars.registerHelper('unlessEmpty', function (value, options) {
      return (value !== undefined && ((value instanceof Object && Object.keys(value).length > 0) || (value instanceof Array && value.length > 0)))
        ? options.fn(this)
        : options.inverse(this)
    })

    Handlebars.registerHelper('case', function (value, options) {
      if (value == this.switch_value) {
        return options.fn(this)
      }
    });

    await game.betterTables.updateSpellCache();
  }

  static foundryInit() {
    game.betterTables = new BetterTables();
    const moduleSettingsInit = new Settings();
    moduleSettingsInit.registerSettingsDuringInit();

    Hooks.on('getCompendiumDirectoryEntryContext', BetterTables.enhanceCompendiumContextMenu);
    Hooks.on('getRollTableDirectoryEntryContext', BetterTables.enhanceRolltableContextMenu);
  }

  /**
   * Register with AIP
   *
   * Register fields with autocomplete inline properties
   */
  static async onAIPSetup() {
    const api = game.modules.get("autocomplete-inline-properties").API;
    const DATA_MODE = api.CONST.DATA_MODE;

    // AIP
    // Define the config for our package
    const config = {
      packageName: MODULE.ns,
      sheetClasses: [
        {
          name: "RolltableConfig", // this _must_ be the class name of the `Application` you want it to apply to
          fieldConfigs: [
            {
              selector: `.tags .tagger input`,
              showButton: true,
              allowHotkey: true,
              dataMode: DATA_MODE.OWNING_ACTOR_DATA,
            },
          ]
        },
      ]
    };

    // Add our config
    api.PACKAGE_CONFIG.push(config);
  }

  static onDevModeReady({ registerPackageDebugFlag }) {
    registerPackageDebugFlag(MODULE.ns);
  }
}

export { BetterRolltableHooks };
