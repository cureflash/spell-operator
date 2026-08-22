(() => {
  "use strict";
  const audio = window.SpellAudio;
  if (!audio) throw new Error("SpellAudio is not loaded.");

  const TRACKS = Object.freeze({
    village_fete: { id: "village_fete", src: "https://peritune.com/music/PeriTune_Village_Fete.mp3" },
    dreambyte: { id: "dreambyte", src: "https://peritune.com/music/Peritune_Dreambyte.mp3" },
    awayuki: { id: "awayuki", src: "assets/audio/bgm/awayuki.mp3" },
    ancient_gust: { id: "ancient_gust", src: "assets/audio/bgm/ancient-gust.mp3" },
    resort5: { id: "resort5", src: "assets/audio/bgm/resort5.mp3" },
    swift_strike: { id: "swift_strike", src: "assets/audio/bgm/swift-strike.mp3" }
  });
  Object.values(TRACKS).forEach(track => audio.registerBgm(track.id, track.src));

  const VILLAGE_MAPS = new Set(["town", "school", "library", "house1", "house2"]);
  const FIELD_TRACKS = Object.freeze({ kyoto_city: TRACKS.awayuki, la_mer_city: TRACKS.resort5 });

  let activeTrack = null;
  let preparedBattleMode = null;
  let wasBattleActive = false;
  let wasPluginActive = false;

  const screenIsActive = id => Boolean(document.getElementById(id)?.classList.contains("active"));
  const battleIsActive = () => screenIsActive("screen-battle");
  const pluginIsActive = () => screenIsActive("screen-hub") || screenIsActive("screen-debug");

  function detectedBossBattle() {
    const battle = window.SpellGame03?.state?.battle;
    return battle?.boss === true || battle?.isBoss === true || battle?.type === "boss";
  }

  function wantedTrack() {
    if (battleIsActive()) {
      return preparedBattleMode === "boss" || detectedBossBattle() ? TRACKS.swift_strike : TRACKS.ancient_gust;
    }
    if (pluginIsActive()) return TRACKS.dreambyte;
    if (!screenIsActive("screen-field")) return null;
    const mapId = document.getElementById("field-world")?.dataset.map || "town";
    if (VILLAGE_MAPS.has(mapId)) return TRACKS.village_fete;
    return FIELD_TRACKS[mapId] || null;
  }

  function sync() {
    const battleActive = battleIsActive();
    if (wasBattleActive && !battleActive) preparedBattleMode = null;
    wasBattleActive = battleActive;

    const pluginActive = pluginIsActive();
    const enteringPlugin = pluginActive && !wasPluginActive;
    wasPluginActive = pluginActive;

    const track = wantedTrack();
    if (!track) {
      audio.pauseBgm({ reset: true, clear: true });
      activeTrack = null;
      return;
    }

    activeTrack = track;
    audio.playBgm(track.id, { restart: enteringPlugin && track.id === "dreambyte" });
  }

  function prepareBattle(mode = "normal") {
    preparedBattleMode = mode === "boss" ? "boss" : "normal";
    sync();
  }

  function pause() {
    audio.pauseBgm();
  }

  document.addEventListener("click", () => { audio.prepareFromGesture(); sync(); }, true);
  document.addEventListener("keydown", () => { audio.prepareFromGesture(); sync(); }, true);

  const observer = new MutationObserver(sync);
  ["screen-field", "screen-hub", "screen-debug", "screen-battle"].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { attributes: true, attributeFilter: ["class"] });
  });
  const fieldWorld = document.getElementById("field-world");
  if (fieldWorld) observer.observe(fieldWorld, { attributes: true, attributeFilter: ["data-map"] });

  window.SpellBgm = {
    sync,
    pause,
    prepareBattle,
    setBattleMode: prepareBattle,
    currentTrack: () => activeTrack?.id || null,
    tracks: { ...TRACKS },
    fieldTracks: { ...FIELD_TRACKS },
    element: audio.bgmElement
  };
  sync();
})();
