import { BetterRT } from './better-table-view.js';
import { BRTCONFIG } from './config.js';
import { i18n } from './utils.js';

// CONFIG.debug.hooks = true;

Hooks.on("init", function () {
  // console.log("BRT: initialized.");
  Handlebars.registerHelper('ifeq', function (a, b, options) {
    if (a == b) { return options.fn(this); }
    return options.inverse(this);
  });

  registerSettings();
});

Hooks.on("renderRollTableConfig", BetterRT.enhanceRollTableView);
Hooks.on("preUpdateRollTable", BetterRT.preUpdateRollTable);


function registerSettings() {
  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.LOOT_SHEET_TO_USE_KEY, {
    name: i18n("BRT.Settings.LootSheet.Title"),
    hint: i18n("BRT.Settings.LootSheet.Description"),
    config: true,
    default: "dnd5e.LootSheet5eNPC",
    type: String
  });

  game.settings.register(BRTCONFIG.NAMESPACE, BRTCONFIG.SPELL_COMPENDIUM_KEY, {
    name: i18n("BRT.Settings.SpellCompendium.Title"),
    hint: i18n("BRT.Settings.SpellCompendium.Description"),
    config: true,
    default: "dnd5e.spells",
    type: String
  });
}
