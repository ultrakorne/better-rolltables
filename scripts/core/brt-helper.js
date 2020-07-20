import { BRTCONFIG } from './config.js';

/**
 * when dropping a link entity on a rolltable if the drop is a tableResult, we assign the dropped entity to that result table.
 * If the drop happens in another part of the tableview we create a new table result 
 * @param {event} event 
 * @param {RollTable} table the rolltable the event is called on
 */
export async function dropEventOnTable(event, table) {
    // console.log("EVENT ", event);
    let data;
    try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
        console.log("no entity dropped");
        return;
    }

    const targetName = event.target.name;

    let resultIndex = -1;
    /** dropping on a table result line the target will be results.2.type, results.2.collection, results.2.text*/
    let isString = targetName && typeof targetName.startsWith === "function";

    /** brt.x.formula is the input text field added by brt to have 1 formula added per table row */
    if (isString && (targetName.startsWith("results.") || targetName.startsWith("brt."))) {
        const splitString = targetName.split(".");
        if (splitString.length > 1) {
            resultIndex = Number(splitString[1]);
        }
    }

    let resultTableData = {};
    if (resultIndex >= 0) {
        resultTableData._id = table.results[resultIndex]._id;
    }
    let entityToLink;

    if (data.pack) {
        resultTableData.type = 2;
        resultTableData.collection = data.pack;

        const compendium = game.packs.find(t => t.collection === data.pack);
        if (compendium) {
            let indexes = await compendium.getIndex();
            let entry = indexes.find(e => e._id === data.id);

            if (entry) { //since the data from buildItemData could have been changed (e.g. the name of the scroll item that was coming from a compendium originally, entry can be undefined)
                entityToLink = await compendium.getEntity(entry._id);
            }
        }
    } else {
        resultTableData.type = 1;
        resultTableData.collection = data.type;

        switch (data.type) {
            case "RollTable":
                entityToLink = game.tables.get(data.id);
                break;
            case "Actor":
                entityToLink = game.actors.get(data.id);
                break;
            case "Item":
                entityToLink = game.items.get(data.id);
                break;
            case "JournalEntry":
                entityToLink = game.journal.get(data.id);
                break;
            case "Playlist":
                entityToLink = game.playlists.get(data.id);
                break;
            case "Scene":
                entityToLink = game.scenes.get(data.id);
                break;
            case "Macro":
                entityToLink = game.macros.get(data.id);
                break;
        }
    }

    if (entityToLink) {
        resultTableData.text = entityToLink.name;
        resultTableData.img = entityToLink.img;
    } else {
        ui.notifications.error(`Item of type ${data.type} or Embedded items not supported`);
        return;
    }

    if (resultTableData._id) {
        table.updateEmbeddedEntity("TableResult", resultTableData);
    } else {
        /**create a new embedded entity if we dropped the entity on the sheet but not on a specific result */
        const lastTableResult = table.results[table.results.length - 1];
        if (lastTableResult) {
            const rangeLenght = lastTableResult.range[1] - lastTableResult.range[0]
            resultTableData.weight = lastTableResult.weight;
            resultTableData.range = [lastTableResult.range[1], lastTableResult.range[1] + rangeLenght];
        } else {
            resultTableData.weight = 1;
            resultTableData.range = [1, 1];
        }
        table.createEmbeddedEntity("TableResult", resultTableData);
    }
}

export function tryRoll(rollFormula) {
    try {
        return new Roll(rollFormula).roll().total || 1;
    } catch (error) {
        return 1;
    }
}

/**
 * we can provide a formula on how many times we roll on the table.
 * @returns {Number} how many times to roll on this table
 */
export function rollsAmount(table) {
    const rollFormula = table.getFlag(BRTCONFIG.NAMESPACE, BRTCONFIG.ROLLS_AMOUNT_KEY);
    return tryRoll(rollFormula);
}