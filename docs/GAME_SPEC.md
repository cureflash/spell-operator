# Spell Operator — Game-wide Specification

This file is the implementation-facing mirror of confirmed game-wide specifications. Canonical design decisions are stored in the Spell Operator Notion databases.

## Field controls

- Movement: Arrow keys / WASD.
- `Z`: interact / confirm. It must not be used as the normal cancel/back key.
- `X`: cancel / back while a menu, sub-screen, or cancellable prompt is open.
- Normal-field exception: when no menu, overlay, or plug-in prompt is open, `X` starts plug-in access to Lumiere as before.
- `Enter`: opens the field menu where defined. It is not the primary cancel/back key.
- Story overlays, dialogs, and open menus keep priority over normal field shortcuts.
- Inside editable text fields, normal character entry takes priority; typing `x` in the Python editor must remain possible.

## Game screen scrolling policy

- Normal gameplay screens must not require browser/page scrolling to use them.
- The primary information and controls required on each screen must fit within the current viewport.
- If a screen would otherwise exceed the viewport, redesign the layout, adjust density, or use tabs/page switching rather than requiring whole-screen scrolling.
- The plug-in menu and editor workspace are subject to this policy.
- Editor and code-preview controls may manage their own text overflow; the browser/page itself must not need scrolling while the plug-in workspace is active.

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
- The current destination list contains `フルール村` and `ラメールシティ`.
- `フルール村` maps to internal map ID `town`; `ラメールシティ` maps to `la_mer_city`.
- Choosing a destination does not warp immediately. Lumiere first asks `○○に移動するの？` using the normal field dialogue UI.
- A `はい / いいえ` confirmation menu is shown while Lumiere asks.
- If the confirmation line is still typing, the first `Z` only finishes the line; a subsequent `Z` confirms the selected answer.
- Choosing `いいえ` cancels the move and returns to the destination list.
- Pressing `X` at the confirmation cancels the move and returns to the destination list.
- Pressing `X` in the destination list returns to the main field menu; pressing `X` in the main field menu closes it.
- Choosing `はい` makes Lumiere say exactly `イードウ！`.
- After `イードウ！` finishes rendering, the dialogue remains open and waits for another `Z`. That `Z` closes the line and starts the fade: the screen fades completely to black, the destination map is activated while blacked out, then the screen fades back in.
- `Z` pressed while `イードウ！` is still rendering does not start the fade.
- Player movement and menu input are locked during the casting/wait/fade transition.
- `Escape` may remain as a secondary keyboard fallback, but the displayed and canonical cancel/back control is `X`.
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
- Plug-in/computer screens use PeriTune `Dreambyte` as their BGM. This includes both the plug-in menu (`screen-hub`) and the Python editor workspace (`screen-debug`).
- `Dreambyte` continues without restarting when moving between the plug-in menu and editor, and pauses when leaving the plug-in/computer screens for field, battle, or another screen.
- Dreambyte source: `https://peritune.com/music/PeriTune_Dreambyte.mp3`; source page: `https://peritune.com/blog/2026/01/17/dreambyte/`. It was published in January 2026 and remains under CC BY 4.0.
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
- While a line is still typing, pressing `Z` finishes that line first. A subsequent `Z` performs the normal dialog advance/confirm action.
- `X` is used to cancel only when the current dialogue/prompt explicitly supports cancellation; it does not replace normal `Z` dialogue advance.
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
- Battle portraits use expression ID `battle`:
  - `assets/characters/portraits/sophie/battle.jpg`
  - `assets/characters/portraits/lumiere/battle.jpg`
- The normal battle UI uses the `battle` expression for Sophie and Lumiere. Dedicated danger/KO/fainted portraits are not specified yet and continue to use `neutral`.
- `SpellField.showDialog()` accepts an optional `expression` property. Existing dialogue that omits it uses `neutral`.
- Additional expressions can be registered without changing the dialogue layout through `SpellPortraits.register(character, expression, src)`.
- `SpellPortraits.prepare(expression)` can prepare an expression for the next field-dialog portrait update when existing internal field code invokes its local dialog function directly.

## Plug-in

