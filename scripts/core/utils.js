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
    const compendium = game.packs.get(compendiumName);
    if (compendium) {
        const entry = compendium.index.getName(entityName);
        if (entry) {
            return await compendium.getDocument(entry._id);
        }
    }
}

export async function findInCompendiumById(compendiumName, entityId) {
    return await game.packs.get(compendiumName)?.getDocument(entityId);
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
     return findInCompendiumByName(item.collection, item.text);
}