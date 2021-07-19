export const BRTCONFIG = {};

BRTCONFIG.NAMESPACE = "better-rolltables";
//saved data keys (used e.g. in the rolltableEntity.data.flags)
BRTCONFIG.TABLE_TYPE_KEY = "table-type";
BRTCONFIG.LOOT_CURRENCY_KEY = "table-currency-string";
BRTCONFIG.ROLLS_AMOUNT_KEY = "loot-amount-key";
BRTCONFIG.ACTOR_NAME_KEY = "loot-actor-name";
BRTCONFIG.RESULTS_FORMULA_KEY = "brt-result-formula";

//different type of table type the mod will support. none will basically keep the basic rolltable functionality
BRTCONFIG.TABLE_TYPE_NONE = "none";
BRTCONFIG.TABLE_TYPE_BETTER = "better";
BRTCONFIG.TABLE_TYPE_LOOT = "loot";
BRTCONFIG.TABLE_TYPE_STORY = "story";

BRTCONFIG.SPELL_COMPENDIUM_KEY = "default-spell-compendium";
BRTCONFIG.LOOT_SHEET_TO_USE_KEY = "loot-sheet-to-use";
BRTCONFIG.SHOW_REROLL_BUTTONS = "show-reroll-buttons";
BRTCONFIG.SHOW_OPEN_BUTTONS = "show-open-buttons";
BRTCONFIG.USE_CONDENSED_BETTERROLL = "use-condensed-betterroll";
BRTCONFIG.ADD_ROLL_IN_COMPENDIUM_CONTEXTMENU = "add-roll-on-compendium-contextmenu";
BRTCONFIG.ADD_ROLL_IN_ROLLTABLE_CONTEXTMENU = "add-roll-on-rolltable-contextmenu";
BRTCONFIG.SHOW_WARNING_BEFORE_REROLL = "show-warning-before-reroll";
BRTCONFIG.STICK_ROLLTABLE_HEADER = "stick-rolltable-header";
BRTCONFIG.ROLL_TABLE_FROM_JOURNAL = "roll-table-from-journal";

//in fp2e quantity is in data.data.quantity.value , in 5e data.data.quantity  
BRTCONFIG.QUANTITY_PROPERTY_PATH = "data.quantity";
BRTCONFIG.PRICE_PROPERTY_PATH = "data.price";
BRTCONFIG.SPELL_LEVEL_PATH = "data.level";
//in 5e a valid item type is loot
BRTCONFIG.ITEM_LOOT_TYPE = "loot";
BRTCONFIG.SCROLL_REGEX = /\s*Spell\s*Scroll\s*(\d+|cantrip)/gi;