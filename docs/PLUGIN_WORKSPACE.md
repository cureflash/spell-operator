# Spell Operator — Plug-in Workspace

This document mirrors the confirmed plug-in workspace specification from Notion for implementation.

## Entry

- The normal field `X` plug-in sequence keeps the existing Sophie line, Kirayuki full-screen transition, and plug-in SE.
- After the transition finishes, open the plug-in menu. Do not automatically open the first Python editor.
- The field-menu computer route may open the same plug-in menu without the cinematic transition.
- The common menu control contract is `Z` = confirm and `X` = cancel/back.
- The normal field is the exception to the cancel binding: while no menu, overlay, or plug-in prompt is open, `X` starts plug-in access as before.

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
- `Z` activates the selected item.
- `X` cancels the plug-in menu and returns to the field.
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
- The right side primarily contains execution controls and the execution/output pane.
- The grimoire for previously saved code is a collapsible tab on the right side and is closed by default whenever the editor workspace is entered.
- Only the grimoire body is controlled by that tab. The execution controls, `出力` pane, and bottom Lumiere dialogue are never collapsed by the grimoire tab.
- Activating the grimoire tab opens its saved-code list and preview. Activating it again closes only that saved-code area.
- While the grimoire is closed, the execution/output area expands vertically into the space that would otherwise be used by the grimoire.
- While the grimoire is open, the execution/output pane remains visibly open below it so the player can view the grimoire and output at the same time.
- Selecting saved code while the grimoire is open shows the code and enables copying it to the clipboard.
- The grimoire never auto-inserts saved code into the editor. The player pastes copied code normally.
- The right-side `出力` pane is stdout-only during normal test execution. It displays only text actually emitted by the player's program, such as `print()` output.
- Test counts, expected output, calculation cost, MP, pass/fail explanations, and other diagnostics must not be mixed into the stdout pane during normal test execution.
- During final answer judging, the same pane shows each judged random input value and the player's corresponding output value. A failed case may additionally show the expected value.
- Output contents are owned by `js/plugin-execution-controller.js`. `js/plugin-editor-assistant.js` must not re-mirror `SpellPython.lastResult` into the output pane, because that would overwrite the judge input/output display.
- Calculation cost, MP, and pass/fail remain available in their dedicated status/metric UI.
- The bottom area is only Lumiere dialogue and keeps the same normal field dialogue-window appearance with Lumiere portrait and speaker name.
- Output mismatch is a test failure (`TEST FAILED`), not a Python exception. Lumiere gives a short response such as `これだとダメそうね。出力を確認してみて。` while the stdout pane shows the player's actual output.
- Real Python-code exceptions and execution-environment failures are distinct. Lumiere may explain a Python exception by type, but a worker/CDN/runtime infrastructure failure must not be described as a Python-code error.
- The editor dialogue is tall enough to show the normal one-line Lumiere response without its own vertical scrollbar. The `▼` indicator remains fully visible inside the lower-right corner.
- `X` returns from the editor to the plug-in menu when keyboard focus is not inside an editable text field. Typing the character `x` inside the code editor must remain possible.

### Temporary Fire debug seed

- For the current debugging phase, opening an untouched, unlearned Fire editor seeds it with a correct Fire solution:

```python
n = int(input())
print(n * 2)
```

- The seed is only an editor convenience; merely displaying or running it does not mark Fire as learned.
- `コードをクリア` immediately empties the editor.
- Once the Fire draft has been edited or explicitly cleared in the current session, reopening Fire must not automatically reinsert the debug seed.

### Current desktop layout values

The current `spell-operator/plugin-editor-layout@1` tuning is:

- editor width: 64%
- upper workspace: 85%
- Lumiere dialogue: 15%
- divider thickness: 2px
- grimoire open height: up to 30%
- grimoire default state: closed
- execution/output pane: always open
- execution output minimum height: 120px
- execution pane gap: 2px
- dialogue portrait column: 70px
- dialogue message top padding: 22px
- dialogue text size: 14px
- problem/specification maximum height: 126px
- code editor text size: 13px

The speaker-name badge inside the plug-in editor dialogue is reduced specifically for the 70px portrait column. This does not change the normal field dialogue speaker-name sizing.

## Learning status and answer judging

- Spellbook unlock status, spell learned status, and saved source code are separate state concepts.
- An unlocked spellbook may be opened in the editor even when its spell is still unlearned.
- `テスト実行` is rehearsal only. It may run the code and show output, but it must never change learned status or make a spell battle-usable.
- The editor includes a separate `解答を判定` button for actual learning.
- Final answer judging uses newly generated random valid inputs for the current programming problem.
- The current judge generates 3 random cases per judgment.
- The canonical reference Python solutions are stored separately in `data/python-reference-solutions.json`.
- The judge runs the reference solution against each generated input and uses the reference program's actual stdout as the expected output for that case.
- The player's code is then run against the same input set. A case passes only when its normalized stdout matches the expected stdout and no Python exception occurs.
- After answer judging completes, the execution/output pane shows the random input value and the player's output value for all three judged cases. On a failed case, the expected output may also be shown as judgment information.
- Lumiere's bottom dialogue remains separate and gives only a short response to the judgment result.
- Passing all random cases sets the spell's learned status to true and records the submitted code as its battle implementation using the existing MP/cost model. A less efficient later submission does not replace a better saved implementation.
- An unlearned spell is unavailable in battle even if an editor draft exists.
- Learned status is included in magic save data and restored on load. Legacy saves that have a valid saved registered spell but no explicit learned-status field migrate that registered spell to learned status.
- A fully passing judgment plays `plugin-clear`, currently assigned to 魔王魂 `システム46` by 森田交一. The canonical source page and attribution are recorded in `docs/ASSET_CREDITS.md`.
- Reference solution code is judge data. It is not shown automatically in normal player-facing UI or normal hint output; the Fire seed above is a temporary debugging exception explicitly requested for the current development phase.

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
- The grimoire/execution boundary is draggable while the grimoire tab is open.
- The upper workspace/bottom dialogue boundary is draggable.
- The Lumiere/menu boundary on the plug-in menu is draggable.
- These sizes are user-adjustable for the current session; persistence is not specified.
- The plug-in screen must not require browser/page scrolling.
