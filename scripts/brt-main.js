import { BetterRT } from './better-table-view.js';

// CONFIG.debug.hooks = true;

Hooks.on("init", function () {
  console.log("BRT: initialized.");
  Handlebars.registerHelper('ifeq', function (a, b, options) {
    if (a == b) { return options.fn(this); }
    return options.inverse(this);
  });
});

Hooks.on("renderRollTableConfig", BetterRT.enhanceRollTableView);
Hooks.on("preUpdateRollTable", BetterRT.preUpdateRollTable);
