# Spell Operator — Game-wide Specification

This file is the implementation-facing mirror of confirmed game-wide specifications. Canonical design decisions are stored in the Spell Operator Notion databases.

## Field controls

- Movement: Arrow keys / WASD.
- `Z`: interact / confirm / back behavior where defined.
- `Enter`: field menu / close menu behavior where defined.
- `X`: start plug-in access to Lumiere.
- Story overlays, dialogs, and open menus keep priority over normal field shortcuts.

## Field dialog text

- Field dialog text is displayed one character at a time by default rather than appearing all at once.
- The default interval is `30 ms` per grapheme/visible character.
- While a line is still typing, pressing `Z` finishes that line first. A subsequent `Z` performs the normal dialog advance/close action.
- Dialog timing can be customized per line with a `typing` object passed to `SpellField.showDialog()`.
- Supported `typing` options:
  - `charMs`: milliseconds between characters.
  - `startDelayMs`: delay before the first character appears.
  - `pauses`: timed pauses such as `[{at: 8, ms: 500}]`, meaning pause for 500 ms after 8 characters.
  - `stopAt`: one character index or an array of indexes where rendering pauses indefinitely. Continue with `SpellDialogTyping.resume()`.
  - `allowSkip`: when `false`, `Z` cannot force the rest of the line to appear while it is typing.
  - `instant`: when `true`, bypass character-by-character rendering for that line. `typing: false` is also treated as instant display.
- Global defaults can be adjusted with `SpellDialogTyping.configureDefaults()`.
- `SpellDialogTyping.prepare()` can configure the next dialog when a caller cannot pass a `typing` object directly.

Example:

```js
SpellField.showDialog({
  speaker: "sophie",
  text: "ゆっくり……ここで少し止める。",
  typing: {
    charMs: 70,
    startDelayMs: 300,
    pauses: [{at: 5, ms: 800}],
    stopAt: 10,
    allowSkip: false
  }
});

// Later, when the演出 should continue:
SpellDialogTyping.resume();
```

## Character portraits

- Sophie and Lumiere use square character portraits in dialogue UI.
- Portraits are selected by a character ID plus an expression ID.
- The default expression ID is `neutral`.
- If a requested expression is not registered, the character's `neutral` portrait is used as the fallback.
- Portrait assets follow `assets/characters/portraits/<character>/<expression>.jpg`.
- Current neutral portraits are:
  - `assets/characters/portraits/sophie/neutral.jpg`
  - `assets/characters/portraits/lumiere/neutral.jpg`
- `SpellField.showDialog()` accepts an optional `expression` property. Existing dialogue that omits it uses `neutral`.
- Additional expressions can be registered without changing the dialogue layout through `SpellPortraits.register(character, expression, src)`.
- `SpellPortraits.prepare(expression)` can prepare an expression for the next field-dialog portrait update when existing internal field code invokes its local dialog function directly.

## Plug-in

- "Plug-in" means Sophie connects to the computer inside Lumiere so Sophie can write programs into Lumiere.
- From the normal field, pressing `X` starts plug-in access.
- Pressing `X` does not immediately change screens. Sophie first says exactly: `プラグイン！ルミエル.EXE トランスミッション！` in the field dialog.
- The plug-in line uses the normal field-dialog character-by-character rendering.
- After the plug-in line has finished rendering, pressing `Z` closes the dialog and opens the programming computer screen.
- If `Z` is pressed before the plug-in line finishes rendering, that press only finishes the line; the next `Z` opens the programming computer screen.
- Existing programming and spell-testing behavior is reused; this specification changes the field entry sequence, not the Python runtime or spell-test rules.
