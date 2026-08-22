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
- There is no separate console panel.
- The bottom area is the shared Lumiere dialogue / program-output area.
- When Lumiere speaks in the editor, the bottom area uses the same normal field dialogue-window appearance with Lumiere portrait and speaker name.
- Python exceptions are converted to Lumiere guidance. Do not show a separate raw-error console.
- Normal program/test output uses the same bottom area but uses `実行結果` as the speaker label so it is distinguishable from Lumiere speech.

## Resizing and scrolling

- The editor/right-pane boundary is draggable.
- The grimoire/execution boundary is draggable.
- The upper workspace/bottom dialogue boundary is draggable.
- The Lumiere/menu boundary on the plug-in menu is draggable.
- These sizes are user-adjustable for the current session; persistence is not specified.
- The plug-in screen must not require browser/page scrolling.
