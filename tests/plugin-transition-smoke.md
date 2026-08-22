# Plug-in transition smoke check

Manual check after merge:

1. Open the normal field and confirm `SpellRuntimeBoot.ready === true` before GAME START becomes enabled.
2. Press X and let `プラグイン！ルミエル.EXE トランスミッション！` finish.
3. While that line is still typing, press Z once: it must only complete the line.
4. Press Z after the full line is visible: the dialog closes, field BGM pauses, the opaque Kirayuki screen replaces the game view, and the original sparkle SE starts with the effect.
5. After the effect ends, the first available Python grimoire opens directly in the editor.
6. Open `パソコン` from the field menu: it must open the grimoire list directly without Kirayuki or plug-in SE.
7. Leave the computer and plug in again: Dreambyte starts at 0:00 for the new plug-in session.

Diagnostics if the SE is silent:

```js
SpellPlugin.status()
SpellAudio.sfxStatus("plugin-sparkle")
SpellAudio.status()
```

Expected after at least one user gesture:

- `SpellPlugin.status().audio.loaded === true`
- `SpellPlugin.status().audio.bytes > 0`
- `contextState === "running"` on browsers with Web Audio support
- `lastError === ""`
- `lastPlayError === ""`
- no synthesized or alternate sparkle sound is registered; the HTMLAudio fallback uses the same original `可愛く輝く1` bytes
