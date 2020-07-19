import { BRTCONFIG } from '../core/config.js';

export class LootManipulator
{
    async _getSpellCompendiumIndex() {
        const spellCompendiumName = game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.SPELL_COMPENDIUM_KEY);
        const spellCompendiumIndex = await game.packs.find(t => t.collection === spellCompendiumName).getIndex();

        for (var i = 0; i < spellCompendiumIndex.length; i++) {
            if(!this.rndSpellIdx) {
                this.rndSpellIdx = [];
            }
            this.rndSpellIdx[i] = i;
        }
        this.rndSpellIdx.sort(() => Math.random() - 0.5);
        return spellCompendiumIndex;
    }

    async preItemCreationDataManipulation(itemData) {
        // const match = BRTCONFIG.SCROLL_REGEX.exec(itemData.name);
        let match = /\s*Spell\s*Scroll\s*(\d+|cantrip)/gi.exec(itemData.name);

        if (!match) {
            //pf2e temporary FIXME add this in a proper config
            match = /\s*Scroll\s*of\s*(\d+)/gi.exec(itemData.name);
        }

        if (!match) {
            // console.log("not a SCROLL ", itemData.name);
            // console.log("match ",match);
            return itemData; //not a scroll
        }

        //if its a scorll then open compendium
        let level = match[1].toLowerCase() === "cantrip" ? 0 : match[1];

        const spellCompendiumName = game.settings.get(BRTCONFIG.NAMESPACE, BRTCONFIG.SPELL_COMPENDIUM_KEY);
        const compendium = game.packs.find(t => t.collection === spellCompendiumName);
        if (!compendium) {
            console.log(`Spell Compendium ${spellCompendiumName} not found`);
            return itemData;
        }
        let index = await this._getSpellCompendiumIndex();

        let spellFound = false;
        let itemEntity;

        while (this.rndSpellIdx.length > 0 && !spellFound) {

            let rnd = this.rndSpellIdx.pop();
            let entry = await compendium.getEntity(index[rnd]._id);
            const spellLevel = getProperty(entry.data, BRTCONFIG.SPELL_LEVEL_PATH);
            if (spellLevel == level) {
                itemEntity = entry;
                spellFound = true;
            }
        }

        if (!itemEntity) {
            ui.notifications.warn(`no spell of level ${level} found in compendium  ${spellCompendiumName} `);
            return itemData;
        }

        //make the name shorter by removing some text
        itemData.name = itemData.name.replace(/^(Spell\s)/, "");
        itemData.name = itemData.name.replace(/(Cantrip\sLevel)/, "Cantrip");
        itemData.name += ` (${itemEntity.data.name})`
        return itemData;
    }
}