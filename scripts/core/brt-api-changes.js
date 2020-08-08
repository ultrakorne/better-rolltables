
export async function drawMany(number, {roll=null, displayChat=true, rollMode=null, recursive = true }={}) {
    let results = [];
    let updates = [];
    const rolls = [];

    // Roll the requested number of times, marking results as drawn
    for ( let n=0; n<number; n++ ) {
      let draw = this.roll({roll, recursive});
      rolls.push(draw.roll);
      results = results.concat(draw.results);

      // Mark results as drawn, if replacement is not used and we are not in a Compendium pack
      if ( !this.data.replacement && !this.compendium) {
        updates = updates.concat(draw.results.map(r => {
          r.drawn = true;
          return {_id: r._id, drawn: true};
        }));
      }
    }

    // Add all rolls to a Dice Pool
    const pool = new DicePool({rolls}).evaluate();

    // Construct a "synthetic" roll object using the pool - this is a bit hacky
    roll = new Roll(`{${pool.dice.map(d => d.formula).join(",")}}`);
    roll.terms = [pool];
    roll._dice = pool.dice;
    roll.results = [pool.total];
    roll._total = pool.total;
    roll._rolled = true;

    // Commit updates to child results
    if ( updates.length ) {
      await this.updateEmbeddedEntity("TableResult", updates, {diff: false});
    }

    // Forward drawn results to create chat messages
    if ( displayChat ) {
      await this.toMessage(results, {
        roll: this.data.displayRoll && roll ? roll : null,
        messageOptions: {rollMode}
      });
    }

    // Return the Roll and the array of results
    return {roll, results};
  }