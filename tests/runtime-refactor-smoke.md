# Runtime refactor smoke check

Run these checks on the GitHub Pages build after the refactor is deployed.

## Boot

1. Reload with a cache-busting query.
2. GAME START is disabled while runtime modules load.
3. GAME START becomes enabled after boot.
4. In DevTools, `SpellRuntimeBoot.ready` is `true`.
5. No boot error is printed to the console.

## Audio

1. Start the game with BGM and SE at the default 50% setting.
2. Confirm field BGM plays after the first real click/key gesture.
3. Confirm normal dialog text plays `dialog-pop`.
4. Confirm `SpellAudio.status()` reports `activated: true` after a gesture.
5. Confirm `SpellAudio.sfxStatus("dialog-pop")` has bytes loaded and no playback error.
6. Confirm `SpellAudio.sfxStatus("plugin-sparkle")` has bytes loaded and no playback error after plug-in.
7. Change BGM and SE volumes independently in Settings; both apply immediately.

## Plug-in

Follow `tests/plugin-transition-smoke.md`.

## Menu and navigation

1. Enter opens the field menu.
2. Z confirms a menu item; Enter/Escape backs out of submenus.
3. `パソコン` opens the plug-in menu without Kirayuki or plug-in SE.
4. Z from the plug-in menu returns to the field.
5. Z from the editor returns to the plug-in menu unless the code textarea owns keyboard input.
6. Status, backpack, and shop can return to the field with Z.

## イードウ

1. Choose `イードウ` -> `ラメールシティ`.
2. Lumiere asks `ラメールシティに移動するの？` in the normal field dialog.
3. If Z is pressed while the question is typing, that Z only completes the line.
4. The next Z on `はい` makes Lumiere say `イードウ！`.
5. Player/menu movement is locked while casting/fading.
6. The screen fades fully black, map changes while black, then fades in.
7. `いいえ`, Enter, or Escape cancels without moving.

## Field movement

1. Holding/repeating movement does not visually skip logical tiles.
2. Sophie and Lumiere remain in the same `#field-world` coordinate system on scrolling maps and compact rooms.
3. Movement keys do not move Sophie while a normal field dialog, menu, story overlay, map transition, or plug-in transition owns input.
4. Enter House 2F and verify the stair corridor remains traversable.
5. Load an older save with a bad follower position and verify Lumiere is normalized adjacent to Sophie.

## Regression rule

If a behavior above fails, fix its authoritative owner documented in `docs/RUNTIME_ARCHITECTURE.md`. Do not add a new post-load `*-fix.js` monkey patch.
