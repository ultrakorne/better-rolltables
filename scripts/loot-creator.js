
export class LootCreator {

    constructor(lootData) {
        this.loot = lootData;
    }

    async createActor(){
        
        console.log("createActor ");
        let actor = await Actor.create({
            name: "New Loot",
            type: "npc",
            img: "modules/better-rolltables/artwork/chest.png",
            sort: 12000,
          });

          if ( "dnd5e.LootSheet5eNPC" in CONFIG.Actor.sheetClasses.npc ) {
            actor.setFlag("core", "sheetClass", "dnd5e.LootSheet5eNPC");
          }
    }
}