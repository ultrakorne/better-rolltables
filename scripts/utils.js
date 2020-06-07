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