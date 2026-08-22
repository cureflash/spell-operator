(() => {
  "use strict";

  const TRACKS = Object.freeze({
    village_fete: {
      id: "village_fete",
      src: "https://peritune.com/music/PeriTune_Village_Fete.mp3"
    },
    dreambyte: {
      id: "dreambyte",
      src: "https://peritune.com/music/Peritune_Dreambyte.mp3"
    },
    awayuki: {
      id: "awayuki",
      src: "assets/audio/bgm/awayuki.mp3"
    },
    ancient_gust: {
      id: "ancient_gust",
      src: "assets/audio/bgm/ancient-gust.mp3"
    },
    resort5: {
      id: "resort5",
      src: "assets/audio/bgm/resort5.mp3"
    },
    swift_strike: {
      id: "swift_strike",
      src: "assets/audio/bgm/swift-strike.mp3"
    }
  });

  const VILLAGE_MAPS = new Set(["town", "school", "library", "house1", "house2"]);
  const FIELD_TRACKS = Object.freeze({
    kyoto_city: TRACKS.awayuki,
    la_mer_city: TRACKS.resort5
  });

  const audio = new Audio();
  audio.preload = "auto";
  audio.loop = true;
  audio.volume = window.SpellAudioSettings?.get?.("bgm") ?? 0.5;

  let activeTrack = null;
  let userActivated = false;
  let preparedBattleMode = null;
  let wasBattleActive = false;

  function screenIsActive(id) {
    return Boolean(document.getElementById(id)?.classList.contains("active"));
  }

  function battleIsActive() {
    return screenIsActive("screen-battle");
  }

  function pluginComputerIsActive() {
    return screenIsActive("screen-hub") || screenIsActive("screen-debug");
  }

  function detectedBossBattle() {
    const battle = window.SpellGame03?.state?.battle;
    return battle?.boss === true || battle?.isBoss === true || battle?.type === "boss";
  }

  function wantedTrack() {
    if (battleIsActive()) {
      return preparedBattleMode === "boss" || detectedBossBattle()
        ? TRACKS.swift_strike
        : TRACKS.ancient_gust;
    }

    if (pluginComputerIsActive()) return TRACKS.dreambyte;

    const fieldScreen = document.getElementById("screen-field");
    if (!fieldScreen?.classList.contains("active")) return null;

    const mapId = document.getElementById("field-world")?.dataset.map || "town";
    if (VILLAGE_MAPS.has(mapId)) return TRACKS.village_fete;
    return FIELD_TRACKS[mapId] || null;
  }

  function resetToStart() {
    try {
      audio.currentTime = 0;
    } catch (_) {}
  }

  function setTrack(track) {
    if (activeTrack?.id === track.id) return;
    audio.pause();
    activeTrack = track;
    audio.src = track.src;
    audio.loop = true;
    resetToStart();
  }

  function sync() {
    const battleActive = battleIsActive();
    if (wasBattleActive && !battleActive) preparedBattleMode = null;
    wasBattleActive = battleActive;

    const track = wantedTrack();
    if (!track) {
      audio.pause();
      resetToStart();
      activeTrack = null;
      return;
    }

    setTrack(track);
    if (!userActivated) return;

    const playPromise = audio.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }

  function activateAudio() {
    userActivated = true;
    sync();
  }

  function prepareBattle(mode = "normal") {
    preparedBattleMode = mode === "boss" ? "boss" : "normal";
    sync();
  }

  window.SpellAudioSettings?.subscribe?.(settings => {
    audio.volume = settings.bgm;
  });

  document.addEventListener("click", activateAudio);
  document.addEventListener("keydown", activateAudio);

  const observer = new MutationObserver(sync);
  const fieldScreen = document.getElementById("screen-field");
  const hubScreen = document.getElementById("screen-hub");
  const debugScreen = document.getElementById("screen-debug");
  const battleScreen = document.getElementById("screen-battle");
  const fieldWorld = document.getElementById("field-world");
  if (fieldScreen) observer.observe(fieldScreen, { attributes: true, attributeFilter: ["class"] });
  if (hubScreen) observer.observe(hubScreen, { attributes: true, attributeFilter: ["class"] });
  if (debugScreen) observer.observe(debugScreen, { attributes: true, attributeFilter: ["class"] });
  if (battleScreen) observer.observe(battleScreen, { attributes: true, attributeFilter: ["class"] });
  if (fieldWorld) observer.observe(fieldWorld, { attributes: true, attributeFilter: ["data-map"] });

  window.SpellBgm = {
    sync,
    prepareBattle,
    setBattleMode: prepareBattle,
    currentTrack: () => activeTrack?.id || null,
    tracks: { ...TRACKS },
    fieldTracks: { ...FIELD_TRACKS },
    element: audio
  };

  sync();
})();