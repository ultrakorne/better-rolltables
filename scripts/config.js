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
BRTCONFIG.ROLLS_AMOUNT_KEY = "loot-amount-key";

//in fp2e quantity is in data.data.quantity.value , in 5e data.data.quantity  
BRTCONFIG.QUANTITY_PROPERTY_PATH = "data.quantity";
BRTCONFIG.PRICE_PROPERTY_PATH = "data.price";
BRTCONFIG.SPELL_LEVEL_PATH = "data.level";
//in 5e a valid item type is loot
BRTCONFIG.ITEM_LOOT_TYPE = "loot";
BRTCONFIG.SCROLL_REGEX = /\s*Spell\s*Scroll\s*(\d+|cantrip)/gi;