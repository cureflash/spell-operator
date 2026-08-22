(() => {
  "use strict";

  const EFFECT_SOURCE = "assets/effects/plugin/kirayuki1.webp";
  const FRAME_COUNT = 10;
  const FRAME_MS = 154;
  const EFFECT_DURATION_MS = FRAME_COUNT * FRAME_MS;
  const IMAGE_LOAD_TIMEOUT_MS = 2500;

  const image = new Image();
  image.decoding = "async";
  image.src = EFFECT_SOURCE;

  let overlay = null;
  let glow = null;
  let canvas = null;
  let context = null;
  let playing = null;

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

  window.SpellPluginTransition = {
    play,
    isPlaying: () => Boolean(playing)
  };
})();
