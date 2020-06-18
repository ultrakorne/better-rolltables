
export async function drawMany(number, { roll = null, displayChat = true, rollMode = null, expandInnerTables = true } = {}) {
    let results = [];
    let updates = [];
    const rolls = [];

    this.roll = _roll;
    // Roll the requested number of times, marking results as drawn
    for (let n = 0; n < number; n++) {
        let draw = this.roll({ roll, expandInnerTables });
        rolls.push(draw.roll);
        results = results.concat(draw.results);
        if (!this.data.replacement) {
            updates = updates.concat(draw.results.map(r => {
                r.drawn = true;
                return { _id: r._id, drawn: true };
            }));
        }
    }

    // Add all rolls to a Dice Pool
    const pool = new DicePool(rolls).roll();

    // Construct a "synthetic" roll object using the pool - this is a bit hacky
    roll = new Roll(`{${pool.dice.map(d => d.formula).join(",")}}`);
    roll.parts = [pool];
    roll._dice = pool.dice;
    roll._result = pool.total.toString();
    roll._total = pool.total;
    roll._rolled = true;

    // Commit results as drawn
    if (updates.length && !this.compendium) {
        await this.updateEmbeddedEntity("TableResult", updates, { diff: false });
    }

    // Forward drawn results to create chat messages
    if (displayChat) {
        await this.toMessage(results, {
            roll: this.data.displayRoll && roll ? roll : null,
            messageOptions: { rollMode: rollMode }
        });
    }

    // Return the Roll and the array of results
    return { roll, results };
}

function _roll({ roll, _depth = 0, expandInnerTables = true } = {}) {

    // Prevent excessive recursion
    if (_depth > 5) {
        throw new Error(`Maximum recursion depth exceeded when attempting to draw from RollTable ${this._id}`);
    }

    // Reference the provided roll formula
    roll = roll instanceof Roll ? roll : new Roll(this.data.formula);
    let results = [];

    // Ensure that at least one non-drawn result remains
    const available = this.data.results.filter(r => !r.drawn);
    if (!this.data.formula || !available.length) {
        ui.notifications.warn("There are no available results which can be drawn from this table.");
        return { roll, results };
    }

    // Ensure that results are available within the minimum/maximum range
    const minRoll = Roll.minimize(this.data.formula).total;
    const maxRoll = Roll.maximize(this.data.formula).total;
    const availableRange = available.reduce((range, result) => {
        if (!range[0] || (result.range[0] < range[0])) range[0] = result.range[0];
        if (!range[1] || (result.range[1] > range[1])) range[1] = result.range[1];
        return range;
    }, [null, null]);
    if ((availableRange[0] > maxRoll) || (availableRange[1] < minRoll)) {
        ui.notifications.warn("No results can possibly be drawn from this table and formula.");
        return { roll, results };
    }

    // Continue rolling until one or more results are recovered
    let iter = 0;
    while (!results.length) {
        if (iter >= 10000) {
            ui.notifications.error(`Failed to draw an available entry from Table ${this.name}, maximum iteration reached`);
            break;
        }
        roll = roll.reroll();
        results = this._getResultsForRoll(roll.total);
        iter++;
    }

    // Draw results recursively from any inner Roll Tables
    results = results.reduce((results, r) => {
        if ((r.type === CONST.TABLE_RESULT_TYPES.ENTITY) && (r.collection === "RollTable") && expandInnerTables) {
            const innerTable = game.tables.get(r.resultId);
            if (innerTable) {
                let innerRoll = innerTable.roll({ _depth: _depth + 1 });
                return results.concat(innerRoll.results);
            }
        }
        results.push(r);
        return results;
    }, []);

    // Return the Roll and the results
    return { roll, results }
}