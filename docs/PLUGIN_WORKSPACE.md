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
- The right-side execution area includes a separate `実行結果 / 出力` pane.
- Python exception text, test results, output mismatch details, and other technical execution information are shown in that output pane.
- The bottom area is only Lumiere dialogue and keeps the same normal field dialogue-window appearance with Lumiere portrait and speaker name.
- Test failure does not turn the bottom area into a console. Lumiere gives a short response such as `これだとダメそうね。出力結果を確認してみて。` while the detailed result remains in the output pane.
- Python exceptions may still be translated into Lumiere guidance, but the technical exception/result text remains separately inspectable in the output pane.

## Answer judging

- The editor includes a separate `解答を判定` button in addition to `テスト実行`.
- Final answer judging uses newly generated random valid inputs for the current programming problem.
- The current judge generates 10 random cases per judgment.
- The canonical reference Python solutions are stored separately in `data/python-reference-solutions.json`.
- The judge runs the reference solution against each generated input and uses the reference program's actual stdout as the expected output for that case.
- The player's code is then run against the same input set. A case passes only when its normalized stdout matches the expected stdout and no Python exception occurs.
- A failed judgment shows at least one failing random input, the player's output, and the expected output in the `実行結果 / 出力` pane.
- Lumiere's bottom dialogue remains separate and gives only a short response to the judgment result.
- Passing all random cases records the submitted code as a learned/battle-usable spell using the existing MP/cost model; a less efficient submission does not replace a better saved implementation.
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
