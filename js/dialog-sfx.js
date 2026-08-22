(() => {
  "use strict";

  const SOURCE = "assets/audio/sfx/dialog-pop.wav";
  const POOL_SIZE = 4;
  const VOLUME = 0.35;

  if (!window.SpellDialogTyping?.setStepListener) return;

  const pool = Array.from({ length: POOL_SIZE }, () => {
    const audio = new Audio(SOURCE);
    audio.preload = "auto";
    audio.volume = VOLUME;
    return audio;
  });
  let cursor = 0;

  function playPop({ chunk } = {}) {
    if (!Array.isArray(chunk) || !chunk.some(char => /\S/.test(char))) return;

    const audio = pool[cursor];
    cursor = (cursor + 1) % pool.length;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }

  window.SpellDialogTyping.setStepListener(playPop);

  window.SpellDialogSfx = {
    source: SOURCE,
    volume: VOLUME,
    playPop
  };
})();
