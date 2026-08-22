(() => {
  "use strict";

  const SOURCE = "assets/audio/sfx/dialog-pop.wav";
  const FALLBACK_POOL_SIZE = 6;
  const FALLBACK_VOLUME = 1.0;
  const WEB_AUDIO_GAIN = 2.4;

  if (!window.SpellDialogTyping?.setStepListener) return;

  const fallbackPool = Array.from({ length: FALLBACK_POOL_SIZE }, () => {
    const audio = new Audio(SOURCE);
    audio.preload = "auto";
    audio.volume = FALLBACK_VOLUME;
    return audio;
  });
  let fallbackCursor = 0;

  let audioContext = null;
  let decodedBuffer = null;
  let loadPromise = null;

  function ensureWebAudio() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return Promise.resolve(false);

    if (!audioContext) audioContext = new Context();
    const resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();

    if (!loadPromise) {
      loadPromise = fetch(SOURCE)
        .then(response => {
          if (!response.ok) throw new Error(`dialog SE fetch failed: ${response.status}`);
          return response.arrayBuffer();
        })
        .then(data => audioContext.decodeAudioData(data.slice(0)))
        .then(buffer => {
          decodedBuffer = buffer;
          return true;
        })
        .catch(error => {
          console.warn("Spell dialog SE Web Audio preload failed", error);
          return false;
        });
    }

    return Promise.all([resume, loadPromise]).then(([, loaded]) => Boolean(loaded));
  }

  function unlockAudio() {
    ensureWebAudio().catch(() => {});
  }

  document.addEventListener("pointerdown", unlockAudio, { capture: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });

  function playWebAudioPop() {
    if (!audioContext || audioContext.state !== "running" || !decodedBuffer) return false;

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    source.buffer = decodedBuffer;
    gain.gain.value = WEB_AUDIO_GAIN;
    source.connect(gain);
    gain.connect(audioContext.destination);
    source.start();
    return true;
  }

  function playFallbackPop() {
    const audio = fallbackPool[fallbackCursor];
    fallbackCursor = (fallbackCursor + 1) % fallbackPool.length;
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch (_) {}
  }

  function playPop({ chunk } = {}) {
    if (!Array.isArray(chunk) || !chunk.some(char => /\S/.test(char))) return;
    if (!playWebAudioPop()) {
      playFallbackPop();
      ensureWebAudio().catch(() => {});
    }
  }

  window.SpellDialogTyping.setStepListener(playPop);

  window.SpellDialogSfx = {
    source: SOURCE,
    volume: FALLBACK_VOLUME,
    gain: WEB_AUDIO_GAIN,
    playPop,
    unlock: unlockAudio,
    test: () => playPop({ chunk: ["あ"] })
  };
})();
