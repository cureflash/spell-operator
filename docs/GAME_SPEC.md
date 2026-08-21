# Spell Operator — Game-wide Specification

This file is the implementation-facing mirror of confirmed game-wide specifications. Canonical design decisions are stored in the Spell Operator Notion databases.

## Field controls

- Movement: Arrow keys / WASD.
- `Z`: interact / confirm / back behavior where defined.
- `Enter`: field menu / close menu behavior where defined.
- `X`: start plug-in access to Lumiere.
- Story overlays, dialogs, and open menus keep priority over normal field shortcuts.

## Plug-in

- "Plug-in" means Sophie connects to the computer inside Lumiere so Sophie can write programs into Lumiere.
- From the normal field, pressing `X` starts plug-in access.
- Pressing `X` does not immediately change screens. Sophie first says exactly: `プラグイン！ルミエル.EXE トランスミッション！` in the field dialog.
- While that plug-in dialog is displayed, pressing `Z` closes the dialog and opens the programming computer screen.
- Existing programming and spell-testing behavior is reused; this specification changes the field entry sequence, not the Python runtime or spell-test rules.
