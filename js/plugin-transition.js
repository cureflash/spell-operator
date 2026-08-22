(() => {
  "use strict";

  const EFFECT_SOURCE = "assets/effects/plugin/kirayuki1.webp";
  const SE_SOURCE = "assets/audio/sfx/plugin-sparkle.base64";
  const FRAME_COUNT = 10;
  const FRAME_MS = 154;
  const EFFECT_DURATION_MS = FRAME_COUNT * FRAME_MS;
  const ARM_WINDOW_MS = 500;
  const IMAGE_LOAD_TIMEOUT_MS = 2500;

  const image = new Image();
  image.decoding = "async";
  image.src = EFFECT_SOURCE;

  let overlay = null;
  let glow = null;
  let canvas = null;
  let context = null;
  let playing = null;
  let armedUntil = 0;
  let soundUrlPromise = null;
  let soundBufferPromise = null;
  let openComputerWrapped = false;

  const sound = new Audio();
  sound.preload = "auto";

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const audioContext = AudioContextCtor ? new AudioContextCtor() : null;

  function currentSfxVolume() {
    const value = window.SpellAudioSettings?.snapshot?.().sfx;
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  }

  function fetchSoundBytes() {
    return fetch(SE_SOURCE, { cache: "force-cache" })
      .then(response => {
        if (!response.ok) throw new Error(`plug-in SE fetch failed: ${response.status}`);
        return response.text();
      })
      .then(encoded => {
        const binary = atob(encoded.trim());
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        return bytes;
      });
  }

  function ensureSoundUrl() {
    if (soundUrlPromise) return soundUrlPromise;
    soundUrlPromise = fetchSoundBytes()
      .then(bytes => URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" })))
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

  function decodeAudioData(arrayBuffer) {
    if (!audioContext) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = buffer => {
        if (settled) return;
        settled = true;
        resolve(buffer);
      };
      const fail = error => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      try {
        const result = audioContext.decodeAudioData(arrayBuffer.slice(0), done, fail);
        if (result?.then) result.then(done, fail);
      } catch (error) {
        fail(error);
      }
    });
  }

  function ensureSoundBuffer() {
    if (!audioContext) return Promise.resolve(null);
    if (soundBufferPromise) return soundBufferPromise;
    soundBufferPromise = fetchSoundBytes()
      .then(bytes => decodeAudioData(bytes.buffer))
      .catch(error => {
        console.warn("Spell plug-in Web Audio preload failed", error);
        soundBufferPromise = null;
        return null;
      });
    return soundBufferPromise;
  }

  function resumeAudioFromGesture() {
    if (!audioContext || audioContext.state !== "suspended") return;
    try {
      const resumed = audioContext.resume();
      if (resumed?.catch) resumed.catch(() => {});
    } catch (_) {}
  }

  function playHtmlAudioFallback() {
    const start = () => {
      try {
        sound.pause();
        sound.currentTime = 0;
        sound.volume = currentSfxVolume();
        const promise = sound.play();
        if (promise?.catch) promise.catch(error => console.warn("Spell plug-in SE playback blocked", error));
      } catch (error) {
        console.warn("Spell plug-in SE playback failed", error);
      }
    };
    if (sound.src) start();
    else ensureSoundUrl().then(url => { if (url) start(); });
  }

  function playSound() {
    resumeAudioFromGesture();
    if (!audioContext) {
      playHtmlAudioFallback();
      return;
    }

    ensureSoundBuffer().then(buffer => {
      if (!buffer) {
        playHtmlAudioFallback();
        return;
      }
      try {
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        source.buffer = buffer;
        gain.gain.value = currentSfxVolume();
        source.connect(gain);
        gain.connect(audioContext.destination);
        source.start(0);
      } catch (error) {
        console.warn("Spell plug-in Web Audio playback failed", error);
        playHtmlAudioFallback();
      }
    });
  }

  function ensureCanvas() {
    if (canvas) return;

    overlay = document.createElement("div");
    overlay.id = "plugin-kirayuki-overlay";
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "auto",
      zIndex: "2147483000",
      display: "none",
      overflow: "hidden",
      background: "#05040b",
      opacity: "1"
    });

    glow = document.createElement("div");
    glow.id = "plugin-kirayuki-glow";
    Object.assign(glow.style, {
      position: "absolute",
      inset: "0",
      background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,.96) 0%, rgba(225,235,255,.58) 20%, rgba(176,154,255,.24) 46%, rgba(5,4,11,0) 72%)",
      opacity: "0"
    });

    canvas = document.createElement("canvas");
    canvas.id = "plugin-kirayuki-transition";
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      opacity: "1",
      filter: "brightness(1.7) contrast(1.12) saturate(1.15)"
    });

    const blockInput = event => {
      event.preventDefault();
      event.stopPropagation();
    };
    overlay.addEventListener("pointerdown", blockInput, true);
    overlay.addEventListener("click", blockInput, true);
    overlay.addEventListener("touchstart", blockInput, { capture: true, passive: false });

    overlay.appendChild(glow);
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);
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
    const scale = Math.min(width / frameWidth, height / frameHeight);
    const drawWidth = frameWidth * scale;
    const drawHeight = frameHeight * scale;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";
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

  function showEffectScreen() {
    overlay.style.display = "block";
    glow.getAnimations?.().forEach(animation => animation.cancel());
    if (typeof glow.animate === "function") {
      glow.animate(
        [
          { opacity: 0, transform: "scale(.92)" },
          { opacity: 1, transform: "scale(1.05)", offset: 0.2 },
          { opacity: 0.72, transform: "scale(1.12)", offset: 0.72 },
          { opacity: 0, transform: "scale(1.2)" }
        ],
        { duration: EFFECT_DURATION_MS, easing: "ease-in-out", fill: "forwards" }
      );
    } else {
      glow.style.opacity = "1";
    }
  }

  function pauseFieldBgm() {
    try { window.SpellBgm?.element?.pause?.(); } catch (_) {}
  }

  function play() {
    if (playing) return playing;
    playing = (async () => {
      ensureCanvas();
      pauseFieldBgm();
      playSound();
      showEffectScreen();

      try {
        await ensureImage();
        for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
          const { width, height } = resize();
          drawFrame(frame, width, height);
          await delay(FRAME_MS);
        }
      } catch (error) {
        console.warn("Spell plug-in Kirayuki image failed; using glow-only transition.", error);
        await delay(EFFECT_DURATION_MS);
      }
    })().finally(() => {
      if (context && canvas) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (glow) {
        glow.getAnimations?.().forEach(animation => animation.cancel());
        glow.style.opacity = "0";
      }
      if (overlay) overlay.style.display = "none";
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

    // Resume Web Audio directly inside the user's Z-key gesture so Safari/Chrome
    // permit the sparkle SE to start even though the decoded buffer is loaded async.
    resumeAudioFromGesture();
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
      return play().then(() => originalOpenComputer.apply(this, args));
    };
    openComputerWrapped = true;
    return true;
  }

  window.addEventListener("keydown", onKeydown, true);
  ensureSoundBuffer();
  ensureSoundUrl();
  if (!installOpenComputerWrapper()) {
    const timer = setInterval(() => {
      if (installOpenComputerWrapper()) clearInterval(timer);
    }, 50);
    setTimeout(() => clearInterval(timer), 5000);
  }

  window.SpellPluginTransition = {
    play,
    unlockAudioFromGesture: resumeAudioFromGesture,
    isPlaying: () => Boolean(playing)
  };
})();
