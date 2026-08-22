(() => {
  "use strict";

  const VILLAGE_FETE = {
    id: "village_fete",
    src: "https://peritune.com/music/PeriTune_Village_Fete.mp3"
  };
  const VILLAGE_MAPS = new Set(["town", "school", "library", "house1", "house2"]);

  const audio = new Audio();
  audio.preload = "auto";
  audio.loop = true;
  audio.volume = 0.6;

  let activeTrack = null;
  let userActivated = false;

  function wantedTrack() {
    const fieldScreen = document.getElementById("screen-field");
    if (!fieldScreen?.classList.contains("active")) return null;

    const mapId = document.getElementById("field-world")?.dataset.map || "town";
    return VILLAGE_MAPS.has(mapId) ? VILLAGE_FETE : null;
  }

  function setTrack(track) {
    if (activeTrack?.id === track.id) return;
    audio.pause();
    audio.src = track.src;
    audio.loop = true;
    activeTrack = track;
  }

  function sync() {
    const track = wantedTrack();
    if (!track) {
      audio.pause();
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

  document.addEventListener("click", activateAudio);
  document.addEventListener("keydown", activateAudio);

  const observer = new MutationObserver(sync);
  const fieldScreen = document.getElementById("screen-field");
  const fieldWorld = document.getElementById("field-world");
  if (fieldScreen) observer.observe(fieldScreen, { attributes: true, attributeFilter: ["class"] });
  if (fieldWorld) observer.observe(fieldWorld, { attributes: true, attributeFilter: ["data-map"] });

  window.SpellBgm = {
    sync,
    currentTrack: () => activeTrack?.id || null,
    element: audio
  };

  sync();
})();
