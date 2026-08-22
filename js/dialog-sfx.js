(() => {
  "use strict";
  if (!window.SpellDialogTyping?.setStepListener || !window.SpellAudio) return;

  function playPop({ chunk } = {}) {
    if (!Array.isArray(chunk) || !chunk.some(char => /\S/.test(char))) return;
    window.SpellAudio.playSfx("dialog-pop");
  }

  window.SpellDialogTyping.setStepListener(playPop);
  window.SpellDialogSfx = {
    source: "assets/audio/sfx/dialog-pop.wav",
    playPop,
    unlock: () => window.SpellAudio.prepareFromGesture(),
    test: () => window.SpellAudio.playSfx("dialog-pop")
  };
})();
