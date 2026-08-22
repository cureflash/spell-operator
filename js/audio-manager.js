(() => {
  "use strict";

  const DEFAULT_VOLUME = 0.5;
  const sfxDefs = new Map();
  const sfxState = new Map();
  const bgmDefs = new Map();
  const bgm = new Audio();
  bgm.preload = "auto";
  bgm.loop = true;
  bgm.volume = window.SpellAudioSettings?.get?.("bgm") ?? DEFAULT_VOLUME;

  let audioContext = null;
  let activeBgmId = null;
  let userActivated = false;

  function clamp(value, fallback = DEFAULT_VOLUME) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
  }

  function sfxVolume() {
    return clamp(window.SpellAudioSettings?.get?.("sfx"));
  }

  function ensureContext() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    if (!audioContext) audioContext = new Context();
    if (audioContext.state === "suspended") {
      try {
        const promise = audioContext.resume();
        if (promise?.catch) promise.catch(() => {});
      } catch (_) {}
    }
    return audioContext;
  }

  function decodeBase64(text, repairSuffix = "") {
    let clean = String(text || "").replace(/\s+/g, "");
    if (clean.length % 4 === 1 && repairSuffix) clean += repairSuffix;
    if (clean.length % 4 === 2) clean += "==";
    else if (clean.length % 4 === 3) clean += "=";
    if (clean.length % 4 !== 0) throw new Error("invalid Base64 length");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function registerSfx(id, definition) {
    if (!id || !definition) return false;
    sfxDefs.set(id, { poolSize: 4, mime: "audio/mpeg", ...definition });
    if (!sfxState.has(id)) {
      sfxState.set(id, {
        bytes: null,
        buffer: null,
        objectUrl: "",
        pool: [],
        cursor: 0,
        loadPromise: null,
        decodePromise: null,
        lastError: "",
        lastPlayError: ""
      });
    }
    preloadSfx(id);
    return true;
  }

  function registerBgm(id, src) {
    if (!id || !src) return false;
    bgmDefs.set(id, src);
    return true;
  }

  function stateFor(id) {
    return sfxState.get(id) || null;
  }

  function buildFallbackPool(id) {
    const def = sfxDefs.get(id);
    const state = stateFor(id);
    if (!def || !state || state.pool.length) return;
    const source = state.objectUrl || def.src;
    if (!source) return;
    state.pool = Array.from({ length: Math.max(1, def.poolSize || 1) }, () => {
      const audio = new Audio(source);
      audio.preload = "auto";
      audio.volume = sfxVolume();
      return audio;
    });
  }

  function preloadSfx(id) {
    const def = sfxDefs.get(id);
    const state = stateFor(id);
    if (!def || !state) return Promise.resolve(false);
    if (state.loadPromise) return state.loadPromise;

    state.loadPromise = (async () => {
      try {
        let bytes;
        if (def.kind === "base64-text") {
          const response = await fetch(def.src, { cache: "reload" });
          if (!response.ok) throw new Error(`${id} fetch failed: ${response.status}`);
          bytes = decodeBase64(await response.text(), def.repairSuffix || "");
        } else {
          const response = await fetch(def.src, { cache: "force-cache" });
          if (!response.ok) throw new Error(`${id} fetch failed: ${response.status}`);
          bytes = new Uint8Array(await response.arrayBuffer());
        }
        if (!bytes.length) throw new Error(`${id} decoded to zero bytes`);
        state.bytes = bytes;
        state.objectUrl = URL.createObjectURL(new Blob([bytes], { type: def.mime }));
        buildFallbackPool(id);
        state.lastError = "";
        return true;
      } catch (error) {
        state.lastError = String(error?.message || error);
        console.error(`Spell audio preload failed: ${id}`, error);
        return false;
      }
    })();
    return state.loadPromise;
  }

  function decodeSfx(id) {
    const state = stateFor(id);
    if (!state) return Promise.resolve(false);
    if (state.buffer) return Promise.resolve(true);
    if (state.decodePromise) return state.decodePromise;
    const context = ensureContext();
    if (!context) return Promise.resolve(false);

    state.decodePromise = preloadSfx(id).then(ok => {
      if (!ok || !state.bytes) return false;
      return context.decodeAudioData(state.bytes.buffer.slice(0)).then(buffer => {
        state.buffer = buffer;
        return true;
      }).catch(error => {
        state.lastError = String(error?.message || error);
        console.warn(`Spell audio Web Audio decode failed: ${id}`, error);
        return false;
      });
    });
    return state.decodePromise;
  }

  function prepareFromGesture() {
    userActivated = true;
    ensureContext();
    for (const id of sfxDefs.keys()) decodeSfx(id).catch(() => {});
  }

  function playWebAudio(id, volume) {
    const state = stateFor(id);
    if (!audioContext || audioContext.state !== "running" || !state?.buffer) return false;
    try {
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = state.buffer;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(audioContext.destination);
      source.start(0);
      state.lastPlayError = "";
      return true;
    } catch (error) {
      state.lastPlayError = String(error?.message || error);
      console.warn(`Spell audio Web Audio playback failed: ${id}`, error);
      return false;
    }
  }

  function playFallback(id, volume) {
    const state = stateFor(id);
    if (!state) return false;
    buildFallbackPool(id);
    if (!state.pool.length) return false;
    const audio = state.pool[state.cursor % state.pool.length];
    state.cursor = (state.cursor + 1) % state.pool.length;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = volume;
      const promise = audio.play();
      if (promise?.catch) promise.catch(error => {
        state.lastPlayError = String(error?.message || error);
        console.warn(`Spell audio media playback failed: ${id}`, error);
      });
      return true;
    } catch (error) {
      state.lastPlayError = String(error?.message || error);
      return false;
    }
  }

  function playSfx(id) {
    const volume = sfxVolume();
    const state = stateFor(id);
    if (!state || volume <= 0) return false;
    if (playWebAudio(id, volume)) return true;
    const played = playFallback(id, volume);
    if (!played) preloadSfx(id).then(() => decodeSfx(id)).catch(() => {});
    return played;
  }

  function playBgm(id, { restart = false } = {}) {
    const src = bgmDefs.get(id);
    if (!src) return false;
    if (activeBgmId !== id) {
      bgm.pause();
      activeBgmId = id;
      bgm.src = src;
      bgm.loop = true;
      try { bgm.currentTime = 0; } catch (_) {}
    } else if (restart) {
      try { bgm.currentTime = 0; } catch (_) {}
    }
    if (!userActivated) return true;
    const promise = bgm.play();
    if (promise?.catch) promise.catch(() => {});
    return true;
  }

  function pauseBgm({ reset = false, clear = false } = {}) {
    bgm.pause();
    if (reset) {
      try { bgm.currentTime = 0; } catch (_) {}
    }
    if (clear) activeBgmId = null;
  }

  function sfxStatus(id) {
    const state = stateFor(id);
    return state ? {
      id,
      loaded: Boolean(state.bytes?.length),
      decoded: Boolean(state.buffer),
      bytes: state.bytes?.length || 0,
      fallbackPool: state.pool.length,
      contextState: audioContext?.state || "none",
      lastError: state.lastError,
      lastPlayError: state.lastPlayError,
      volume: sfxVolume()
    } : null;
  }

  window.SpellAudioSettings?.subscribe?.(settings => {
    bgm.volume = clamp(settings.bgm);
    for (const state of sfxState.values()) {
      state.pool.forEach(audio => { audio.volume = clamp(settings.sfx); });
    }
  });

  window.addEventListener("pointerdown", prepareFromGesture, true);
  window.addEventListener("keydown", prepareFromGesture, true);

  registerSfx("dialog-pop", {
    kind: "url",
    src: "assets/audio/sfx/dialog-pop.wav",
    mime: "audio/wav",
    poolSize: 8
  });
  registerSfx("plugin-sparkle", {
    kind: "base64-text",
    src: "assets/audio/sfx/plugin-sparkle.base64?v=4",
    mime: "audio/mpeg",
    poolSize: 2,
    repairSuffix: "VVV"
  });

  window.SpellAudio = {
    registerSfx,
    registerBgm,
    preloadSfx,
    prepareFromGesture,
    playSfx,
    playBgm,
    pauseBgm,
    isActivated: () => userActivated,
    currentBgm: () => activeBgmId,
    bgmElement: bgm,
    sfxStatus,
    status: () => ({
      activated: userActivated,
      contextState: audioContext?.state || "none",
      bgm: activeBgmId,
      bgmPaused: bgm.paused,
      bgmVolume: bgm.volume,
      sfxVolume: sfxVolume()
    })
  };
})();
