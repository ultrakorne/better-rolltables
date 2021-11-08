import { MODULE , BRTCONFIG } from './config.js';
import { i18n } from './utils.js';

const WORLD = 'world',
      GROUP_DEFAULT = 'defaults',
      GROUP_TAGS = 'Tags',
      GROUP_UI = 'UI',
      GROUP_LOOT = 'Loot';

export class Settings {
    constructor() {
        return this;
    }

    /**
     * Register the game settings
     */
    static registerSettings() {
        let defaultLootSheet = 'dnd5e.LootSheet5eNPC',
            systemSheets = Object.values(CONFIG.Actor.sheetClasses.npc).map(s => ({id: s.id, label: s.label})),
            defaultSpellCompendium = 'dnd5e.spells';

        if (game.system.id === 'pf2e') {
            defaultLootSheet = 'pf2e.LootSheetNPC';
            defaultSpellCompendium = 'pf2e.spells-srd';

            BRTCONFIG.QUANTITY_PROPERTY_PATH = 'data.quantity.value';
            BRTCONFIG.PRICE_PROPERTY_PATH = 'data.price.value';
            BRTCONFIG.SPELL_LEVEL_PATH = 'data.level.value';
            BRTCONFIG.ITEM_LOOT_TYPE = 'treasure';
            // pf2e scroll is "Scroll of 1st-level Spell"
            BRTCONFIG.SCROLL_REGEX = /\s*Scroll\s*of\s*(\d+)/gi;
        }

        game.settings.registerMenu(MODULE.ns, "helpersOptions", {
            name: game.i18n.format("User Interface Integration"),
            label: game.i18n.format("Integration Options & Defaults"),
            icon: "fas fa-user-cog",
            type: BetterRolltableSettingsConfig,
            restricted: true
        });

        /**
         * Base Settings Sheet
         */
        game.settings.register(MODULE.ns, BRTCONFIG.LOOT_SHEET_TO_USE_KEY, {
            name: i18n('BRT.Settings.LootSheet.Title'),
            hint: i18n('BRT.Settings.LootSheet.Description'),
            scope: WORLD,
            group: GROUP_DEFAULT,
            config: false,
            default: defaultLootSheet,
            type: String,
            choices: systemSheets
        });

        game.settings.register(MODULE.ns, BRTCONFIG.SPELL_COMPENDIUM_KEY, {
            name: i18n('BRT.Settings.SpellCompendium.Title'),
            hint: i18n('BRT.Settings.SpellCompendium.Description'),
            scope: WORLD,
            group: GROUP_DEFAULT,
            config: false,
            default: defaultSpellCompendium,
            type: String
        });

        /**
         * User Interface Integration
         */

        game.settings.register(MODULE.ns, BRTCONFIG.USE_CONDENSED_BETTERROLL, {
            name: i18n('BRT.Settings.UseCondensedBetterRoll.Title'),
            hint: i18n('BRT.Settings.UseCondensedBetterRoll.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.SHOW_REROLL_BUTTONS, {
            name: i18n('BRT.Settings.RerollButtons.Title'),
            hint: i18n('BRT.Settings.RerollButtons.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.SHOW_WARNING_BEFORE_REROLL, {
            name: i18n('BRT.Settings.ShowWarningBeforeReroll.Title'),
            hint: i18n('BRT.Settings.ShowWarningBeforeReroll.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: false,
            default: false,
            type: Boolean
        });        

        game.settings.register(MODULE.ns, BRTCONFIG.SHOW_OPEN_BUTTONS, {
            name: i18n('BRT.Settings.OpenButtons.Title'),
            hint: i18n('BRT.Settings.OpenButtons.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.ADD_ROLL_IN_ROLLTABLE_CONTEXTMENU, {
            name: i18n('BRT.Settings.AddRollInRolltableContextMenu.Title'),
            hint: i18n('BRT.Settings.AddRollInRolltableContextMenu.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.ADD_ROLL_IN_COMPENDIUM_CONTEXTMENU, {
            name: i18n('BRT.Settings.AddRollInCompediumContextMenu.Title'),
            hint: i18n('BRT.Settings.AddRollInCompediumContextMenu.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: true,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.CONFIG_COLLAPSED, {
            name: i18n('BRT.Settings.StickRolltableHeader.Title'),
            hint: i18n('BRT.Settings.StickRolltableHeader.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: true,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.ROLL_TABLE_FROM_JOURNAL, {
            name: i18n('BRT.Settings.RollTableFromJournal.Title'),
            hint: i18n('BRT.Settings.RollTableFromJournal.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: true,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.STICK_ROLLTABLE_HEADER, {
            name: i18n('BRT.Settings.StickRolltableHeader.Title'),
            hint: i18n('BRT.Settings.StickRolltableHeader.Description'),
            scope: WORLD,
            group: GROUP_UI,
            config: true,
            default: true,
            type: Boolean
        });

        Settings._registerTagsSettings();

        /**
         * Loot / Merchant specific
         */
        game.settings.register(MODULE.ns, BRTCONFIG.SHOW_CURRENCY_SHARE_BUTTON, {
            name: i18n('BRT.Settings.ShareCurrencyButton.Title'),
            hint: i18n('BRT.Settings.ShareCurrencyButton.Description'),
            scope: WORLD,
            group: GROUP_LOOT,
            config: false,
            default: false,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.ALWAYS_SHOW_GENERATED_LOOT_AS_MESSAGE, {
            name: i18n('BRT.Settings.AlwaysShowGeneratedLootAsMessage.Title'),
            hint: i18n('BRT.Settings.AlwaysShowGeneratedLootAsMessage.Description'),
            scope: WORLD,
            group: GROUP_LOOT,
            config: false,
            default: false,
            type: Boolean
        });
    }

    /**
     * 
     */
    static _registerTagsSettings() {
        game.settings.register(MODULE.ns, BRTCONFIG.TAGS.USE, {
            name: i18n('BRT.Settings.Tags.Use.Title'),
            hint: i18n('BRT.Settings.Tags.Use.Description'),
            scope: WORLD,
            group: GROUP_TAGS,
            config: true,
            default: true,
            type: Boolean
        });

        game.settings.register(MODULE.ns, BRTCONFIG.TAGS.DEFAULTS, {
            name: i18n('BRT.Settings.Tags.Default.Title'),
            hint: i18n('BRT.Settings.Tags.Default.Description'),
            scope: WORLD,
            group: GROUP_TAGS,
            config: false,
            default: {},
            type: Object
        });
    }
}

/**
 * A game settings configuration application
 * This form renders the settings defined via the game.settings.register API which have config = true
 *
 * @extends {FormApplication}
 */
class BetterRolltableSettingsConfig extends FormApplication {
    constructor() {
        super();
        this.moduleNamespace = MODULE.ns;
        this.app = null;

        return this;
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: i18n("BetterRolltables Advanced Settings"),
            id: "betterrolltables-settings",
            template: `${MODULE.path}/templates/config/settings.hbs`,
            width: 650,
            height: "auto",
            tabs: [
                { navSelector: ".tabs", contentSelector: ".content", initial: "general" }
            ]
        });
    }

    /** @override */
    getData(options) {
        /**
        * The settings assigned to this need a "group" that is either of these tabs.name
        */
        const data = {
            tabs: [
                { name: GROUP_DEFAULT, i18nName: "Base Settings", class: "fas fa-table", menus: [], settings: [] },
                { name: GROUP_UI, i18nName: "User Interface", class: "fas fa-cog", menus: [], settings: [] },
                { name: GROUP_LOOT, i18nName: "Loot", class: "fas fa-cog", menus: [], settings: [] },
                { name: GROUP_TAGS, i18nName: "Tags", class: "fas fa-tags", menus: [], settings: [] },
            ]
        };

        // Classify all settings
        for (let setting of game.settings.settings.values()) {
            // Only concerned about loot populator settings
            if (setting.module !== MODULE.ns) continue;

            // Exclude settings the user cannot change
            if (!game.user.isGM) continue;

            // Update setting data
            const s = duplicate(setting);
            s.name = i18n(s.name);
            s.hint = i18n(s.hint);
            s.value = game.settings.get(s.module, s.key);
            s.type = setting.type instanceof Function ? setting.type.name : "String";
            s.isCheckbox = setting.type === Boolean;
            s.isSelect = s.choices !== undefined;
            s.isRange = (setting.type === Number) && s.range;

            // Classify setting
            const name = s.module;
            if (name === MODULE.ns) {
                const group = s.group;
                let groupTab = data.tabs.find(tab => tab.name === group) ?? false;
                if (groupTab) {
                    groupTab.settings.push(s);
                }
            }
        }

        // Return data
        return {
            systemTitle: game.system.data.title,
            data: data
        };
    }

    /** @override */
    async _updateObject(event, formData) {
        event.preventDefault();
        formData = expandObject(formData)[MODULE.ns];
        for(let [k,v] of Object.entries(formData)){
          await game.settings.set(MODULE.ns, k, v);
        } 
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /** @override */
    async activateListeners(html) {
        if (!this.app) {
            this.app = document.getElementById("betterrolltables-settings");
        }

        super.activateListeners(html);

        html.find('.submenu button').click(this._onClickSubmenu.bind(this));
        html.find('button[name="reset"]').click(this._onResetDefaults.bind(this));
    }

    /**
     * Handle activating the button to configure User Role permissions
     * @param event {Event}   The initial button click event
     * @private
     */
    _onClickSubmenu(event) {
        event.preventDefault();
        const menu = game.settings.menus.get(event.currentTarget.dataset.key);
        if (!menu) return ui.notifications.error("No submenu found for the provided key");
        const app = new menu.type();
        return app.render(true);
    }

    /**
    * Handle button click to reset default settings
    * @param event {Event}   The initial button click event
    * @private
    */
    _onResetDefaults(event) {
        event.preventDefault();
        const resetOptions = event.currentTarget.form.querySelectorAll('.tab.active .settings-list [data-default]');
        for (let input of resetOptions) {
            if (input && input.type === "checkbox") input.checked = input.dataset.default;
            else if (input) input.value = input.dataset.default;
        }
    }
}

export const PATH = `modules/${MODULE.ns}`;