(() => {
  "use strict";

  const STORAGE_KEY = "spell-operator-audio-settings";
  const DEFAULTS = Object.freeze({ bgm: 0.5, sfx: 0.5 });
  const listeners = new Set();

  const clamp = value => Math.max(0, Math.min(1, Number(value)));

  function readStored() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return {
        bgm: Number.isFinite(Number(parsed?.bgm)) ? clamp(parsed.bgm) : DEFAULTS.bgm,
        sfx: Number.isFinite(Number(parsed?.sfx)) ? clamp(parsed.sfx) : DEFAULTS.sfx
      };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  const state = readStored();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function notify() {
    const snapshot = { ...state };
    listeners.forEach(listener => {
      try { listener(snapshot); } catch (error) { console.warn("Audio setting listener failed", error); }
    });
  }

  function set(kind, value) {
    if (kind !== "bgm" && kind !== "sfx") return false;
    const next = clamp(value);
    if (state[kind] === next) return true;
    state[kind] = next;
    persist();
    notify();
    return true;
  }

  function adjust(kind, delta) {
    return set(kind, Math.round((state[kind] + Number(delta || 0)) * 10) / 10);
  }

  function reset() {
    state.bgm = DEFAULTS.bgm;
    state.sfx = DEFAULTS.sfx;
    persist();
    notify();
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    listener({ ...state });
    return () => listeners.delete(listener);
  }

  window.SpellAudioSettings = {
    defaults: { ...DEFAULTS },
    get: kind => kind === "bgm" || kind === "sfx" ? state[kind] : null,
    snapshot: () => ({ ...state }),
    set,
    adjust,
    reset,
    subscribe
  };
})();
