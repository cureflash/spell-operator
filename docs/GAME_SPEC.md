# Spell Operator — Game-wide Specification

This file is the implementation-facing mirror of confirmed game-wide specifications. Canonical design decisions are stored in the Spell Operator Notion databases.

## Field controls

- Movement: Arrow keys / WASD.
- `Z`: interact / confirm / back behavior where defined.
- `Enter`: field menu / close menu behavior where defined.
- `X`: plug in to Lumiere and open the programming computer screen.
- Story overlays, dialogs, and open menus keep priority over normal field shortcuts.

## Plug-in

- "Plug-in" means Sophie connects to the computer inside Lumiere so Sophie can write programs into Lumiere.
- From the normal field, pressing `X` starts plug-in access.
- When plug-in access starts, Sophie says exactly: `プラグイン！ルミエル.EXE トランスミッション！`
- The programming computer screen is displayed as part of the same `X`-key action.
- Existing programming and spell-testing behavior is reused; this specification changes the field entry point, not the Python runtime or spell-test rules.
