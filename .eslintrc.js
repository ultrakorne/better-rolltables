module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  globals: {
    CONST: 'readonly',
    CONFIG: 'readonly',
    game: 'readonly',
    canvas: 'readonly',
    Hooks: 'readonly',
    $: 'readonly',
    ui: 'readonly',
    Roll: 'readonly',
    ChatMessage: 'readonly',
    RollTable: 'readonly',
    Folder: 'readonly',
    Actor: 'readonly',
    Item: 'readonly',
    renderTemplate: 'readonly',
    duplicate: 'readonly',
    mergeObject: 'readonly',
    getComputedStyle: 'readonly',
    getProperty: 'readonly',
    setProperty: 'readonly',
    Handlebars: 'readonly',
    Dialog: 'readonly',
    hasProperty: 'readonly',
    RollTableConfig: 'readonly',
    Token: 'readonly',
    Application: 'readonly'
  },
  rules: {
  }
}
