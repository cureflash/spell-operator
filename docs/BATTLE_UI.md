# Spell Operator — Battle UI Specification

## Battle message pane

- The lower-left black pane on the battle screen is the battle message pane.
- Battle events append to recent history instead of replacing all prior context immediately.
- The pane displays the most recent four message lines so the current action and its immediate result remain visible together.
- Starting a new battle clears the previous battle history and begins with the enemy appearance message.
- Command prompts use Dragon Quest-style wording such as `ソフィーは どうする？` and `ルミエルは どうする？`.
- Internal selection bookkeeping text such as `ソフィー：たたかう` or `ソフィーの行動を決めた。` is not shown in the player-facing battle history.

## Command selection marker

- Whenever the battle is waiting for player input, the currently active command menu and its selectable commands remain visible.
- The visible command menu always has one current selection when selectable commands are present.
- The current command is marked with `▶` immediately to the left of its label.
- When the command submenu changes, the first available command becomes the visible selection.
- Moving the pointer onto a command, focusing it, or pressing it moves the `▶` marker to that command.
- While the battle screen is active, the arrow keys move the selection among commands in the currently visible command grid.
- `Z` or `Enter` confirms the currently selected command.
- Battle-command keyboard handling applies only while a command grid is visible.
- These UI controls do not change combat calculations or turn-resolution behavior.
