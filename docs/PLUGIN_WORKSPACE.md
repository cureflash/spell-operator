# Spell Operator — Plug-in Workspace

This document mirrors the confirmed plug-in workspace specification from Notion for implementation.

## Entry

- The normal field `X` plug-in sequence keeps the existing Sophie line, Kirayuki full-screen transition, and plug-in SE.
- After the transition finishes, open the plug-in menu. Do not automatically open the first Python editor.
- The field-menu computer route may open the same plug-in menu without the cinematic transition.

## Plug-in menu

The plug-in screen is divided into three areas:

- upper-left: Lumiere portrait
- upper-right: menu
- bottom: Lumiere dialogue

The menu contains, in this order:

1. `エディタ`
2. `チュートリアル`
3. `カスタム`
4. `戻る`

`カスタム` is reserved only. Its behavior is not specified yet.

- Up/down arrow keys move the current menu selection.
- The selected menu item is visually highlighted.
- The bottom Lumiere dialogue changes whenever the menu selection changes and explains the selected item.
- The initial selection is `エディタ`, so the initial bottom dialogue explains the editor.
- The bottom area reuses the same dialogue-window structure and appearance as normal field conversation: Lumiere portrait, speaker name, and message pane. Do not use a separate dark `DIALOGUE` console-style panel.

## Tutorial

- Selecting `チュートリアル` shows its menu guidance in the normal dialogue window.
- Activating `チュートリアル` displays Lumiere's plug-in/editor explanation.
- Tutorial dialogue is stored outside UI/controller code.
- Do not automatically replace the initial `エディタ` guidance with the tutorial body when the plug-in menu first opens.

## Editor workspace

- The Python editor occupies the left side.
- The upper-right area is the grimoire for previously saved code.
- Selecting saved code shows the code and enables copying it to the clipboard.
- The grimoire never auto-inserts code into the editor. The player pastes copied code normally.
- Execution controls are below the grimoire on the right.
- The right-side `出力` pane is stdout-only during normal test execution. It displays only text actually emitted by the player's program, such as `print()` output.
- Test counts, expected output, calculation cost, MP, pass/fail explanations, and other diagnostics must not be mixed into the stdout pane during normal test execution.
- Calculation cost, MP, and pass/fail remain available in their dedicated status/metric UI.
- The bottom area is only Lumiere dialogue and keeps the same normal field dialogue-window appearance with Lumiere portrait and speaker name.
- Output mismatch is a test failure (`TEST FAILED`), not a Python exception. Lumiere gives a short response such as `これだとダメそうね。出力を確認してみて。` while the stdout pane shows the player's actual output.
- Real Python-code exceptions and execution-environment failures are distinct. Lumiere may explain a Python exception by type, but a worker/CDN/runtime infrastructure failure must not be described as a Python-code error.
- The `▼` indicator at the lower-right of the plug-in editor dialogue is positioned slightly lower than before so it does not appear clipped by the reduced dialogue height.

### Current desktop layout values

The current `spell-operator/plugin-editor-layout@1` tuning is:

- editor width: 64%
- upper workspace: 91%
- Lumiere dialogue: 9%
- divider thickness: 2px
- grimoire height: 30%
- execution output minimum height: 120px
- execution pane gap: 2px
- dialogue portrait column: 70px
- dialogue message top padding: 23px
- dialogue text size: 14px
- problem/specification maximum height: 126px
- code editor text size: 13px

The speaker-name badge inside the plug-in editor dialogue is reduced specifically for the 70px portrait column. This does not change the normal field dialogue speaker-name sizing.

## Answer judging

- The editor includes a separate `解答を判定` button in addition to `テスト実行`.
- Final answer judging uses newly generated random valid inputs for the current programming problem.
- The current judge generates 10 random cases per judgment.
- The canonical reference Python solutions are stored separately in `data/python-reference-solutions.json`.
- The judge runs the reference solution against each generated input and uses the reference program's actual stdout as the expected output for that case.
- The player's code is then run against the same input set. A case passes only when its normalized stdout matches the expected stdout and no Python exception occurs.
- After answer judging completes, the execution/output pane shows the random input value and the player's output value for the judged cases. On a failed case, the expected output may also be shown as judgment information.
- Lumiere's bottom dialogue remains separate and gives only a short response to the judgment result.
- Passing all random cases records the submitted code as a learned/battle-usable spell using the existing MP/cost model; a less efficient submission does not replace a better saved implementation.
- A fully passing judgment invokes the reserved `plugin-clear` SE playback hook. The actual sound asset is not specified yet; when it is supplied it can be registered with `SpellAudio.registerSfx("plugin-clear", ...)` without changing the judge flow.
- Reference solution code is judge data. It is not shown automatically in the editor or in normal hint output.

## Hint

- The editor includes a `ヒントを聞く` button.
- Activating it makes Lumiere show a problem-specific hint in the bottom dialogue area.
- Hint text is stored in `data/python-hints.json`.
- Hint acquisition is routed through `js/plugin-hints.js` rather than directly consuming inventory in the UI.
- The current policy allows hints without consuming an item.
- The hint service exposes separate eligibility and consumption hooks so a later specification can require an inventory item without rewriting the editor UI.
- The future item type and quantity are not specified yet and must not be hardcoded now.
- A possible future multi-stage hint system, including a later stage where Lumiere may provide complete code, is under consideration only. It is not implemented and its rules are not yet part of the specification.

## Resizing and scrolling

- The editor/right-pane boundary is draggable.
- The grimoire/execution boundary is draggable.
- The upper workspace/bottom dialogue boundary is draggable.
- The Lumiere/menu boundary on the plug-in menu is draggable.
- These sizes are user-adjustable for the current session; persistence is not specified.
- The plug-in screen must not require browser/page scrolling.
