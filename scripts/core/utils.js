export const i18n = (key) => game.i18n && game.i18n.localize(key)

export function addRollModeToChatData(chatData) {
    switch (game.settings.get("core", "rollMode")) {
        case "blindroll":
            chatData.blind = true;
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
            return await compendium.getEntity(entry._id);
        }
    }
}

export async function findInCompendiumById(compendiumName, entityId) {
    const compendium = game.packs.find(t => t.collection === compendiumName);
    if (compendium) {
        const compendiumIndex = await compendium.getIndex();
        let entry = compendiumIndex.find(e => e._id === entityId);
        if (entry) {
            return await compendium.getEntity(entry._id);
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
    }
}