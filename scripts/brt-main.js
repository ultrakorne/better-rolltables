import { BetterRT } from './better-table-view.js';
import { BRTCONFIG } from './config.js';
import { i18n } from './utils.js';

// CONFIG.debug.hooks = true;

Hooks.on("init", function () {
  Handlebars.registerHelper('ifeq', function (a, b, options) {
    if (a == b) { return options.fn(this); }
    return options.inverse(this);
  });

  registerSettings();
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
