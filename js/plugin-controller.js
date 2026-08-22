(() => {
  "use strict";

  const G = window.SpellGame03;
  const audio = window.SpellAudio;
  if (!G || !audio) throw new Error("Plug-in controller dependencies are not loaded.");

  const EFFECT_SOURCE = "assets/effects/plugin/kirayuki1.webp";
  const LINE = "プラグイン！ルミエル.EXE トランスミッション！";
  const FRAME_COUNT = 10;
  const FRAME_MS = 154;
  const EFFECT_DURATION_MS = FRAME_COUNT * FRAME_MS;
  const IMAGE_LOAD_TIMEOUT_MS = 2500;

  const image = new Image();
  image.decoding = "async";
  image.src = EFFECT_SOURCE;

  let promptOpen = false;
  let transitioning = false;
  let overlay = null;
  let glow = null;
  let canvas = null;
  let context = null;
  let transitionPromise = null;

  const dialog = () => document.getElementById("field-dialog");
  const fieldActive = () => Boolean(document.getElementById("screen-field")?.classList.contains("active"));
  const dialogOpen = () => Boolean(dialog() && !dialog().classList.contains("hidden"));
  const storyOpen = () => Boolean(window.SpellStory?.isOverlayOpen?.());
  const menuOpen = () => Boolean(window.SpellMenu?.isOpen?.());
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const isZ = event => event.code === "KeyZ" || event.key === "z" || event.key === "Z";
  const isX = event => event.code === "KeyX" || event.key === "x" || event.key === "X";
  const editable = target => Boolean(target?.closest?.("input, textarea, [contenteditable='true']"));

  function ensureVisualLayer() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = "plugin-kirayuki-overlay";
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, {
      position: "fixed", inset: "0", width: "100vw", height: "100vh",
      pointerEvents: "auto", zIndex: "2147483000", display: "none",
      overflow: "hidden", background: "#05040b", opacity: "1"
    });

    glow = document.createElement("div");
    Object.assign(glow.style, {
      position: "absolute", inset: "0",
      background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,.96) 0%, rgba(225,235,255,.58) 20%, rgba(176,154,255,.24) 46%, rgba(5,4,11,0) 72%)",
      opacity: "0"
    });

    canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "absolute", inset: "0", width: "100%", height: "100%",
      display: "block", opacity: "1", filter: "brightness(1.7) contrast(1.12) saturate(1.15)"
    });

    const blockPointer = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    overlay.addEventListener("pointerdown", blockPointer, true);
    overlay.addEventListener("click", blockPointer, true);
    overlay.addEventListener("touchstart", blockPointer, { capture: true, passive: false });

    overlay.append(glow, canvas);
    document.body.appendChild(overlay);
    context = canvas.getContext("2d", { alpha: true });
  }

  async function ensureImage() {
    if (image.complete) {
      if (image.naturalWidth) return true;
      throw new Error("plug-in effect image failed to load");
    }
    if (image.decode) {
      try {
        await Promise.race([
          image.decode(),
          delay(IMAGE_LOAD_TIMEOUT_MS).then(() => { throw new Error("plug-in effect image timed out"); })
        ]);
        if (image.naturalWidth) return true;
      } catch (_) {}
    }
    await Promise.race([
      new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", () => reject(new Error("plug-in effect image failed to load")), { once: true });
      }),
      delay(IMAGE_LOAD_TIMEOUT_MS).then(() => { throw new Error("plug-in effect image timed out"); })
    ]);
    if (!image.naturalWidth) throw new Error("plug-in effect image unavailable");
    return true;
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
      image, 0, frame * frameHeight, frameWidth, frameHeight,
      (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight
    );
  }

  function showLayer() {
    ensureVisualLayer();
    overlay.style.display = "block";
    glow.getAnimations?.().forEach(animation => animation.cancel());
    if (typeof glow.animate === "function") {
      glow.animate([
        { opacity: 0, transform: "scale(.92)" },
        { opacity: 1, transform: "scale(1.05)", offset: .2 },
        { opacity: .72, transform: "scale(1.12)", offset: .72 },
        { opacity: 0, transform: "scale(1.2)" }
      ], { duration: EFFECT_DURATION_MS, easing: "ease-in-out", fill: "forwards" });
    } else {
      glow.style.opacity = "1";
    }
  }

  function hideLayer() {
    if (context && canvas) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    glow?.getAnimations?.().forEach(animation => animation.cancel());
    if (glow) glow.style.opacity = "0";
    if (overlay) overlay.style.display = "none";
  }

  function playVisualTransition() {
    if (transitionPromise) return transitionPromise;
    transitionPromise = (async () => {
      transitioning = true;
      window.SpellBgm?.pause?.();
      showLayer();
      try {
        await ensureImage();
        for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
          const size = resize();
          drawFrame(frame, size.width, size.height);
          await delay(FRAME_MS);
        }
      } catch (error) {
        console.warn("Spell plug-in Kirayuki failed; using glow-only transition.", error);
        await delay(EFFECT_DURATION_MS);
      }
    })().finally(() => {
      hideLayer();
      transitioning = false;
      transitionPromise = null;
    });
    return transitionPromise;
  }

  function start() {
    if (!fieldActive() || dialogOpen() || storyOpen() || menuOpen() || transitioning) return false;
    const box = dialog();
    if (!box || !window.SpellField?.showDialog) return false;
    promptOpen = true;
    box.dataset.pluginPrompt = "1";
    window.SpellField.showDialog({ speaker: "sophie", text: LINE, typing: { allowSkip: true } });
    return true;
  }

  function closePrompt() {
    const box = dialog();
    if (box) delete box.dataset.pluginPrompt;
    promptOpen = false;
    if (dialogOpen()) document.getElementById("field-action")?.click();
  }

  async function openFirstEditor() {
    await playVisualTransition();
    await Promise.resolve(G.openComputer?.());
    await new Promise(resolve => requestAnimationFrame(resolve));
    const button = document.querySelector("#screen-hub [data-python-spellbook]");
    if (button instanceof HTMLElement) button.click();
  }

  function confirm() {
    audio.prepareFromGesture();
    audio.playSfx("plugin-sparkle");
    closePrompt();
    openFirstEditor().catch(error => {
      console.error("Spell plug-in editor entry failed", error);
      G.openComputer?.();
    });
  }

  function cancelPromptStateIfClosed() {
    if (promptOpen && !dialogOpen()) {
      promptOpen = false;
      const box = dialog();
      if (box) delete box.dataset.pluginPrompt;
    }
  }

  window.addEventListener("keydown", event => {
    if (editable(event.target)) return;
    cancelPromptStateIfClosed();

    if (transitioning) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (isX(event)) {
      if (start()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    if (!isZ(event) || !promptOpen || !dialogOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (window.SpellDialogTyping?.handleAdvance?.()) return;
    confirm();
  }, true);

  window.SpellPlugin = {
    start,
    isPromptOpen: () => promptOpen,
    isTransitioning: () => transitioning,
    playTransition: playVisualTransition,
    testSound: () => audio.playSfx("plugin-sparkle"),
    status: () => ({ promptOpen, transitioning, audio: audio.sfxStatus("plugin-sparkle") })
  };
})();
