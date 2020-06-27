import { BetterRT } from './better-table-view.js';
import { BRTCONFIG } from './core/config.js';
import { i18n } from './core/utils.js';
import { BetterTables } from './better-tables.js';
import VersionCheck from './versioning/version-check.mjs';
import renderWelcomeScreen from "./versioning/welcome-screen.mjs";

// CONFIG.debug.hooks = true;

Hooks.on("init", () => {
  /** checks if the first argument is equal to any of the subsequent arguments */
  Handlebars.registerHelper('ifcontain', function () {
    let options = arguments[arguments.length - 1];
    for (let i = 1; i < arguments.length - 1; i++) {
      if (arguments[0] == arguments[i]) { return options.fn(this); }
    }
    return options.inverse(this);
  });

  registerSettings();
  game.betterTables = new BetterTables();
});

Hooks.on("ready", () => {
  if (VersionCheck.check(BRTCONFIG.NAMESPACE) && game.user.isGM) {
    renderWelcomeScreen();
  }
});

Hooks.on("renderRollTableConfig", BetterRT.enhanceRollTableView);
Hooks.on("preUpdateRollTable", BetterRT.preUpdateRollTable);

function registerSettings() {
  let defaultLootSheet = "dnd5e.LootSheet5eNPC";
  let defaultSpellCompendium = "dnd5e.spells";

  if (game.system.id === "pf2e") {
    defaultLootSheet = "pf2e.LootSheetNPC";
    defaultSpellCompendium = "pf2e.spells-srd";

    BRTCONFIG.QUANTITY_PROPERTY_PATH = "data.quantity.value";
    BRTCONFIG.PRICE_PROPERTY_PATH = "data.price.value";
    BRTCONFIG.SPELL_LEVEL_PATH = "data.level.value";
    BRTCONFIG.ITEM_LOOT_TYPE = "treasure";
    //pf2e scroll is "Scroll of 1st-level Spell"
    BRTCONFIG.SCROLL_REGEX = /\s*Scroll\s*of\s*(\d+)/gi;
  }

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_SHEET_TO_USE_KEY, {
    name: i18n("BRT.Settings.LootSheet.Title"),
    hint: i18n("BRT.Settings.LootSheet.Description"),
    config: true,
    default: defaultLootSheet,
    type: String
  });

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.SPELL_COMPENDIUM_KEY, {
    name: i18n("BRT.Settings.SpellCompendium.Title"),
    hint: i18n("BRT.Settings.SpellCompendium.Description"),
    config: true,
    default: defaultSpellCompendium,
    type: String
  });
}