- "Plug-in" means Sophie connects to the computer inside Lumiere so Sophie can write programs into Lumiere.
- From the normal field, pressing `X` starts plug-in access when no higher-priority menu, overlay, or prompt is open.
- Pressing `X` does not immediately change screens. Sophie first says exactly: `プラグイン！ルミエル.EXE トランスミッション！` in the field dialog.
- The plug-in line uses the normal discrete field-dialog pacing and no longer overrides the global pace with the old 30 ms setting.
- After the plug-in line has finished rendering, pressing `Z` closes the dialog and plays the Kirayuki plug-in transition once.
- Pressing `X` while the plug-in confirmation line is open cancels that plug-in attempt and returns to the normal field.
- The transition uses `kirayuki1` / `キラキラ雪放射` from the supplied `キラ雪.zip`; the runtime asset is `assets/effects/plugin/kirayuki1.webp`.
- The supplied `可愛く輝く1.mp3` SE starts together with the Kirayuki animation and follows the global SE volume setting.
- The browser runtime uses a lightweight audio encode stored at `assets/audio/sfx/plugin-sparkle.base64`, decoded to `audio/mpeg` when the transition module loads.
- After the Kirayuki animation completes, the plug-in menu opens. It does not automatically open the first Python grimoire.
- If `Z` is pressed before the plug-in line finishes rendering, that press only finishes the line; the next `Z` starts the transition.
- The Kirayuki transition applies only to the normal-field `X` plug-in sequence; direct computer/menu entry opens the plug-in menu without the transition or plug-in SE.
- The plug-in menu is divided into upper-left Lumiere portrait, upper-right menu, and bottom Lumiere dialogue areas.
- The menu contains `エディタ`, `チュートリアル`, `カスタム`, and `戻る` in that order.
- `Z` confirms the selected plug-in menu item; `X` returns from the plug-in menu to the field.
- `カスタム` is reserved and has no defined behavior yet.
- `チュートリアル` replays the same externally stored Lumiere explanation script used for the first explanation.
- Detailed workspace layout rules are mirrored in `docs/PLUGIN_WORKSPACE.md`.

## Plug-in editor workspace

- The Python editor is on the left.
- The right side primarily contains execution controls and the dedicated execution/output pane.
- Previously saved code is accessed through a collapsible `魔導書` tab on the right. The tab is closed by default and opens only when selected.
- When the grimoire tab is closed, the execution/output pane expands vertically into the freed space.
- A saved code entry can be selected and copied while the grimoire is open. It is not automatically inserted into the current editor; the player pastes it normally.
- The right execution area contains a dedicated `実行結果 / 出力` pane for technical execution information.
- The bottom pane is reserved for Lumiere dialogue and uses the normal field-style dialogue window.
- Test failures keep detailed output/test information in the execution-output pane while Lumiere gives a short response in the bottom pane.
- The editor includes a `ヒントを聞く` button. Hint text is shown as Lumiere dialogue in the bottom pane.
- Hint use currently consumes no item, but hint eligibility and consumption are routed through a replaceable policy service so an inventory-item requirement can be added later.
- The future hint item type and quantity are not specified.
- The editor/right-pane boundary, the grimoire/execution boundary while the grimoire is open, and the upper-workspace/bottom-pane boundary are draggable.
- The plug-in menu's Lumiere/menu boundary and upper/bottom boundary are also draggable.
- Pane-size persistence between sessions is not specified.
- `X` returns from the editor to the plug-in menu when focus is not inside an editable text field.

## Spell learning state

- Spellbook unlock state, learned state, editor draft/source state, and first-clear presentation flags are distinct concepts.
- Unlocking a spellbook only makes its programming problem available; it does not make the spell usable in battle.
- `テスト実行` is rehearsal and must never set learned state.
- A spell becomes learned only when `解答を判定` passes all current judge cases.
- Judge success sets the learned-status flag and stores or improves the corresponding battle implementation.
- Battle spell availability checks learned state first. An unlearned spell must not be cast even if a draft or stale source exists.
- Learned status is included in magic save data and restored on load. Legacy saves without an explicit learned-status field migrate a valid registered spell to learned status for compatibility.
- For the current debugging phase only, an untouched unlearned Fire editor is initially seeded with:

```python
n = int(input())
print(n * 2)
```

- The Fire debug seed does not itself learn Fire. `コードをクリア` empties it immediately, and after the draft has been cleared or edited it is not automatically reinserted in the same session.

## Python error guidance by Lumiere

- Python compile-time and runtime exceptions from the grimoire test runner are presented through Lumiere guidance.
- The Python exception class name is the internal lookup key, for example `SyntaxError`, `NameError`, or `TypeError`.
- Lumiere's dialogue text is stored in the editable runtime table `data/python-error-dialogues.json` and must not be duplicated as per-error hardcoded strings in the execution or UI logic.
- `js/lumiere-python-errors.js` loads the table and converts `compileError`, per-test runtime `error` strings, and rejected runner failures before the grimoire UI displays them.
- The original Python exception/test information is shown in the dedicated editor execution-output pane, while Lumiere's explanation is shown separately in the bottom dialogue pane.
- An exception class missing from the table uses the table's `default` dialogue.
- A test failure caused only by output mismatch is not a Python exception. Detailed mismatch information remains in the execution-output pane and Lumiere gives a short failure response separately.
- Dialogue-table fetches bypass the browser cache so changing only `data/python-error-dialogues.json` is sufficient to change Lumiere's lines without editing the Python runner or grimoire code.
