import * as BRTHelper from './brt-helper.js';
import * as Utils from '../core/utils.js';
import { MODULE, BRTCONFIG } from './config.js';
import { addRollModeToChatData } from '../core/utils.js';

export class BRTBuilder {
	constructor(tableEntity) {
		this.table = tableEntity;
	}

	/**
	 *
	 * @param {*} rollsAmount
	 * @returns {array} results
	 */
	async betterRoll(rollsAmount = undefined) {
		this.mainRoll = undefined;
		rollsAmount = rollsAmount || (await BRTHelper.rollsAmount(this.table));
		this.results = await this.rollManyOnTable(rollsAmount, this.table);
		return this.results;
	}

	/**
	 *
	 * @param {array} results
	 */
	async createChatCard(results, rollMode = null) {
		let msgData = { roll: this.mainRoll, messageData: {} };
		if (rollMode) addRollModeToChatData(msgData.messageData, rollMode);
		await this.table.toMessage(results, msgData);
	}

	/**
	 *
	 * @param {number} amount
	 * @param {RollTable} table
	 * @param {object} options
	 *
	 * @returns {array}
	 */
	async rollManyOnTable(amount, table, { _depth = 0 } = {}) {
		const maxRecursions = 5;
		let msg = '';
		// Prevent infinite recursion
		if (_depth > maxRecursions) {
			let msg = game.i18n.format('BRT.Strings.Warnings.MaxRecursion', { maxRecursions: maxRecursions, tableId: table.id });
			throw new Error(MODULE.ns + ' | ' + msg);
		}

		let drawnResults = [];

		while (amount > 0) {
			let resultToDraw = amount;
			/** if we draw without replacement we need to reset the table once all entries are drawn */
			if (!table.replacement) {
				const resultsLeft = table.results.reduce(function (n, r) {
					return n + !r.drawn;
				}, 0);

				if (resultsLeft === 0) {
					await table.resetResults();
					continue;
				}

				resultToDraw = Math.min(resultsLeft, amount);
			}

			if (!table.formula) {
				let msg = game.i18n.format('BRT.RollTable.NoFormula', { name: table.name });
				ui.notifications.error(MODULE.ns + ' | ' + msg);
				return;
			}

			const draw = await table.drawMany(resultToDraw, { displayChat: false, recursive: false });
			if (!this.mainRoll) {
				this.mainRoll = draw.roll;
			}

			for (const entry of draw.results) {
				const formulaAmount = getProperty(entry, `flags.${BRTCONFIG.NAMESPACE}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`) || '';
				const entryAmount = await BRTHelper.tryRoll(formulaAmount);

				let innerTable;
				if (entry.type === CONST.TABLE_RESULT_TYPES.DOCUMENT && entry.documentCollection === 'RollTable') {
					innerTable = game.tables.get(entry.documentId);
				} else if (entry.type === CONST.TABLE_RESULT_TYPES.COMPENDIUM) {
					const entityInCompendium = await Utils.findInCompendiumByName(entry.documentCollection, entry.text);
					if (entityInCompendium !== undefined && entityInCompendium.documentName === 'RollTable') {
						innerTable = entityInCompendium;
					}
				}

				if (innerTable) {
					const innerResults = await this.rollManyOnTable(entryAmount, innerTable, { _depth: _depth + 1 });
					drawnResults = drawnResults.concat(innerResults);
				} else {
					for (let i = 0; i < entryAmount; i++) {
						drawnResults.push(entry);
					}
				}
			}
			amount -= resultToDraw;
		}

		return drawnResults;
	}
}
