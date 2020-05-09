console.log("Hello World! Better roll table");

Hooks.on("init", function() {
  console.log("BRT: This code runs once the Foundry VTT software begins it's initialization workflow.");
});

Hooks.on("ready", function() {
  console.log("BRT: This code runs once core initialization is ready and game data is available.");
});