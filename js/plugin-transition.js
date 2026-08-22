(() => {
  "use strict";

  const EFFECT_SOURCE = "assets/effects/plugin/kirayuki1.webp";
  const SE_SOURCE = "assets/audio/sfx/plugin-sparkle.base64";
  const FRAME_COUNT = 10;
  const FRAME_MS = 154;
  const ARM_WINDOW_MS = 500;
  const IMAGE_LOAD_TIMEOUT_MS = 2500;

  const image = new Image();
  image.decoding = "async";
  image.src = EFFECT_SOURCE;

  let canvas = null;
  let context = null;
  let playing = null;
  let armedUntil = 0;
  let soundUrlPromise = null;
  let openComputerWrapped = false;

  const sound = new Audio();
  sound.preload = "auto";

  function currentSfxVolume() {
    const value = window.SpellAudioSettings?.snapshot?.().sfx;
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  }

  function ensureSoundUrl() {
    if (soundUrlPromise) return soundUrlPromise;
    soundUrlPromise = fetch(SE_SOURCE, { cache: "force-cache" })
      .then(response => {
        if (!response.ok) throw new Error(`plug-in SE fetch failed: ${response.status}`);
        return response.text();
      })
      .then(encoded => {
        const binary = atob(encoded.trim());
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
      })
      .then(url => {
        sound.src = url;
        sound.load();
        return url;
      })
      .catch(error => {
        console.warn("Spell plug-in SE preload failed", error);
        soundUrlPromise = null;
        return null;
      });
    return soundUrlPromise;
  }

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "plugin-kirayuki-transition";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "10000",
      display: "none",
      mixBlendMode: "screen"
    });
    document.body.appendChild(canvas);
    context = canvas.getContext("2d", { alpha: true });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function ensureImage() {
    if (image.complete) {
      if (image.naturalWidth) return;
      throw new Error("plug-in effect image failed to load.");
    }
    if (image.decode) {
      try {
        await Promise.race([
          image.decode(),
          delay(IMAGE_LOAD_TIMEOUT_MS).then(() => { throw new Error("plug-in effect image decode timed out."); })
        ]);
        if (image.naturalWidth) return;
      } catch (_) {}
    }
    await Promise.race([
      new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", () => reject(new Error("plug-in effect image failed to load.")), { once: true });
      }),
      delay(IMAGE_LOAD_TIMEOUT_MS).then(() => { throw new Error("plug-in effect image load timed out."); })
    ]);
    if (!image.naturalWidth) throw new Error("plug-in effect image is unavailable.");
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function drawFrame(frame, width, height) {
    const frameWidth = image.naturalWidth;
    const frameHeight = image.naturalHeight / FRAME_COUNT;
    const scale = Math.max(width / frameWidth, height / frameHeight);
    const drawWidth = frameWidth * scale;
    const drawHeight = frameHeight * scale;
    context.clearRect(0, 0, width, height);
    context.drawImage(
      image,
      0,
      frame * frameHeight,
      frameWidth,
      frameHeight,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
  }

  function playSound() {
    const start = () => {
      try {
        sound.pause();
        sound.currentTime = 0;
        sound.volume = currentSfxVolume();
        const promise = sound.play();
        if (promise?.catch) promise.catch(() => {});
      } catch (_) {}
    };
    if (sound.src) {
      start();
      return;
    }
    ensureSoundUrl().then(url => {
      if (url) start();
    });
  }

  function play() {
    if (playing) return playing;
    playing = (async () => {
      ensureCanvas();
      playSound();
      await ensureImage();
      canvas.style.display = "block";
      for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
        const { width, height } = resize();
        drawFrame(frame, width, height);
        await delay(FRAME_MS);
      }
    })().finally(() => {
      if (context && canvas) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = "none";
      }
      playing = null;
    });
    return playing;
  }

  function isZKey(event) {
    return event.code === "KeyZ" || event.key === "z" || event.key === "Z";
  }

  function onKeydown(event) {
    if (playing) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!isZKey(event)) return;
    const dialog = document.getElementById("field-dialog");
    if (dialog?.dataset.pluginPrompt !== "1") return;
    if (window.SpellDialogTyping?.isTyping?.()) return;
    armedUntil = performance.now() + ARM_WINDOW_MS;
  }

  function installOpenComputerWrapper() {
    if (openComputerWrapped) return true;
    const game = window.SpellGame03;
    if (!game || typeof game.openComputer !== "function") return false;
    const originalOpenComputer = game.openComputer;
    game.openComputer = function (...args) {
      if (performance.now() > armedUntil) return originalOpenComputer.apply(this, args);
      armedUntil = 0;
      return play()
        .catch(error => console.warn("Spell plug-in transition failed; opening editor without effect.", error))
        .then(() => originalOpenComputer.apply(this, args));
    };
    openComputerWrapped = true;
    return true;
  }

  window.addEventListener("keydown", onKeydown, true);
  ensureSoundUrl();
  if (!installOpenComputerWrapper()) {
    const timer = setInterval(() => {
      if (installOpenComputerWrapper()) clearInterval(timer);
    }, 50);
    setTimeout(() => clearInterval(timer), 5000);
  }

  window.SpellPluginTransition = {
    play,
    isPlaying: () => Boolean(playing)
  };
})();