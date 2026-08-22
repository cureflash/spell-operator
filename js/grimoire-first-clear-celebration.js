(() => {
  "use strict";

  const G = window.SpellGame03;
  if (!G?.state) return;

  const DEFAULT_PORTRAIT = "assets/characters/portraits/lumiere/grimoire-clear.svg?v=1";
  const FALLBACK_PORTRAIT = "assets/characters/portraits/lumiere/smile.jpg?v=1";
  let portraitSrc = DEFAULT_PORTRAIT;
  let currentSpellKey = null;

  function blankFlags() {
    return Object.create(null);
  }

  function normalizeFlags(value) {
    const flags = blankFlags();
    if (!value || typeof value !== "object") return flags;
    for (const [key, cleared] of Object.entries(value)) {
      if (cleared) flags[key] = true;
    }
    return flags;
  }

  if (!G.state.grimoireClearFlags) G.state.grimoireClearFlags = blankFlags();

  function installMagicPersistence() {
    if (typeof G.serializeMagic === "function" && !G.serializeMagic.__grimoireFirstClearWrapped) {
      const originalSerialize = G.serializeMagic.bind(G);
      const wrappedSerialize = () => ({
        ...originalSerialize(),
        grimoireClearFlags: { ...G.state.grimoireClearFlags }
      });
      wrappedSerialize.__grimoireFirstClearWrapped = true;
      G.serializeMagic = wrappedSerialize;
    }

    if (typeof G.restoreMagic === "function" && !G.restoreMagic.__grimoireFirstClearWrapped) {
      const originalRestore = G.restoreMagic.bind(G);
      const wrappedRestore = data => {
        const result = originalRestore(data);
        const saved = data?.grimoireClearFlags;
        if (saved && typeof saved === "object") {
          G.state.grimoireClearFlags = normalizeFlags(saved);
        } else {
          const migrated = blankFlags();
          for (const key of Object.keys(data?.registeredSpells || {})) migrated[key] = true;
          G.state.grimoireClearFlags = migrated;
        }
        return result;
      };
      wrappedRestore.__grimoireFirstClearWrapped = true;
      G.restoreMagic = wrappedRestore;
    }
  }

  function ensureOverlay() {
    let overlay = document.getElementById("grimoire-first-clear-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "grimoire-first-clear-overlay";
    overlay.className = "hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "魔導書クリア");
    overlay.innerHTML = `
      <div class="grimoire-first-clear-card">
        <img id="grimoire-first-clear-portrait" class="grimoire-first-clear-portrait" alt="" aria-hidden="true">
        <div class="grimoire-first-clear-message">
          <div class="grimoire-first-clear-name">ルミエル</div>
          <div id="grimoire-first-clear-text" class="grimoire-first-clear-text">やった！クリアよ！</div>
          <span class="grimoire-first-clear-next" aria-hidden="true">▼</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", close);
    return overlay;
  }

  function applyPortrait() {
    const portrait = document.getElementById("grimoire-first-clear-portrait");
    if (!portrait) return;
    portrait.onerror = () => {
      if (!portrait.src.includes("/smile.jpg")) portrait.src = FALLBACK_PORTRAIT;
    };
    portrait.src = portraitSrc || DEFAULT_PORTRAIT;
  }

  function isOpen() {
    const overlay = document.getElementById("grimoire-first-clear-overlay");
    return Boolean(overlay && !overlay.classList.contains("hidden"));
  }

  function show(spellKey, text = "やった！クリアよ！") {
    const overlay = ensureOverlay();
    currentSpellKey = String(spellKey || "");
    const textEl = document.getElementById("grimoire-first-clear-text");
    if (textEl) textEl.textContent = String(text || "やった！クリアよ！");
    applyPortrait();
    overlay.classList.remove("hidden");
    overlay.dataset.spellKey = currentSpellKey;
  }

  function close() {
    const overlay = document.getElementById("grimoire-first-clear-overlay");
    if (!overlay || overlay.classList.contains("hidden")) return false;
    overlay.classList.add("hidden");
    overlay.removeAttribute("data-spell-key");
    currentSpellKey = null;
    return true;
  }

  function hasCleared(spellKey) {
    return Boolean(G.state.grimoireClearFlags?.[spellKey]);
  }

  function markCleared(spellKey) {
    const key = String(spellKey || "").trim();
    if (!key) return false;
    G.state.grimoireClearFlags ||= blankFlags();
    if (G.state.grimoireClearFlags[key]) return false;
    G.state.grimoireClearFlags[key] = true;
    return true;
  }

  function resetFlags() {
    G.state.grimoireClearFlags = blankFlags();
    close();
  }

  function setPortrait(src) {
    const value = String(src || "").trim();
    portraitSrc = value || DEFAULT_PORTRAIT;
    if (isOpen()) applyPortrait();
    return portraitSrc;
  }

  function onJudgeStateChanged() {
    const stateEl = document.getElementById("run-state");
    if (!stateEl || stateEl.textContent.trim() !== "JUDGE PASS") return;
    const key = String(G.state?.selectedSpellKey || "").trim();
    if (!key || !markCleared(key)) return;
    queueMicrotask(() => show(key, "やった！クリアよ！"));
  }

  function installJudgePassObserver() {
    const stateEl = document.getElementById("run-state");
    if (!stateEl || stateEl.dataset.firstClearObserved === "1") return false;
    stateEl.dataset.firstClearObserved = "1";
    new MutationObserver(onJudgeStateChanged).observe(stateEl, {
      childList: true,
      characterData: true,
      subtree: true
    });
    return true;
  }

  function installJudgeObserverWhenReady() {
    if (installJudgePassObserver()) return;
    requestAnimationFrame(installJudgeObserverWhenReady);
  }

  document.addEventListener("keydown", event => {
    if (!isOpen()) return;
    const advance = event.key === "Enter" || event.key === " " || event.key === "z" || event.key === "Z" || event.key === "Escape";
    if (!advance) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, true);

  document.getElementById("start-button")?.addEventListener("click", resetFlags);

  installMagicPersistence();
  ensureOverlay();
  installJudgeObserverWhenReady();

  window.SpellGrimoireFirstClear = {
    show,
    close,
    isOpen,
    hasCleared,
    markCleared,
    resetFlags,
    setPortrait,
    get currentSpellKey() { return currentSpellKey; },
    get portrait() { return portraitSrc; }
  };
})();