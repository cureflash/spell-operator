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
  let openComputerWrapped = false;

  let audioContext = null;
  let decodedBuffer = null;
  let audioLoadPromise = null;
  let fallbackUrlPromise = null;
  const fallbackAudio = new Audio();
  fallbackAudio.preload = "auto";

  function currentSfxVolume() {
    const value = window.SpellAudioSettings?.get?.("sfx");
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  }

  function base64Bytes() {
    return fetch(SE_SOURCE, { cache: "force-cache" })
      .then(response => {
        if (!response.ok) throw new Error(`plug-in SE fetch failed: ${response.status}`);
        return response.text();
      })
      .then(encoded => {
        const binary = atob(encoded.replace(/\s+/g, ""));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return bytes;
      });
  }

  function ensureWebAudio() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return Promise.resolve(false);

    // Create the context only after a real user gesture. This mirrors the
    // dialog SE path that already works on Safari/Chrome.
    if (!audioContext) audioContext = new Context();
    const resume = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();

    if (!audioLoadPromise) {
      audioLoadPromise = base64Bytes()
        .then(bytes => audioContext.decodeAudioData(bytes.buffer.slice(0)))
        .then(buffer => {
          decodedBuffer = buffer;
          return true;
        })
        .catch(error => {
          console.warn("Spell plug-in SE decode failed", error);
          return false;
        });
    }

    return Promise.all([resume, audioLoadPromise]).then(([, loaded]) => Boolean(loaded));
  }

  function unlockAudio() {
    ensureWebAudio().catch(error => console.warn("Spell plug-in audio unlock failed", error));
  }

  // Unlock early on the same user gestures that successfully unlock dialog SE.
  document.addEventListener("pointerdown", unlockAudio, { capture: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });

  function playWebAudioSparkle() {
    if (!audioContext || audioContext.state !== "running" || !decodedBuffer) return false;
    if (currentSfxVolume() <= 0) return true;
    try {
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = decodedBuffer;
      gain.gain.value = currentSfxVolume();
      source.connect(gain);
      gain.connect(audioContext.destination);
      source.start(0);
      return true;
    } catch (error) {
      console.warn("Spell plug-in Web Audio playback failed", error);
      return false;
    }
  }

  function playSynthSparkle() {
    if (!audioContext || audioContext.state !== "running" || currentSfxVolume() <= 0) return false;
    try {
      const now = audioContext.currentTime;
      const master = audioContext.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(Math.max(0.02, currentSfxVolume() * 0.32), now + 0.015);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
      master.connect(audioContext.destination);

      [1174.66, 1567.98, 2093.00].forEach((frequency, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, now + index * 0.06);
        gain.gain.setValueAtTime(0.0001, now + index * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.5, now + index * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.06 + 0.34);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + index * 0.06);
        osc.stop(now + index * 0.06 + 0.36);
      });
      return true;
    } catch (error) {
      console.warn("Spell plug-in synthesized fallback failed", error);
      return false;
    }
  }

  function ensureFallbackUrl() {
    if (fallbackUrlPromise) return fallbackUrlPromise;
    fallbackUrlPromise = base64Bytes()
      .then(bytes => URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" })))
      .then(url => {
        fallbackAudio.src = url;
        fallbackAudio.load();
        return url;
      })
      .catch(error => {
        console.warn("Spell plug-in HTMLAudio preload failed", error);
        fallbackUrlPromise = null;
        return null;
      });
    return fallbackUrlPromise;
  }

  function playHtmlAudioFallback() {
    if (currentSfxVolume() <= 0) return;
    const start = () => {
      try {
        fallbackAudio.pause();
        fallbackAudio.currentTime = 0;
        fallbackAudio.volume = currentSfxVolume();
        const promise = fallbackAudio.play();
        if (promise?.catch) promise.catch(error => console.warn("Spell plug-in HTMLAudio playback blocked", error));
      } catch (error) {
        console.warn("Spell plug-in HTMLAudio playback failed", error);
      }
    };
    if (fallbackAudio.src) start();
    else ensureFallbackUrl().then(url => { if (url) start(); });
  }

  function playSound() {
    if (currentSfxVolume() <= 0) return;
    if (playWebAudioSparkle()) return;

    // If the real MP3 has not finished decoding yet, still provide an audible
    // sparkle immediately instead of failing silently.
    if (playSynthSparkle()) {
      ensureWebAudio().catch(() => {});
      return;
    }

    playHtmlAudioFallback();
    ensureWebAudio().catch(() => {});
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
    unlockAudio();
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
  if (!installOpenComputerWrapper()) {
    const timer = setInterval(() => {
      if (installOpenComputerWrapper()) clearInterval(timer);
    }, 50);
    setTimeout(() => clearInterval(timer), 5000);
  }

  window.SpellPluginTransition = {
    play,
    unlockAudioFromGesture: unlockAudio,
    testSound: playSound,
    isPlaying: () => Boolean(playing)
  };
})();
