import { i18n } from './core/utils.js';
import { MODULE, BRTCONFIG } from './core/config.js';

export class BetterRT {
	static _calcHeight(element) {
		const style = getComputedStyle(element.parentElement),
			height = parseInt(style.height.slice(0, -2)),
			marginTop = parseInt(style.marginTop.slice(0, -2)),
			marginBottom = parseInt(style.marginBottom.slice(0, -2)),
			paddingTop = parseInt(style.paddingTop.slice(0, -2)),
			paddingBottom = parseInt(style.paddingBottom.slice(0, -2)),
			borderTop = parseInt(style.borderTop.slice(0, -2)),
			borderBottom = parseInt(style.borderBottom.slice(0, -2));

		return height + marginTop + marginBottom + paddingTop + paddingBottom + borderTop + borderBottom;
	}

	static async enhanceRollTableView(rollTableConfig, html, rollTable) {
		const tableClassName = rollTable.cssClass,
			tableEntity = rollTableConfig.object,
			selectedTableType = tableEntity.getFlag(MODULE.ns, BRTCONFIG.TABLE_TYPE_KEY) || BRTCONFIG.TABLE_TYPE_NONE,
			app = document.querySelector(`[data-appid="${rollTableConfig.appId}"]`),
			tableViewClass = app.getElementsByClassName(tableClassName)[0],
			headerElement = document.createElement('header'),
			brtData = duplicate(tableEntity.flags);

		headerElement.classList.add('configuration');
		brtData.disabled = !rollTable.editable;

		let renderedExtraConfig = await renderTemplate('modules/better-rolltables/templates/select-table-type.hbs', brtData);
		headerElement.insertAdjacentHTML('beforeend', renderedExtraConfig);

		let headerElements = app.querySelectorAll('form > .form-group');
		Array.prototype.forEach.call(headerElements, function (node) {
			headerElement.querySelector('main').appendChild(node);
		});

		tableViewClass.insertBefore(headerElement, tableViewClass.children[1]);

		const selectTypeElement = headerElement.getElementsByTagName('select')[0];
		selectTypeElement.onchange = async function () {
			await BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity);
		};

		//enable togglers
		_enableTogglers();

		/** If we use default table, we stop here */
		if (selectedTableType === BRTCONFIG.TABLE_TYPE_NONE) return;

		/** for every result, add an input field before the text to add a formula */
		if (selectedTableType === BRTCONFIG.TABLE_TYPE_BETTER || selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {
			BetterRT.ShowFormulaField(tableViewClass, tableEntity, rollTable.editable);
		}

		BetterRT.Tags('.tagger', 'input[name="flags.better-rolltables.tags"]');

		const footer = app.querySelector('.sheet-footer.flexrow'),
			newRollButton = BetterRT.replaceRollButton(footer);

		/** change footer with new click event on rolls */
		if (selectedTableType === BRTCONFIG.TABLE_TYPE_LOOT) {
			newRollButton.getElementsByTagName('i')[0].className = 'fas fa-gem';
			newRollButton.onclick = async function () {
				await game.betterTables.generateChatLoot(tableEntity);
			};

			/** Create additional Button to Generate Loot */
			await BetterRT.showGenerateLootButton(footer, tableEntity);

			/** Hide the element with displayRoll checkbox */
			const inputElements = html[0].getElementsByTagName('input');
			const displayRollElement = inputElements.namedItem('displayRoll').parentElement;
			displayRollElement.remove();
		} else if (selectedTableType === BRTCONFIG.TABLE_TYPE_STORY) {
			newRollButton.getElementsByTagName('i')[0].className = 'fas fa-book';
			newRollButton.onclick = async function () {
				await game.betterTables.generateChatStory(tableEntity);
			};
		} else if (selectedTableType === BRTCONFIG.TABLE_TYPE_BETTER) {
			// newRollButton.getElementsByTagName("i")[0].className = "fas fa-dice";
			newRollButton.innerHTML = '<i class ="fas fa-dice-d20"></i> Roll+';
			newRollButton.onclick = async function () {
				await game.betterTables.betterTableRoll(tableEntity);
			};
		}

		function _enableTogglers() {
			headerElement.querySelectorAll('.toggler').forEach(async (e) => {
				e.addEventListener('click', async (e) => {
					const toggleIconElement = e.currentTarget.querySelector('.toggleicon');
					e.currentTarget.nextElementSibling.classList.toggle('brt-hidden');
					['fa-expand-alt', 'fa-compress-alt'].map((c) => toggleIconElement.classList.toggle(c));
				});
			});
		}
	}

