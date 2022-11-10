export const MODULE = {
  ns: 'better-rolltables',
  path: 'modules/better-rolltables',
  types: ['none', 'better', 'loot', 'story'],
};

export const BRTCONFIG = {
  NAMESPACE: 'better-rolltables',

  // saved data keys (used e.g. in the rolltableEntity.data.flags)
  TABLE_TYPE_KEY: 'table-type',
  LOOT_CURRENCY_KEY: 'table-currency-string',
  ROLLS_AMOUNT_KEY: 'loot-amount-key',
  ACTOR_NAME_KEY: 'loot-actor-name',
  RESULTS_FORMULA_KEY: 'brt-result-formula',

  // different type of table type the mod will support. none will basically keep the basic rolltable functionality
  TABLE_TYPE_NONE: 'none',
  TABLE_TYPE_BETTER: 'better',
  TABLE_TYPE_LOOT: 'loot',
  TABLE_TYPE_STORY: 'story',

  SPELL_COMPENDIUM_KEY: 'default-spell-compendium',
  LOOT_SHEET_TO_USE_KEY: 'loot-sheet-to-use',
  SHOW_REROLL_BUTTONS: 'show-reroll-buttons',
  SHOW_OPEN_BUTTONS: 'show-open-buttons',
  USE_CONDENSED_BETTERROLL: 'use-condensed-betterroll',
  ADD_ROLL_IN_COMPENDIUM_CONTEXTMENU: 'add-roll-on-compendium-contextmenu',
  ADD_ROLL_IN_ROLLTABLE_CONTEXTMENU: 'add-roll-on-rolltable-contextmenu',
  SHOW_WARNING_BEFORE_REROLL: 'show-warning-before-reroll',
  STICK_ROLLTABLE_HEADER: 'stick-rolltable-header',
  ROLL_TABLE_FROM_JOURNAL: 'roll-table-from-journal',
  SHOW_CURRENCY_SHARE_BUTTON: 'show-currency-share-button',
  ALWAYS_SHOW_GENERATED_LOOT_AS_MESSAGE:
    'always-show-generated-loot-as-message',

  // in fp2e quantity is in system.quantity.value , in 5e system.quantity
  QUANTITY_PROPERTY_PATH: 'system.quantity',
  PRICE_PROPERTY_PATH: 'system.price',
  SPELL_LEVEL_PATH: 'system.level',

  // in 5e a valid item type is loot
  ITEM_LOOT_TYPE: 'loot',
  REGEX: {
    scroll: /\s*Spell\s*Scroll\s*(\d+|cantrip)/i,
  },
  SCROLL_REGEX: /\s*Spell\s*Scroll\s*(\d+|cantrip)/i,
  TAGS: {
    USE: 'use-tags',
    DEFAULTS: 'tag-defaults',
  },
};
