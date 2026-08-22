(() => {
  "use strict";

  const AUDIO_ID = "plugin-clear";
  const OFFICIAL_PAGE = "https://maou.audio/se_system46/";
  const DELIVERY_URL = "https://raw.githubusercontent.com/daishihmr/glshooter2/0eedbd6b548ca153716fb1f189496ecf2518f9b6/assets2/se_maoudamashii_system46.mp3";

  const registered = Boolean(window.SpellAudio?.registerSfx?.(AUDIO_ID, {
    kind: "url",
    src: DELIVERY_URL,
    mime: "audio/mpeg",
    poolSize: 2,
    title: "システム46",
    creator: "森田交一 / 魔王魂",
    sourcePage: OFFICIAL_PAGE
  }));

  window.SpellPluginClearAudio = {
    id: AUDIO_ID,
    title: "システム46",
    creator: "森田交一 / 魔王魂",
    sourcePage: OFFICIAL_PAGE,
    registered,
    play: () => Boolean(window.SpellAudio?.playSfx?.(AUDIO_ID))
  };
})();
