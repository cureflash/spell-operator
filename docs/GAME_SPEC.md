# Spell Operator — Game-wide Specification

This file is the implementation-facing mirror of confirmed game-wide specifications. Canonical design decisions are stored in the Spell Operator Notion databases.

## Field controls

- Movement: Arrow keys / WASD.
- `Z`: interact / confirm / back behavior where defined.
- `Enter`: field menu / close menu behavior where defined.
- `X`: start plug-in access to Lumiere.
- Story overlays, dialogs, and open menus keep priority over normal field shortcuts.

## Game screen scrolling policy

- Normal gameplay screens must not require browser/page scrolling to use them.
- The primary information and controls required on each screen must fit within the current viewport.
- If a screen would otherwise exceed the viewport, redesign the layout, adjust density, or use tabs/page switching rather than requiring whole-screen scrolling.
- The grimoire screen shown after plug-in is subject to this policy.
- This rule is being documented now; the grimoire screen implementation is intentionally not changed yet.

## World place names

- The canonical name of the first village is `フルール村`.
- Its existing internal map ID remains `town`; renaming the place does not change save data or map-transition IDs.
- The Kyoto-inspired future city uses the provisional name `キョウトシティ`; its reserved internal map ID is `kyoto_city`.
- `ラメールシティ` uses the reserved internal map ID `la_mer_city`.
- Generic wording such as `町へ` may still be used for direction markers when it is functioning as a category/destination description rather than the proper place name.

## Fast travel / イードウ

- The field menu contains the command `イードウ`.
- `イードウ` is the game-wide fast-travel command, analogous to Pokémon's Fly or Dragon Quest's Zoom.
- Choosing `イードウ` replaces the main menu list with a destination list.
- The destination list uses `↑/↓` for selection and `Z` to warp. `Enter` or `Escape` returns to the main field menu without moving.
- At the current implementation stage, the destination list contains `フルール村` and `ラメールシティ`.
- Selecting `フルール村` activates map ID `town` directly.
- Selecting `ラメールシティ` activates map ID `la_mer_city` directly.
- `la_mer_city` is the stable map ID used by the travel command and save data. The dedicated La Mer City field map may be implemented or replaced independently without changing the `イードウ` command contract.
- Additional destinations can be appended to the travel destination list later.

## Audio volume settings

- BGM and SE have independent global volume settings.
- The default BGM volume is `0.5`.
- The default SE volume is `0.5`.
- The field menu contains `設定`, which opens the audio settings menu.
- `BGM音量` and `SE音量` can each be adjusted from `0%` to `100%` in `10%` increments with `←/→`.
- Changes are applied immediately.
- `音量を初期値に戻す` restores both values to `50%`.
- Audio settings are stored separately in browser `localStorage` and persist across sessions.
- BGM playback reads the global BGM setting.
- Dialogue text sounds and other SE that use the shared setting read the global SE setting.
- Dialogue text sounds must not apply an additional gain multiplier above the selected SE volume.

## BGM

- `フルール村` uses PeriTune's `Village_Fete` as its field BGM.
- The BGM applies to the current first-village field maps: `town`, `school`, `library`, `house1`, and `house2`.
- `Village_Fete` loops continuously while the player remains on those field maps.
- BGM playback uses the global BGM volume setting; its default is `0.5`.
- Leaving the field screen for another game screen pauses the current field BGM; returning resumes the relevant field track.
- Browser autoplay restrictions are respected: playback starts after the player's first click or key input if automatic playback is blocked.
- Source: `https://peritune.com/music/PeriTune_Village_Fete.mp3`.
- `Village_Fete` was published before March 2026 and remains licensed under Creative Commons Attribution 4.0 International (CC BY 4.0).
- `キョウトシティ` is pre-registered to use PeriTune `Awayuki` when the `kyoto_city` map is implemented. Runtime asset: `assets/audio/bgm/awayuki.mp3`.
- Normal battles use PeriTune `Ancient Gust`. Runtime asset: `assets/audio/bgm/ancient-gust.mp3`.
- `ラメールシティ` uses PeriTune `Resort5`. Runtime asset: `assets/audio/bgm/resort5.mp3`.
- Boss battles use PeriTune `Swift_Strike`. Runtime asset: `assets/audio/bgm/swift-strike.mp3`.
- The current battle screen defaults to the normal-battle track. Future boss encounters can select the boss track with `SpellBgm.prepareBattle("boss")` before or during the battle transition, or by setting the battle state as a boss battle (`boss`, `isBoss`, or `type: "boss"`).
- `SpellBgm.prepareBattle("normal")` explicitly selects the normal battle track.
- The field-map BGM registry currently includes `kyoto_city -> Awayuki` and `la_mer_city -> Resort5`.

