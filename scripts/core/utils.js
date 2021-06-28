export const i18n = (key) => game.i18n && game.i18n.localize(key);

export function addRollModeToChatData(chatData) {
    switch (game.settings.get("core", "rollMode")) {
        case "blindroll":
            chatData.blind = true;
            // no break needed, if so please change this comment ?
        case "gmroll":
            chatData.whisper = [game.users.find(u => u.isGM).id];
            break;
        case "selfroll":
            chatData.whisper = [game.userId];
            break;
    }
}

export async function findInCompendiumByName(compendiumName, entityName) {
    const compendium = game.packs.find(t => t.collection === compendiumName);
    if (compendium) {
        const compendiumIndex = await compendium.getIndex();
        let entry = compendiumIndex.find(e => e.name === entityName);
        if (entry) {
            return await compendium.getDocument(entry._id);
        }
    }
}

export async function findInCompendiumById(compendiumName, entityId) {
    const compendium = game.packs.find(t => t.collection === compendiumName);
    if (compendium) {
        const compendiumIndex = await compendium.getIndex();
        let entry = compendiumIndex.find(e => e._id === entityId);
        if (entry) {
            return await compendium.getDocument(entry._id);
        }
    }
}

export function separateIdComendiumName(stringWithComendium) {
    const split = stringWithComendium.split(".");
    const nameOrId = split.pop().trim();
    const compendiumName = split.join('.').trim();
    return {
        nameOrId: nameOrId,
        compendiumName: compendiumName
    };
}

/**
 * 
 * @param {object} item reference to item
 * @returns {object|boolean} item from compendium
 */
 export async function getItemFromCompendium(item) {
    const itemCompendium = game.packs.find(t => t.collection === item.collection);
    if (itemCompendium) {
        let indexes = await itemCompendium.getIndex(),
            entry = indexes.find(e => e.name.toLowerCase() === item.text.toLowerCase());
            
        if (entry) { //since the data from buildItemData could have been changed (e.g. the name of the scroll item that was coming from a compendium originally, entry can be undefined)
            const itemEntity = await itemCompendium.getDocument(entry._id);

            return duplicate(itemEntity.data);
        }
    }

    return false;
}