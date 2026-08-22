(() => {
  "use strict";

  const startButton = document.getElementById("start-button");
  if (startButton) startButton.disabled = true;

  const styles = [
    "css/dialog-portrait-layout-v3.css?v=6",
    "css/character-portraits.css?v=1",
    "css/rpg-systems.css?v=2",
    "css/items.css?v=2",
    "css/story.css?v=2",
    "css/friend-conversation.css?v=1",
    "css/rpg-field-v1.css?v=3",
    "css/map-interiors.css?v=2",
    "css/npc-pipoya.css?v=4",
    "css/computer.css?v=5",
    "css/pipoya-map.css?v=2",
    "css/house-maps.css?v=1",
    "css/house-rooms-v2.css?v=2",
    "css/pokemon-house-compact.css?v=1",
    "css/sophie-sprite.css?v=21"
  ];

  const modules = [
    "js/audio-settings.js?v=1",
    "js/audio-manager.js?v=1",
    { wait: () => Promise.all([
      window.SpellAudio?.preloadSfx?.("dialog-pop"),
      window.SpellAudio?.preloadSfx?.("plugin-sparkle")
    ]) },
    "js/python-runner.js?v=1",
    "js/interpreter.js?v=3",
    "js/game03-core.js?v=8",
    { src: "js/lumiere-python-errors.js?v=3", optional: true },
    "js/python-grimoire.js?v=1",
    "js/plugin-workspace.js?v=2",
    "js/map-transition.js?v=3",
    "js/game03-items.js?v=3",
    "js/game03-story.js?v=10",
    "js/friend-conversation.js?v=3",
    "js/game03-battle.js?v=6",
    "js/tilemap-runtime.js?v=1",
    { wait: () => window.SpellTilemapRuntime?.ready },
    "js/game03-field.js?v=20",
    "js/la-mer-expanded.js?v=3",
    "js/fleur-start-sprites.js?v=3",
    "js/place-names.js?v=2",
    "js/game-bgm.js?v=8",
    "js/character-portraits.js?v=3",
    "js/dialog-typewriter.js?v=4",
    "js/dialog-sfx.js?v=4",
    "js/game03-menu.js?v=19",
    "js/plugin-controller.js?v=2",
    "js/house-room-layout.js?v=4",
    "js/field-scene-controller.js?v=1",
    "js/field-input-controller.js?v=1",
    { applyTilemap: true },
    "js/python-polish.js?v=1",
    "js/npc-facing.js?v=1",
    "js/sophie-sprite.js?v=7"
  ];

  function loadStyle(href) {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = href;
    document.head.appendChild(style);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadModule(entry) {
    if (typeof entry === "string") {
      await loadScript(entry);
      return;
    }
    if (entry.wait) {
      await entry.wait();
      return;
    }
    if (entry.applyTilemap) {
      window.SpellTilemapRuntime?.apply?.(window.SpellField?.currentMap?.());
      return;
    }
    if (entry.optional) {
      try {
        await loadScript(entry.src);
      } catch (error) {
        console.warn(`Optional module failed to load: ${entry.src}`, error);
      }
    }
  }

  async function boot() {
    styles.forEach(loadStyle);
    for (const entry of modules) await loadModule(entry);

    const area = document.querySelector(".field-area");
    if (area && !area.textContent) area.textContent = "フルール村";
    const help = [...document.querySelectorAll(".field-help span")];
    if (help[1]) help[1].textContent = "話す・調べる・戻る：Z";

    if (startButton) startButton.disabled = false;
    window.SpellRuntimeBoot = {
      ready: true,
      modules: modules.filter(entry => typeof entry === "string")
    };
  }

  boot().catch(error => {
    console.error("Spell Operator boot failed", error);
    document.body.insertAdjacentHTML("beforeend", '<p style="padding:16px;color:#fff">ゲームの読み込みに失敗しました。再読み込みしてください。</p>');
  });
})();