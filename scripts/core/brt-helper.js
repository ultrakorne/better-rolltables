import { MODULE , BRTCONFIG } from './config.js'

/**
 * when dropping a link entity on a rolltable if the drop is a tableResult, we assign the dropped entity to that result table.
 * If the drop happens in another part of the tableview we create a new table result
 * @param {event} event
 * @param {RollTable} table the rolltable the event is called on
 */
export async function dropEventOnTable (event, table) {
  // console.log("EVENT ", event);
  try {
    JSON.parse(event.dataTransfer.getData('text/plain'))
  } catch (err) {
    console.log('no entity dropped')
    return
  }

  const targetName = event.target.name

  let resultIndex = -1
  /** dropping on a table result line the target will be results.2.type, results.2.collection, results.2.text */
  const isString = targetName && typeof targetName.startsWith === 'function'

  /** brt.x.formula is the input text field added by brt to have 1 formula added per table row */
  if (isString && (targetName.startsWith('results.') || targetName.startsWith('brt.'))) {
    const splitString = targetName.split('.')
    if (splitString.length > 1) {
      resultIndex = Number(splitString[1])
    }
  }

  const resultTableData = {}
  if (resultIndex >= 0) {
    resultTableData._id = table.results[resultIndex]._id
  }

  if (resultTableData._id) {
    table.updateEmbeddedEntity('TableResult', resultTableData)
  } else {
    /** create a new embedded entity if we dropped the entity on the sheet but not on a specific result */
    const lastTableResult = table.results[table.results.length - 1]
    if (lastTableResult) {
      const rangeLenght = lastTableResult.range[1] - lastTableResult.range[0]
      resultTableData.weight = lastTableResult.weight
      resultTableData.range = [lastTableResult.range[1], lastTableResult.range[1] + rangeLenght]
    } else {
      resultTableData.weight = 1
      resultTableData.range = [1, 1]
    }
    table.createEmbeddedEntity('TableResult', resultTableData)
  }
}

export async function tryRoll (rollFormula) {
  try {
    return (await (new Roll(rollFormula)).roll({ async: true })).total || 1;
  } catch (error) {
    return 1;
  }
}

/**
 * we can provide a formula on how many times we roll on the table.
 * @returns {Number} how many times to roll on this table
 */
export async function rollsAmount (table) {
  const rollFormula = table.getFlag(MODULE.ns, BRTCONFIG.ROLLS_AMOUNT_KEY);
  return tryRoll(rollFormula);
}
