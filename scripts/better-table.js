// console.log("Hello World! Better roll table");
CONFIG.debug.hooks = true;

Hooks.on("init", function () {
  console.log("BRT: This code runs once the Foundry VTT software begins it's initialization workflow.");
});

Hooks.on("ready", function () {
  console.log("BRT: This code runs once core initialization is ready and game data is available.");
});

class BetterRT {
  static async enhanceRollTableView(rollTableConfig, html, rollTable) {
    console.log("enhanceRollTableView");
    console.log("rollTableConfig ", rollTableConfig);
    console.log("html ", html[0]);
    console.log("rollTable ", rollTable);

    const tableClassName = rollTable.cssClass;// "editable";
    const tableEntity = rollTable.entity;
    let tableViewClass = html[0].getElementsByClassName(tableClassName)[0];
    if (tableViewClass) {
      html[0].style.display = 'none';
      html[0].style.display = 'block';
      // html[0].style.resize = "vertical";
    }

    // console.log("tableViewClass ", htmlclass[0].getElementsByClassName("editable"));
    if (!tableViewClass) { //when the table is updated, the html is different
      if (html[0].getAttribute("class") === tableClassName) {
        tableViewClass = html[0];
      } else {
        console.log(`cannot find table class element ${tableClassName}`);
      }
    }
    console.log("my class ", html[0].getAttribute("class"));

    let divBetterTableType;
    //divBetterTableType = await renderTemplate("modules/better-rolltables/templates/select-table-type.html");
    //console.log("divBetterTableType ", divBetterTableType);

    divBetterTableType = document.createElement("div");
    divBetterTableType.setAttribute("class", "form-group");
    divBetterTableType.setAttribute("id", "BTR-div");

    // let selectTypeHtml = await renderTemplate("modules/better-rolltables/templates/select-table-type.html")
    // divBetterTableType.innerHTML = selectTypeHtml;
    divBetterTableType.innerHTML = `<label>Advanced Table Type</label>
      <select id="BTR-select-type" name="BTR-select-type">
          <option value="none"></option>
          <option value="loot">Loot Table</option>
      </select>`;


    tableViewClass.insertBefore(divBetterTableType, tableViewClass.children[2]);

    const selectTypeElement = divBetterTableType.getElementsByTagName("select")[0];
    console.log("selectTypeElement ", selectTypeElement);
    selectTypeElement.onchange = () => { BetterRT.onOptionTypeChanged(selectTypeElement.value, tableEntity); };


    //create generate loot button
    const footer = html[0].getElementsByClassName("sheet-footer flexrow")[0];
    console.log("footer ", footer);

    let generateLootBtn;
    console.log("adding button");
    generateLootBtn = document.createElement("button");
    generateLootBtn.setAttribute("class", "generate");
    generateLootBtn.setAttribute("type", "button");
    generateLootBtn.innerHTML = `<i id="BRT-gen-loot" class="fas fa-coins"></i> Generate Loot`;
    generateLootBtn.onclick = () => { BetterRT.generateLoot(tableEntity); };
    footer.insertBefore(generateLootBtn, footer.firstChild);

  }

  static generateLoot(tableEntity) {
    console.log("Generate Loot button clicked ", tableEntity);
  }

  static onOptionTypeChanged(value, tableEntity) {
    console.log("onOptionTypeChanged ", value, " + ", tableEntity);
  }

}

Hooks.on("renderRollTableConfig", BetterRT.enhanceRollTableView);