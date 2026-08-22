(() => {
  "use strict";

  const SOURCE = "assets/effects/plugin/kirayuki1.webp";
  const FRAME_COUNT = 10;
  const FRAME_MS = 90;
  const image = new Image();
  image.decoding = "async";
  image.src = SOURCE;

  let canvas = null;
  let context = null;
  let playing = null;

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
      pointerEvents: "auto",
      zIndex: "10000",
      display: "none"
    });
    document.body.appendChild(canvas);
    context = canvas.getContext("2d", { alpha: true });
  }

  async function ensureImage() {
    if (image.complete && image.naturalWidth) return;
    if (image.decode) {
      try {
        await image.decode();
        return;
      } catch (_) {}
    }
    await new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    });
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
    context.save();
    context.globalCompositeOperation = "lighter";
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
    context.restore();
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function play() {
    if (playing) return playing;
    playing = (async () => {
      ensureCanvas();
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

  function pluginDialog() {
    const dialog = document.getElementById("field-dialog");
    if (!dialog || dialog.classList.contains("hidden")) return null;
    return dialog.dataset.pluginPrompt === "1" ? dialog : null;
  }

  async function finishPlugin(dialog) {
    delete dialog.dataset.pluginPrompt;
    document.getElementById("field-action")?.click();
    try {
      await play();
    } catch (error) {
      console.error("Plugin transition failed", error);
    }
    window.SpellGame03?.openComputer?.();
  }

  function onKeydown(event) {
    if (playing) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!isZKey(event)) return;
    const dialog = pluginDialog();
    if (!dialog) return;
    if (window.SpellDialogTyping?.isTyping?.()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finishPlugin(dialog);
  }

  document.addEventListener("keydown", onKeydown, true);

  window.SpellPluginTransition = {
    play,
    isPlaying: () => Boolean(playing)
  };
})();
