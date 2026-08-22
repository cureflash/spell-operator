(() => {
  "use strict";

  const startButton = document.getElementById("start-button");
  if (startButton) {
    startButton.disabled = true;
    startButton.textContent = "読み込み中...";
  }

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
    "css/plugin-editor-assistant.css?v=3",
    "css/plugin-editor-layout-applied.css?v=8",
    "css/grimoire-first-clear.css?v=3",
    "css/pipoya-map.css?v=2",
    "css/la-mer-map.css?v=1",
    "css/house-maps.css?v=1",
    "css/house-rooms-v2.css?v=2",
    "css/pokemon-house-compact.css?v=1",
    "css/sophie-sprite.css?v=21",
    "css/battle-dq-ui.css?v=6"
  ];

  const modules = [
    "js/audio-settings.js?v=1",
    "js/audio-manager.js?v=1",
    "js/plugin-clear-audio.js?v=1",
    "js/python-runner.js?v=6",
    "js/interpreter.js?v=3",
    "js/game03-core.js?v=8",
    { src: "js/lumiere-python-errors.js?v=4", optional: true },
    "js/python-grimoire.js?v=2",
    "js/plugin-hints.js?v=1",
    "js/plugin-workspace.js?v=4",
    "js/plugin-editor-assistant.js?v=6",
    "js/plugin-answer-judge.js?v=3",
    { src: "js/grimoire-first-clear-celebration.js?v=4", optional: true },
    "js/plugin-execution-controller.js?v=4",
    "js/map-transition.js?v=3",
    "js/game03-items.js?v=3",
    "js/game03-story.js?v=10",
    "js/friend-conversation.js?v=3",
    "js/game03-battle.js?v=6",
    { src: "js/battle-ui-core-patch.js?v=5", optional: true },
    "js/tilemap-runtime.js?v=5",
    { wait: () => window.SpellTilemapRuntime?.ready, label: "SpellTilemapRuntime.ready" },
    "js/game03-field.js?v=20",
    "js/field-enemy-battle-override.js?v=1",
    "js/la-mer-expanded.js?v=3",
    { src: "js/la-mer-ai-preview.js?v=2", optional: true },
    "js/fleur-start-sprites.js?v=3",
    "js/place-names.js?v=2",
    "js/game-bgm.js?v=8",
    "js/character-portraits.js?v=3",
    "js/battle-dq-ui.js?v=7",
    "js/dialog-typewriter.js?v=4",
    "js/dialog-sfx.js?v=4",
    "js/game03-menu.js?v=20",
    "js/plugin-controller.js?v=4",
    "js/house-room-layout.js?v=4",
    "js/field-scene-controller.js?v=1",
    { applyTilemap: true, label: "tilemap apply" },
    "js/python-polish.js?v=1",
    "js/npc-facing.js?v=1",
    "js/sophie-sprite.js?v=7"
  ];

  let currentBootStep = "game.js";
  let diagnosticTimer = null;

  function entryLabel(entry) {
    if (typeof entry === "string") return entry;
    return entry?.src || entry?.label || (entry?.wait ? "wait task" : entry?.applyTilemap ? "tilemap apply" : "unknown task");
  }

  function diagnosticBox() {
    let box = document.getElementById("boot-diagnostic");
    if (box) return box;
    box = document.createElement("pre");
    box.id = "boot-diagnostic";
    Object.assign(box.style, {
      margin: "16px 0 0",
      padding: "12px",
      maxWidth: "100%",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      border: "1px solid #ff7b7b",
      borderRadius: "8px",
      background: "rgba(60,0,0,.88)",
      color: "#fff",
      fontSize: "13px",
      lineHeight: "1.5",
      textAlign: "left"
    });
    const host = document.querySelector("#screen-title .title-card") || document.body;
    host.appendChild(box);
    return box;
  }

  function showDiagnostic(title, detail) {
    const box = diagnosticBox();
    box.textContent = `${title}\n${detail}`;
    box.hidden = false;
  }

  function clearDiagnostic() {
    if (diagnosticTimer) clearTimeout(diagnosticTimer);
    diagnosticTimer = null;
    const box = document.getElementById("boot-diagnostic");
    if (box) box.remove();
  }

  function scheduleSlowNotice() {
    if (diagnosticTimer) clearTimeout(diagnosticTimer);
    diagnosticTimer = setTimeout(() => {
      showDiagnostic("起動診断: 読み込みが止まっています", `現在の処理: ${currentBootStep}\nこの表示をそのままスクリーンショットしてください。`);
    }, 5000);
  }

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
    currentBootStep = entryLabel(entry);
    scheduleSlowNotice();

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
    if (help[1]) help[1].textContent = "話す・調べる・決定：Z";

    clearDiagnostic();
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = "GAME START";
    }
    window.SpellRuntimeBoot = {
      ready: true,
      currentStep: null,
      modules: modules.filter(entry => typeof entry === "string")
    };
  }

  window.SpellRuntimeBoot = {
    ready: false,
    get currentStep() { return currentBootStep; }
  };

  window.addEventListener("error", event => {
    if (window.SpellRuntimeBoot?.ready) return;
    const message = event?.error?.stack || event?.message || "Unknown JavaScript error";
    const source = event?.filename ? `\n${event.filename}:${event.lineno || "?"}:${event.colno || "?"}` : "";
    showDiagnostic("起動診断: JavaScriptエラー", `${message}${source}\n現在の処理: ${currentBootStep}`);
  });

  window.addEventListener("unhandledrejection", event => {
    if (window.SpellRuntimeBoot?.ready) return;
    const reason = event?.reason;
    const message = reason?.stack || reason?.message || String(reason || "Unhandled promise rejection");
    showDiagnostic("起動診断: Promiseエラー", `${message}\n現在の処理: ${currentBootStep}`);
  });

  scheduleSlowNotice();
  boot().catch(error => {
    console.error("Spell Operator boot failed", error);
    if (diagnosticTimer) clearTimeout(diagnosticTimer);
    diagnosticTimer = null;
    if (startButton) {
      startButton.disabled = true;
      startButton.textContent = "起動失敗";
    }
    showDiagnostic("起動診断: 起動に失敗しました", `${error?.stack || error}\n停止箇所: ${currentBootStep}\nこの表示をそのままスクリーンショットしてください。`);
  });
})();
