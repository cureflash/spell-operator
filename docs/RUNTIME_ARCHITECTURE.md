# Spell Operator — Runtime Architecture

This document describes implementation ownership for the current browser runtime. Game-design behavior remains canonical in Notion and `docs/GAME_SPEC.md`.

## Principles

- One feature has one authoritative controller. Do not add a second capture listener that re-implements the same transition.
- Cross-cutting services such as audio are centralized instead of opening independent browser audio contexts per feature.
- Compatibility fixes belong in the owning model/controller rather than in post-load monkey-patch files.
- GAME START remains disabled until the runtime manifest has loaded successfully.
- Normal direct menu entry and cinematic plug-in entry remain separate routes even when they eventually open the same computer UI.

## Bootstrap

`js/game.js` is the runtime bootstrap manifest.

- Styles are registered once at boot.
- Runtime modules are loaded in dependency order by an explicit module list.
- Optional modules are marked as optional in the manifest rather than by ad-hoc promise chains.
- `#start-button` is disabled before loading and enabled only after the full manifest completes.
- Successful boot exposes `window.SpellRuntimeBoot.ready === true` for diagnostics.

## Audio

`js/audio-manager.js` owns browser audio primitives.

### SFX

- One shared Web Audio `AudioContext` is used for sound effects when available.
- The context is resumed from capture-phase pointer/key gestures.
- SFX assets are registered by ID, preloaded once, and decoded once.
- HTMLAudio fallback uses the same source bytes as the requested SFX; it must not substitute a different synthesized sound.
- Global SE volume comes only from `SpellAudioSettings`.

Registered core SFX:

- `dialog-pop` -> `assets/audio/sfx/dialog-pop.wav`
- `plugin-sparkle` -> supplied `可愛く輝く1` data stored at `assets/audio/sfx/plugin-sparkle.base64`

The historical repository copy of `plugin-sparkle.base64` is three Base64 characters short. The manager contains an asset-specific `VVV` tail repair until the runtime asset is replaced by a clean binary asset. Do not generalize this repair to arbitrary files.

### BGM

- `js/game-bgm.js` decides which track should be active from game state/screens.
- `js/audio-manager.js` performs the actual HTMLAudio playback.
- BGM and SE keep independent global volume settings.
- Entering a new plug-in/computer session requests Dreambyte from 0:00; navigation inside the same plug-in workspace does not restart it.

Diagnostics:

```js
SpellAudio.status()
SpellAudio.sfxStatus("dialog-pop")
SpellAudio.sfxStatus("plugin-sparkle")
```

## Plug-in

`js/plugin-controller.js` is the only owner of the normal-field cinematic plug-in flow.

It owns:

1. field `X` shortcut
2. Sophie plug-in line
3. first `Z` while typing -> finish line only
4. final `Z` -> audio gesture preparation and original sparkle SE
5. field BGM pause
6. opaque full-screen Kirayuki/glow transition
7. transition input lock
8. computer opening after the effect

After the transition, the controller stops at the plug-in menu. It does not choose or open a Python grimoire automatically.

`js/plugin-workspace.js` owns the base plug-in/computer workspace UI after entry:

- three-part plug-in menu layout with Lumiere, menu, and dialogue pane
- `エディタ` and `チュートリアル` menu behavior
- reserved disabled `カスタム` item
- editor / saved-code grimoire / execution layout
- clipboard copy of saved code without automatic insertion
- draggable pane boundaries
- the no-browser-scroll active workspace state
- replay of the external tutorial script from `data/plugin-tutorial-dialogues.json`

`js/plugin-editor-assistant.js` owns editor-side presentation after Python execution:

- a dedicated `実行結果 / 出力` pane inside the execution area
- keeping technical execution output separate from Lumiere's bottom dialogue
- short contextual Lumiere reactions for running, failed, passed, judge, and error states
- the `ヒントを聞く` editor control

`js/plugin-hints.js` owns hint retrieval and hint-use policy:

- loads problem-specific hint text from `data/python-hints.json`
- currently allows free hint use
- exposes separate `canUse` and `consume` policy hooks so a future inventory item requirement can be added without changing the editor UI
- must not hardcode a future hint-item type or quantity until that design is confirmed
- does not implement staged hints or full-code disclosure yet

`js/plugin-answer-judge.js` owns random-case final answer judging:

- generates valid random inputs for the current supported programming problem
- currently generates 10 random cases per judgment
- loads canonical reference solutions from `data/python-reference-solutions.json`
- runs the reference solution first and uses its actual stdout as the expected output for each generated input
- runs the player's code against the same input set through `SpellPython.runSuite()`
- reports a failing random input plus player/expected output in the technical output pane
- records a fully passing submission as the learned spell while preserving a more efficient saved implementation

The Python execution engine and fixed test logic remain owned by `js/python-grimoire.js`; workspace, assistant, and answer-judge modules reuse `SpellPython.runSuite()` rather than implementing another Python runtime.

Diagnostics:

```js
SpellPlugin.status()
SpellPlugin.testSound()
SpellPluginWorkspace.sync()
SpellPluginWorkspace.renderCodeLibrary()
SpellPluginTutorial.play()
SpellPluginEditorAssistant.sync()
SpellPluginHints.status()
SpellAnswerJudge.generateInputs("fire", 10)
```

## Python runtime diagnostic

`tools/python-runtime-test.html` is an isolated developer diagnostic for browser Python execution. It deliberately does not use the game runtime, `SpellPython`, the plug-in UI, answer judging, or Lumiere presentation code.

It tests this path only:

1. create a same-origin module Web Worker
2. dynamically import Pyodide 0.28.3 from jsDelivr inside that worker
3. initialize Pyodide
4. install a minimal stdin/stdout capture helper
5. run `print("str")`
6. run `input()` with a supplied stdin value

The page outputs machine-readable JSON with format `spell-operator/python-runtime-diagnostic@1`. When browser Python fails, use the first failed phase/stage from this diagnostic before changing the game runner again. Do not add another compatibility layer to the game runtime until this isolated path has been confirmed or disproved on the target browser.

## Field input and scene ownership

`js/field-input-controller.js` owns movement-rate locking and the one-input movement buffer.

`js/field-scene-controller.js` owns persistent field entity DOM placement. Sophie, Lumiere, the field enemy, and field sign live in `#field-world` across compact and scrolling maps.

`js/field-model.js` owns logical movement/follower state, including:

- route-following movement
- follower normalization when restoring legacy save snapshots
- the confirmed House 2F stair-corridor passability exception

Do not reintroduce monkey patches for these behaviors.

## Field menu and fast travel

`js/game03-menu.js` owns:

- field menu open/close
- status screen
- audio settings UI
- `イードウ` destination selection, confirmation, cast line, and fade
- Z back-navigation from auxiliary UI screens

Plug-in X/Z logic is intentionally absent from this module.

## Retired compatibility modules

The following post-load patch modules were removed after their behavior was folded into an owning controller/model:

- `movement-step-lock.js`
- `house-movement-fix.js`
- `follower-normalize.js`
- `party-lockstep.js`
- `map-scroll-fix.js`
- `ido-confirm-dialog-fix.js`
- `z-escape.js`
- `plugin-se.js`
- `plugin-transition.js`
- `plugin-editor-entry.js`

Prototype 0.2 runtime files `game02-core.js` and `game02-battle.js` were also removed because the active entrypoint and current specifications use Prototype 0.3 only.

## Change rule

When fixing runtime behavior, modify the authoritative owner above or extract a clearly named service/controller. Do not add a `*-fix.js` file that monkey-patches an already-loaded implementation unless it is a short-lived emergency measure with an explicit removal plan.
