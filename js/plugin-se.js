(() => {
  "use strict";

  const SOURCE = "assets/audio/sfx/plugin-sparkle.base64?v=3";
  const DEFAULT_VOLUME = 0.5;
  const RECOVERY_SUFFIX = "VVV";

  const media = new Audio();
  media.preload = "auto";

  let loadPromise = null;
  let mediaReady = false;
  let objectUrl = "";
  let repairedTruncatedBase64 = false;
  let base64Length = 0;
  let decodedBytes = 0;
  let lastError = "";
  let lastPlayError = "";

  function currentVolume(){
    const value = window.SpellAudioSettings?.get?.("sfx");
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;
  }

  function normalizeBase64(text){
    let clean = String(text || "").replace(/\s+/g, "");
    base64Length = clean.length;

    // The repository copy of plugin-sparkle.base64 is truncated: its payload
    // length is 1 mod 4, which cannot be valid Base64. The missing tail is
    // part of the repeated V padding at the end of the original asset.
    // Recover those three characters before decoding. This is intentionally
    // specific to this known asset; do not silently repair arbitrary audio.
    if(clean.length % 4 === 1){
      clean += RECOVERY_SUFFIX;
      repairedTruncatedBase64 = true;
    }

    if(clean.length % 4 === 2) clean += "==";
    else if(clean.length % 4 === 3) clean += "=";

    return clean;
  }

  function decodeBytes(text){
    const normalized = normalizeBase64(text);
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    decodedBytes = bytes.length;
    return bytes;
  }

  function waitUntilPlayable(){
    if(media.readyState >= 2){
      mediaReady = true;
      return Promise.resolve(true);
    }

    return new Promise(resolve => {
      let settled = false;
      const finish = value => {
        if(settled) return;
        settled = true;
        mediaReady = value;
        resolve(value);
      };
      media.addEventListener("loadeddata", () => finish(true), { once: true });
      media.addEventListener("canplaythrough", () => finish(true), { once: true });
      media.addEventListener("error", () => finish(false), { once: true });
      setTimeout(() => finish(media.readyState >= 2), 5000);
    });
  }

  function ensureLoaded(){
    if(loadPromise) return loadPromise;

    loadPromise = fetch(SOURCE, { cache: "reload" })
      .then(response => {
        if(!response.ok) throw new Error(`plug-in SE fetch failed: ${response.status}`);
        return response.text();
      })
      .then(text => {
        const bytes = decodeBytes(text);
        if(!bytes.length) throw new Error("plug-in SE decoded to zero bytes");

        if(objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
        media.src = objectUrl;
        media.load();
        return waitUntilPlayable();
      })
      .then(ok => {
        if(!ok) throw new Error("plug-in SE media element never became playable");
        lastError = "";
        return true;
      })
      .catch(error => {
        mediaReady = false;
        lastError = String(error?.message || error);
        console.error("Original plug-in SE load failed", error, status());
        return false;
      });

    return loadPromise;
  }

  function prepareFromGesture(){
    // HTMLMediaElement is the same playback primitive already used by BGM.
    // Keep this path single and predictable instead of opening a second
    // AudioContext just for one plug-in SE.
    ensureLoaded().catch(() => {});
  }

  function playOriginal(){
    const volume = currentVolume();
    if(volume <= 0){
      lastPlayError = "sfx-volume-is-zero";
      console.warn("Original plug-in SE is muted by the SFX volume setting.", status());
      return false;
    }

    if(!mediaReady || !media.src){
      lastPlayError = "media-not-ready";
      ensureLoaded();
      console.warn("Original plug-in SE is not ready.", status());
      return false;
    }

    try{
      media.pause();
      media.currentTime = 0;
      media.muted = false;
      media.volume = volume;
      const promise = media.play();
      if(promise?.then){
        promise.then(() => {
          lastPlayError = "";
        }).catch(error => {
          lastPlayError = String(error?.message || error);
          console.error("Original plug-in SE playback was blocked or failed", error, status());
        });
      }
      return true;
    }catch(error){
      lastPlayError = String(error?.message || error);
      console.error("Original plug-in SE playback failed", error, status());
      return false;
    }
  }

  function status(){
    return {
      source: SOURCE,
      base64Length,
      base64Remainder: base64Length % 4,
      repairedTruncatedBase64,
      decodedBytes,
      mediaReady,
      readyState: media.readyState,
      volume: currentVolume(),
      lastError,
      lastPlayError
    };
  }

  // Start fetching as soon as this module is loaded. The final Z event only
  // needs to call play(), keeping playback inside the user's key gesture.
  ensureLoaded();

  window.SpellPluginSe = {
    playOriginal,
    prepareFromGesture,
    ready: status,
    status
  };
})();
