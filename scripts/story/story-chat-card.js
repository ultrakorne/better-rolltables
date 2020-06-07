import { addRollModeToChatData } from '../utils.js';

export class StoryChatCard {
    constructor(story) {
        this.story = story;
    }

    createChatCard(cardFlavor) {
        let chatData = {
            flavor: cardFlavor,
            sound: "sounds/dice.wav",
            user: game.user._id,
            content: this.story
        }

        addRollModeToChatData(chatData);
        ChatMessage.create(chatData);
    }
}