(() => {
  "use strict";

  const SOURCE = "assets/audio/sfx/plugin-sparkle.base64?v=2";
  const DEFAULT_VOLUME = 0.5;

  let encodedText = "";
  let rawBytes = null;
  let sourceReady = false;
  let loadPromise = null;
  let audioContext = null;
  let decodedBuffer = null;
  let decodePromise = null;
  let mediaReady = false;
  let mediaObjectUrl = "";
  let warmed = false;

  const media = new Audio();
  media.preload = "auto";

  function currentVolume(){
    const value = window.SpellAudioSettings?.get?.("sfx");
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_VOLUME;
  }

  function decodeBase64(text){
    const clean = text.replace(/\s+/g, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function ensureSource(){
    if(loadPromise) return loadPromise;
    loadPromise = fetch(SOURCE, { cache: "reload" })
      .then(response => {
        if(!response.ok) throw new Error(`plug-in SE fetch failed: ${response.status}`);
        return response.text();
      })
      .then(text => {
        encodedText = text.replace(/\s+/g, "");
        rawBytes = decodeBase64(encodedText);
        sourceReady = rawBytes.length > 0;
        if(!sourceReady) throw new Error("plug-in SE decoded to zero bytes");

        mediaObjectUrl = URL.createObjectURL(new Blob([rawBytes], { type: "audio/mpeg" }));
        media.src = mediaObjectUrl;
        media.load();

        if(media.readyState >= 2){
          mediaReady = true;
        } else {
          media.addEventListener("loadeddata", () => { mediaReady = true; }, { once: true });
          media.addEventListener("canplaythrough", () => { mediaReady = true; }, { once: true });
          media.addEventListener("error", () => { mediaReady = false; }, { once: true });
        }
        return true;
      })
      .catch(error => {
        console.warn("Original plug-in SE source load failed", error);
        sourceReady = false;
        return false;
      });
    return loadPromise;
  }

  function ensureAudioContext(){
    const Context = window.AudioContext || window.webkitAudioContext;
    if(!Context) return null;
    if(!audioContext) audioContext = new Context();
    if(audioContext.state === "suspended"){
      try{
        const p = audioContext.resume();
        if(p?.catch) p.catch(() => {});
      }catch(_){}
    }
    return audioContext;
  }

  function decodeForWebAudio(){
    const context = ensureAudioContext();
    if(!context) return Promise.resolve(false);
    if(decodedBuffer) return Promise.resolve(true);
    if(decodePromise) return decodePromise;

    decodePromise = ensureSource().then(ok => {
      if(!ok || !rawBytes) return false;
      return context.decodeAudioData(rawBytes.buffer.slice(0))
        .then(buffer => {
          decodedBuffer = buffer;
          return true;
        })
        .catch(error => {
          console.warn("Original plug-in SE decode failed", error);
          return false;
        });
    });
    return decodePromise;
  }

  function warmMediaOnGesture(){
    if(warmed || !mediaReady) return;
    try{
      const previousMuted = media.muted;
      media.muted = true;
      media.currentTime = 0;
      const p = media.play();
      if(p?.then){
        p.then(() => {
          media.pause();
          media.currentTime = 0;
          media.muted = previousMuted;
          warmed = true;
        }).catch(() => {
          media.muted = previousMuted;
        });
      }
    }catch(_){}
  }

  function prepareFromGesture(){
    ensureAudioContext();
    decodeForWebAudio().catch(() => {});
    ensureSource().then(() => warmMediaOnGesture()).catch(() => {});
  }

  function playViaWebAudio(){
    const volume = currentVolume();
    if(volume <= 0) return true;
    if(!audioContext || audioContext.state !== "running" || !decodedBuffer) return false;
    try{
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = decodedBuffer;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(audioContext.destination);
      source.start(0);
      return true;
    }catch(error){
      console.warn("Original plug-in SE Web Audio playback failed", error);
      return false;
    }
  }

  function playViaMedia(){
    const volume = currentVolume();
    if(volume <= 0) return true;
    if(!mediaReady || !media.src) return false;
    try{
      media.pause();
      media.currentTime = 0;
      media.muted = false;
      media.volume = volume;
      const promise = media.play();
      if(promise?.catch){
        promise.catch(error => console.warn("Original plug-in SE media playback failed", error));
      }
      return true;
    }catch(error){
      console.warn("Original plug-in SE media playback failed", error);
      return false;
    }
  }

  function playOriginal(){
    prepareFromGesture();
    if(playViaWebAudio()) return true;
    if(playViaMedia()) return true;
    console.warn("Original plug-in SE is not ready; no alternate sound will be played.");
    return false;
  }

  // Load bytes immediately. Decode/unlock on the first real user gesture so
  // Safari and Chrome have a running audio path long before plug-in confirmation.
  ensureSource();
  window.addEventListener("pointerdown", prepareFromGesture, true);
  window.addEventListener("keydown", prepareFromGesture, true);

  window.SpellPluginSe = {
    playOriginal,
    prepareFromGesture,
    ready: () => ({
      sourceReady,
      mediaReady,
      warmed,
      contextState: audioContext?.state || "none",
      decoded: Boolean(decodedBuffer),
      bytes: rawBytes?.length || 0
    })
  };
})();
