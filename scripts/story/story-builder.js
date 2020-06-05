export class StoryBuilder {

    constructor(tableEntity) {
        this.table = tableEntity;
    }

    async drawStory() {
        const draw = await this.table.drawMany(1, { displayChat: false });

        for (const entry of draw.results) {
            console.log("draw roll ", entry);
            if (entry.collection == "JournalEntry") {

                const storyJournal = game.journal.get(entry.resultId);
                this.parseStoryDefinition(storyJournal.data.content);
            } else {
                ui.notifications.warn(`Entry for ${entry.compendium} not supported for type story`);
            }
        }
    }

    parseStoryDefinition(storyDefinition) {

        const PARSE_MODE = {
            NONE: 0,
            DEFINITION: 1,
            STORY: 2
        };
        /** remove html spaces */
        storyDefinition = storyDefinition.replace(/(&nbsp;|<br>)+/g, '');

        const lines = storyDefinition.split(/\r\n|\r|\n/);

        let parseMode = PARSE_MODE.DEFINITION;

        for (const line of lines) {
            // console.log("story line ", line);
            switch (parseMode) {
                case PARSE_MODE.DEFINITION:
                    let input = line;
                    let regex = /\s*<p>(.+)AS(.+)<\/p>/g;
                    let matches;
                    while (matches = regex.exec(input)) {

                        this.processDefinition(matches[1], matches[2]);

                    }
                    break;
            }

        }
    }

    processDefinition(defValue, definitionName) {

        console.log("value ", defValue);

        const match = /{ *([^}]*?) *}/.exec(definitionName);
        if(!match) {
            ui.notification.error(`definition error, ${definitionName} is malformed. After keyword AS we expect a name in brackets {}`)
            return;
        }
        const definition = match[1];
        console.log("definition ", definition);

        const regexIF = /IF\s*\((.+)\)/;
        const regexTable = /\s*@RollTable\[ *([^\]]*?) *\]{ *([^}]*?) *}/;
        const regexRoll = /\s*\[\[ *([^\]]*?) *\]\]/;
    }
}