# Plug-in transition smoke check

Manual check after merge:

1. Open the normal field and confirm `SpellRuntimeBoot.ready === true` before GAME START becomes enabled.
2. Press X and let `プラグイン！ルミエル.EXE トランスミッション！` finish.
3. While that line is still typing, press Z once: it must only complete the line.
4. Press Z after the full line is visible: the dialog closes, field BGM pauses, the opaque Kirayuki screen replaces the game view, and the original sparkle SE starts with the effect.
5. After the effect ends, the plug-in menu opens. It must not automatically open a Python grimoire.
6. Confirm the menu shows Lumiere on the upper-left, `エディタ / チュートリアル / カスタム / 戻る` on the upper-right, and Lumiere dialogue on the bottom.
7. `チュートリアル` replays the external tutorial script in the bottom dialogue pane.
8. `エディタ` opens the Python editor with the editor on the left, saved-code grimoire on the upper-right, execution controls below it, and the shared Lumiere/output pane on the bottom.
9. Drag each workspace separator and confirm the pane sizes change without browser/page scrolling.
10. After at least one spell has saved source code, select it in the right grimoire, press `コピー`, and confirm it copies without automatically inserting into the editor.
11. Cause a Python exception and confirm the bottom pane shows Lumiere guidance without a separate raw-error console.
12. Open `パソコン` from the field menu: it must open the plug-in menu directly without Kirayuki or plug-in SE.
13. Leave the computer and plug in again: Dreambyte starts at 0:00 for the new plug-in session.

Diagnostics if the SE is silent:

```js
SpellPlugin.status()
SpellAudio.sfxStatus("plugin-sparkle")
SpellAudio.status()
```

Workspace diagnostics:

```js
SpellPluginWorkspace.sync()
SpellPluginWorkspace.renderCodeLibrary()
SpellPluginTutorial.play()
```

Expected after at least one user gesture:

- `SpellPlugin.status().audio.loaded === true`
- `SpellPlugin.status().audio.bytes > 0`
- `contextState === "running"` on browsers with Web Audio support
- `lastError === ""`
- `lastPlayError === ""`
- no synthesized or alternate sparkle sound is registered; the HTMLAudio fallback uses the same original `可愛く輝く1` bytes