	/**
	 * Injecting for each result row (beside a text result) a field formula to roll multiple times on multiple row table
	 */
	static ShowFormulaField(tableViewClass, tableEntity, editable) {
		const tableResultsHTML = tableViewClass.getElementsByClassName('table-result');
		let index = 0;
		for (const resultHTML of tableResultsHTML) {
			const resultId = resultHTML.getAttribute('data-result-id');
			if (resultId) {
				const tableResult = tableEntity.results.get(resultId);
				const detailsHTML = resultHTML.getElementsByClassName('result-details')[0];
				const inputsHTML = detailsHTML.getElementsByTagName('input');

				for (const tableText of inputsHTML) {
					if (tableText.getAttribute('type') === 'text') {
						/** tableText is for each row the text of the table */
						const formulaInput = document.createElement('input');

						formulaInput.classList.add('result-brt-formula');
						formulaInput.placeholder = i18n('BRT.Formula');
						formulaInput.type = 'text';
						formulaInput.disabled = !editable;
						/** based on the name of the elents the value will be added in the preUpdateRollTable and override the table.data */
						formulaInput.name = `results.${index}.flags.${MODULE.ns}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`;
						if (tableText.classList.contains('result-target')) {
							formulaInput.value = getProperty(tableResult, `flags.${MODULE.ns}.${BRTCONFIG.RESULTS_FORMULA_KEY}.formula`) || '';
							tableText.classList.add('result-target-short');
						} else {
							/** text type result, we disable the formula field for text */
							formulaInput.value = '';
							formulaInput.hidden = true;
							// tableText.classList.add("result-target-mid");
						}
						detailsHTML.insertBefore(formulaInput, tableText);
						break;
					}
				}
				index++;
			}
		}
	}

	static Tags(element, dataCarrier, listOfTags) {
		let DOMParent = document.querySelector(element),
			DOMList,
			DOMInput,
			DOMHiddenInput = document.querySelector(dataCarrier),
			arrayOfList = listOfTags || DOMHiddenInput.value.split(',').filter((tag) => tag !== '');

		function DOMCreate() {
			const ul = document.createElement('ul'),
				//li = document.createElement('li'),
				input = document.createElement('input');
			DOMParent.appendChild(ul);
			DOMParent.appendChild(input);
			DOMList = DOMParent.firstElementChild;
			DOMInput = DOMParent.lastElementChild;
		}

		function DOMRender() {
			// clear the entire <li> inside <ul>
			DOMList.innerHTML = '';

			// render each <li> to <ul>
			arrayOfList.forEach(function (currentValue, index) {
				var li = document.createElement('li');
				li.innerHTML = ''.concat(currentValue, ' <a>&times;</a>');
				li.dataset.value = currentValue;
				li.querySelector('a').addEventListener('click', async (e) => {
					let regStr = '(' + e.currentTarget.parentNode.dataset.value + '\\,*)';
					let replace = new RegExp(regStr, 'gm');
					DOMHiddenInput.value = DOMHiddenInput.value.replace(replace, '').trim(',');
					e.currentTarget.parentNode.remove();
				});
				DOMList.appendChild(li);
			});
		}

		function onKeyUp() {
			DOMInput.addEventListener('keyup', function (event) {
				event.preventDefault();
				const text = this.value.trim(),
					sepperator = ',',
					keycodes = [13, 32];

				if (text.includes(sepperator) || keycodes.includes(event.keyCode)) {
					const inputText = text.replace(sepperator, '');
					// check if empty text
					if (inputText != '' && DOMHiddenInput.value.indexOf(inputText) < 0) {
						// push to array and remove ','
						DOMHiddenInput.value += inputText + ',';
						arrayOfList.push(inputText);
					} // clear input
					this.value = '';
				} else {
					return;
				}

				DOMRender();
			});
		}

		function onDelete(id) {
			arrayOfList = arrayOfList.filter(function (currentValue, index) {
				if (index == id) {
					return false;
				}

				return currentValue;
			});
			DOMRender();
		}

		DOMCreate();
		DOMRender();
		onKeyUp();
	}

	/**
	 *
	 * @param {document} footer
	 * @returns
	 */
	static replaceRollButton(footer) {
		const rollButton = footer.querySelector('.roll');
		// remove the default listener by cloning the button
		const rollButtonClone = rollButton.cloneNode(true);
		rollButton.parentNode.replaceChild(rollButtonClone, rollButton);
		return rollButtonClone;
	}

	/**
	 *
	 * @param {HTMLElement} htmlElement
	 * @param {RollTable} tableEntity
	 */
	static async showGenerateLootButton(htmlElement, tableEntity) {
		const generateLootBtn = document.createElement('button');

		generateLootBtn.setAttribute('class', 'generate');
		generateLootBtn.setAttribute('type', 'button');

		generateLootBtn.innerHTML = `<i id="BRT-gen-loot" class="fas fa-coins"></i> ${i18n('BRT.Buttons.GenerateLoot')}`;
		generateLootBtn.onclick = async () => await game.betterTables.generateLoot(tableEntity);

		htmlElement.insertBefore(generateLootBtn, htmlElement.firstChild);
	}

	static async onOptionTypeChanged(value, tableEntity) {
		// console.log("onOptionTypeChanged");
		// console.log(tableEntity);
		await tableEntity.setFlag(MODULE.ns, BRTCONFIG.TABLE_TYPE_KEY, value);
	}
}