## Field dialog text

- Field dialog text uses discrete game-style message pacing rather than smooth-looking rapid text growth.
- The default pace is one grapheme/visible character every `55 ms` (`stepChars: 1`). Each update is a discrete step: the text remains unchanged between ticks, then the next character appears at once.
- Default punctuation adds extra waiting after the punctuation appears:
  - `、` / `,`: +180 ms, so the next character appears about 235 ms later with the default 55 ms base interval.
  - `。` / `.`: +180 ms.
  - `！` / `!` and `？` / `?`: +160 ms.
  - `…`: +110 ms.
  - newline: +120 ms.
- While a line is still typing, pressing `Z` finishes that line first. A subsequent `Z` performs the normal dialog advance/close action.
- Dialog pacing can be customized per line with a `typing` object passed to `SpellField.showDialog()`.
- Supported `typing` options:
  - `charMs`: base milliseconds between discrete text updates.
  - `stepChars`: number of characters revealed per update. Default is `1`; values such as `2` can create a chunkier `ポポポ` style.
  - `startDelayMs`: delay before the first text step.
  - `punctuationPauses`: per-character extra delay map. Values override/add to the default punctuation map by key.
  - `pauses`: timed pauses such as `[{at: 8, ms: 500}]`, meaning wait 500 ms after 8 characters.
  - `stopAt`: one character index or an array of indexes where rendering pauses indefinitely. Continue with `SpellDialogTyping.resume()`.
  - `allowSkip`: when `false`, `Z` cannot force the rest of the line to appear while it is typing.
  - `instant`: when `true`, bypass stepped rendering for that line. `typing: false` is also treated as instant display.
- Global defaults can be adjusted with `SpellDialogTyping.configureDefaults()`.
- `SpellDialogTyping.prepare()` can configure the next dialog when a caller cannot pass a `typing` object directly.
- `SpellDialogTyping.setStepListener(listener)` receives each discrete text step and is used by the dialog text sound-effect layer.

## Dialog text sound effect

- Normal stepped field dialogue plays a short `ポッ`-style sound for each visible text step.
- Whitespace-only steps do not play the sound.
- The runtime asset is `assets/audio/sfx/dialog-pop.wav`.
- The source sound is Kenney Interface Sounds `click_003.wav`, licensed CC0 1.0 Universal.
- The dialog sound-effect playback volume follows the global SE setting; the default is `0.5`.
- The Web Audio and fallback playback paths use the selected SE value directly and do not add an extra amplification multiplier.
- The sound-effect layer is attached through `SpellDialogTyping.setStepListener()` so text rendering and audio remain separate systems.
- Browser autoplay restrictions are respected; sound may remain silent until the player has interacted with the page.

Example:

```js
SpellField.showDialog({
  speaker: "sophie",
  text: "ゆっくり……ここで少し止める。",
  typing: {
    charMs: 80,
    stepChars: 1,
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
- The current speaker name is displayed at the top-left of the text pane, above the dialogue text. For example, `speaker: "sophie"` displays `ソフィー` and `speaker: "lumiere"` displays `ルミエル`.
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
- The plug-in line uses the normal discrete field-dialog pacing and no longer overrides the global pace with the old 30 ms setting.
- After the plug-in line has finished rendering, pressing `Z` closes the dialog and opens the programming computer screen.
- If `Z` is pressed before the plug-in line finishes rendering, that press only finishes the line; the next `Z` opens the programming computer screen.
- Existing programming and spell-testing behavior is reused; this specification changes the field entry sequence, not the Python runtime or spell-test rules.
