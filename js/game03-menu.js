(() => {
  "use strict";

  const G = window.SpellGame03;
  const $ = G.$;
  const state = G.state;

  let fieldMenuOpen = false;
  let fieldMenuIndex = 0;
  let fieldMenuMode = "main";
  let pendingTravel = null;
  let travelCasting = false;
  let travelCastReady = false;
  let travelChoiceReady = false;

  const travelMenuItems = [
    { label: "フルール村", mapId: "town" },
    { label: "ラメールシティ", mapId: "la_mer_city" }
  ];
  const travelConfirmItems = [
    { label: "はい", action: () => confirmTravel() },
    { label: "いいえ", action: () => cancelTravel() }
  ];
  const fieldMenuItems = [
    { label: "ステータス", action: () => openStatus() },
    { label: "リュック", action: () => { closeFieldMenu(); window.SpellItems?.openBackpack?.(); } },
    { label: "イードウ", action: () => openTravelMenu() },
    { label: "設定", action: () => openSettingsMenu() },
    { label: "パソコン", action: () => { closeFieldMenu(); G.openComputer?.(); } },
    { label: "セーブ", action: () => { closeFieldMenu(); window.SpellField?.saveGame?.(); } },
    { label: "とじる", action: () => closeFieldMenu() }
  ];

  const pct = value => `${Math.round(Number(value || 0) * 100)}%`;
  const fieldScreenActive = () => Boolean(G.screens.field?.classList.contains("active"));
  const dialogIsOpen = () => Boolean($("#field-dialog") && !$("#field-dialog").classList.contains("hidden"));
  const storyOverlayIsOpen = () => Boolean(window.SpellStory?.isOverlayOpen?.());
  const isZ = event => event.code === "KeyZ" || event.key === "z" || event.key === "Z";
  const isX = event => event.code === "KeyX" || event.key === "x" || event.key === "X";
  const isEnter = event => event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter";
  const editable = target => Boolean(target?.closest?.("input, textarea, [contenteditable='true']"));
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  function settingsMenuItems() {
    const settings = window.SpellAudioSettings?.snapshot?.() || { bgm: .5, sfx: .5 };
    return [
      { label: `BGM音量　${pct(settings.bgm)}`, setting: "bgm" },
      { label: `SE音量　 ${pct(settings.sfx)}`, setting: "sfx" },
      { label: "音量を初期値に戻す", action: () => { window.SpellAudioSettings?.reset?.(); renderFieldMenu(); } },
      { label: "戻る", action: () => returnFromSubMenu() }
    ];
  }

  function activeFieldMenuItems() {
    if (fieldMenuMode === "travel") return travelMenuItems.map(item => ({ label: item.label, action: () => requestTravel(item.mapId, item.label) }));
    if (fieldMenuMode === "travel-confirm") return travelConfirmItems;
    if (fieldMenuMode === "settings") return settingsMenuItems();
    return fieldMenuItems;
  }

  function ensureUi() {
    const tools = document.querySelector(".field-tools");
    if (tools && !$("#field-menu")) {
      const button = document.createElement("button");
      button.id = "field-menu";
      button.className = "mini-button";
      button.textContent = "MENU";
      tools.insertBefore(button, tools.firstChild);
    }

    const fieldWindow = document.querySelector("#screen-field .field-window");
    if (fieldWindow && !$("#field-main-menu")) {
      const menu = document.createElement("div");
      menu.id = "field-main-menu";
      menu.className = "field-main-menu hidden";
      menu.setAttribute("role", "menu");
      menu.innerHTML = `<div class="field-main-menu-title">MENU</div><div id="field-menu-money" class="field-main-menu-money">0 G</div><div id="field-main-menu-items" class="field-main-menu-items"></div><div class="field-main-menu-help">↑↓ 選択　Z 決定　X 閉じる</div>`;
      fieldWindow.appendChild(menu);
    }

    const dialogMessage = $("#field-dialog .dialog-message") || $("#field-dialog");
    if (dialogMessage && !$("#ido-choice-menu")) {
      const choice = document.createElement("div");
      choice.id = "ido-choice-menu";
      choice.className = "ido-choice-menu hidden";
      choice.setAttribute("role", "menu");
      choice.setAttribute("aria-label", "イードウ確認");
      dialogMessage.appendChild(choice);
    }

    if (!$("#ido-fade")) {
      const fade = document.createElement("div");
      fade.id = "ido-fade";
      fade.className = "ido-fade";
      fade.setAttribute("aria-hidden", "true");
      document.body.appendChild(fade);
    }

    if (!document.getElementById("spell-menu-runtime-style")) {
      const style = document.createElement("style");
      style.id = "spell-menu-runtime-style";
      style.textContent = `.ido-choice-menu{position:absolute;right:12px;bottom:10px;width:132px;z-index:60;padding:6px;background:#fffef2;color:#202128;border:4px solid #333946;border-radius:7px;box-shadow:inset 0 0 0 2px #adb5c4,0 8px 20px rgba(0,0,0,.28);display:grid;gap:2px;font-family:ui-monospace,"Noto Sans JP",monospace}.ido-choice-menu.hidden{display:none}.ido-choice-item{min-height:38px;padding:0 9px;display:grid;grid-template-columns:20px 1fr;align-items:center;text-align:left;background:transparent;color:#202128;border:0;font-weight:900}.ido-choice-item.selected{background:#efeafc}.ido-choice-item .menu-cursor{visibility:hidden;color:#6f54a6}.ido-choice-item.selected .menu-cursor{visibility:visible}#field-dialog.ido-confirm-open .dialog-message{padding-right:170px!important}.ido-fade{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:9999;transition:opacity .36s ease}.ido-fade.active{opacity:1;pointer-events:auto}@media(max-width:760px){.ido-choice-menu{right:8px;bottom:8px;width:116px}.ido-choice-item{min-height:34px}#field-dialog.ido-confirm-open .dialog-message{padding-right:138px!important}}`;
      document.head.appendChild(style);
    }

    const help = document.querySelector("#screen-field .field-help");
    if (help && !help.querySelector("[data-menu-help]")) {
      const span = document.createElement("span");
      span.dataset.menuHelp = "1";
      span.textContent = "メニュー：Enter / 決定：Z / 戻る：X";
      help.appendChild(span);
    }

    const main = document.querySelector("main.shell");
    if (main && !$("#screen-status")) {
      const section = document.createElement("section");
      section.id = "screen-status";
      section.className = "screen";
      section.innerHTML = `<div class="status-screen-wrap"><div class="status-toolbar"><div><p class="kicker">PARTY STATUS</p><h2>ステータス</h2></div><button id="status-back" class="secondary">フィールドへ戻る</button></div><div id="status-grid" class="status-grid"></div></div>`;
      main.insertBefore(section, $("#screen-hub") || null);
      G.screens.status = section;
    }

    $("#spell-loadout")?.remove();
  }

  function renderFieldMenu() {
    const box = $("#field-main-menu-items");
    if (!box) return;
    const items = activeFieldMenuItems();
    const title = $("#field-main-menu .field-main-menu-title");
    const money = $("#field-menu-money");
    const help = $("#field-main-menu .field-main-menu-help");
    if (money) money.textContent = `${state.money} G`;
    if (title) title.textContent = fieldMenuMode.startsWith("travel") ? "イードウ" : fieldMenuMode === "settings" ? "設定" : "MENU";
    if (help) help.textContent = fieldMenuMode === "main" ? "↑↓ 選択　Z 決定　X 閉じる" : "↑↓ 選択　Z 決定　X 戻る";
    box.innerHTML = items.map((item, index) => `<button type="button" class="field-main-menu-item${index === fieldMenuIndex ? " selected" : ""}" data-field-menu-index="${index}"><span class="menu-cursor">▶</span><span>${item.label}</span></button>`).join("");
  }

  function renderTravelChoice() {
    const box = $("#ido-choice-menu");
    if (!box) return;
    box.innerHTML = travelConfirmItems.map((item, index) => `<button type="button" class="ido-choice-item${index === fieldMenuIndex ? " selected" : ""}" data-ido-choice-index="${index}"><span class="menu-cursor">▶</span><span>${item.label}</span></button>`).join("");
  }

  function showTravelChoice() {
    travelChoiceReady = true;
    renderTravelChoice();
    $("#ido-choice-menu")?.classList.remove("hidden");
    $("#field-dialog")?.classList.add("ido-confirm-open");
  }

  function hideTravelChoice() {
    travelChoiceReady = false;
    $("#ido-choice-menu")?.classList.add("hidden");
    $("#field-dialog")?.classList.remove("ido-confirm-open");
  }

  function openFieldMenu() {
    if (!fieldScreenActive() || dialogIsOpen() || storyOverlayIsOpen() || travelCasting) return;
    fieldMenuOpen = true;
    fieldMenuMode = "main";
    fieldMenuIndex = 0;
    renderFieldMenu();
    $("#field-main-menu")?.classList.remove("hidden");
  }

  function closeFieldMenu() {
    fieldMenuOpen = false;
    fieldMenuMode = "main";
    fieldMenuIndex = 0;
    pendingTravel = null;
    travelCastReady = false;
    hideTravelChoice();
    $("#field-main-menu")?.classList.add("hidden");
  }

  function toggleFieldMenu() {
    if (fieldMenuOpen) closeFieldMenu();
    else openFieldMenu();
  }

  function openTravelMenu() {
    fieldMenuOpen = true;
    fieldMenuMode = "travel";
    fieldMenuIndex = 0;
    renderFieldMenu();
    $("#field-main-menu")?.classList.remove("hidden");
  }

  function openSettingsMenu() {
    fieldMenuOpen = true;
    fieldMenuMode = "settings";
    fieldMenuIndex = 0;
    renderFieldMenu();
  }

  function returnFromSubMenu() {
    const label = fieldMenuMode.startsWith("travel") ? "イードウ" : "設定";
    fieldMenuMode = "main";
    pendingTravel = null;
    travelCastReady = false;
    hideTravelChoice();
    fieldMenuIndex = Math.max(0, fieldMenuItems.findIndex(item => item.label === label));
    renderFieldMenu();
    $("#field-main-menu")?.classList.remove("hidden");
  }

  function cancelFieldMenuLevel() {
    if (fieldMenuMode === "travel-confirm") cancelTravel();
    else if (fieldMenuMode !== "main") returnFromSubMenu();
    else closeFieldMenu();
  }

  function closeDialog() {
    if (dialogIsOpen()) $("#field-action")?.click();
  }

  async function waitForDialogTyping() {
    while (window.SpellDialogTyping?.isTyping?.()) await delay(25);
  }

  async function requestTravel(mapId, label) {
    pendingTravel = { mapId, label };
    fieldMenuOpen = true;
    fieldMenuMode = "travel-confirm";
    fieldMenuIndex = 0;
    hideTravelChoice();
    $("#field-main-menu")?.classList.add("hidden");
    window.SpellField?.showDialog?.({ speaker: "lumiere", text: `${label}に移動するの？` });
    await waitForDialogTyping();
    if (pendingTravel?.mapId === mapId && fieldMenuMode === "travel-confirm" && !travelCasting) showTravelChoice();
  }

  function cancelTravel() {
    closeDialog();
    hideTravelChoice();
    pendingTravel = null;
    travelCastReady = false;
    fieldMenuOpen = true;
    fieldMenuMode = "travel";
    fieldMenuIndex = 0;
    renderFieldMenu();
    $("#field-main-menu")?.classList.remove("hidden");
  }

  async function confirmTravel() {
    if (!pendingTravel || travelCasting || !travelChoiceReady) return;
    const destination = { ...pendingTravel };
    travelCasting = true;
    travelCastReady = false;
    fieldMenuOpen = false;
    hideTravelChoice();
    $("#field-main-menu")?.classList.add("hidden");
    closeDialog();
    await delay(40);
    window.SpellField?.showDialog?.({ speaker: "lumiere", text: "イードウ！", typing: { allowSkip: false } });
    await waitForDialogTyping();
    if (travelCasting && pendingTravel?.mapId === destination.mapId) travelCastReady = true;
  }

  async function executeTravel() {
    if (!pendingTravel || !travelCasting || !travelCastReady) return;
    const destination = { ...pendingTravel };
    travelCastReady = false;
    closeDialog();
    const fade = $("#ido-fade");
    fade?.classList.add("active");
    await delay(380);
    window.SpellField?.activateMap?.(destination.mapId, { from: "fast-travel" });
    window.SpellPlaces?.refresh?.();
    window.SpellBgm?.sync?.();
    await delay(140);
    fade?.classList.remove("active");
    await delay(380);
    pendingTravel = null;
    fieldMenuMode = "main";
    fieldMenuIndex = 0;
    travelCasting = false;
  }

  function moveFieldMenu(delta) {
    const items = activeFieldMenuItems();
    fieldMenuIndex = (fieldMenuIndex + delta + items.length) % items.length;
    if (fieldMenuMode === "travel-confirm") renderTravelChoice();
    else renderFieldMenu();
  }

  function adjustAudio(delta) {
    if (fieldMenuMode !== "settings") return false;
    const item = activeFieldMenuItems()[fieldMenuIndex];
    if (!item?.setting) return false;
    window.SpellAudioSettings?.adjust?.(item.setting, delta);
    renderFieldMenu();
    return true;
  }

  function activateFieldMenu(index = fieldMenuIndex) {
    if (fieldMenuMode === "travel-confirm") {
      if (window.SpellDialogTyping?.handleAdvance?.()) return;
      if (!travelChoiceReady) return;
    }
    const item = activeFieldMenuItems()[index];
    if (item?.setting) {
      adjustAudio(.1);
      return;
    }
    item?.action?.();
  }

  function statRows(stats, key) {
    const progress = state.party[key];
    const rows = [
      ["HP", `${progress.hp} / ${stats.hp}`],
      ["MP", `${progress.mp} / ${G.maxMpFor(stats, progress.level)}`],
      ["攻撃", stats.attack], ["防御", stats.defense], ["特攻", stats.spAttack],
      ["特防", stats.spDefense], ["素早さ", stats.speed]
    ];
    return rows.map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join("");
  }

  function memberCard(key) {
    const progress = state.party[key];
    const species = G.partySpecies[key];
    const stats = G.getMemberStats(key);
    const next = G.expToNext(progress.level);
    const width = Math.max(0, Math.min(100, progress.exp / next * 100));
    const equip = G.itemDefinitions[state.equipment[key]];
    const equipText = equip ? `${equip.name}（${equip.description}）` : "装備なし";
    return `<article class="status-card"><div class="status-card-head"><h3>${species.name}</h3><span class="status-level">Lv.${progress.level}</span></div><dl class="status-stats">${statRows(stats, key)}</dl><div class="status-equipment"><strong>装備</strong><span>${equipText}</span></div><div class="status-exp"><div class="status-exp-row"><span>EXP</span><span>${progress.exp} / ${next}</span></div><div class="exp-bar"><div class="exp-bar-fill" style="width:${width}%"></div></div></div></article>`;
  }

  function renderStatus() {
    const grid = $("#status-grid");
    if (grid) grid.innerHTML = memberCard("sophie") + memberCard("lumiere");
  }

  function renderLoadout() { $("#spell-loadout")?.remove(); }

  function openStatus() {
    closeFieldMenu();
    renderStatus();
    G.showScreen("status");
  }

  function closeStatus() {
    G.showScreen("field");
    requestAnimationFrame(() => window.SpellField?.renderQuestMarks?.());
  }

  function closeAuxScreenWithX(event) {
    if (!isX(event) || editable(event.target)) return false;
    const active = id => Boolean(document.getElementById(id)?.classList.contains("active"));
    if (active("screen-debug")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      G.openComputer?.();
      return true;
    }
    if (active("screen-hub") || active("screen-status") || active("screen-backpack") || active("screen-shop")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeStatus();
      return true;
    }
    return false;
  }

  function onKeydown(event) {
    if (closeAuxScreenWithX(event)) return;
    if (storyOverlayIsOpen()) return;

    if (travelCasting) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (travelCastReady && isZ(event) && !event.repeat) void executeTravel();
      return;
    }

    if (fieldMenuOpen) {
      if (isX(event) || event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelFieldMenuLevel();
        return;
      }
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault(); event.stopImmediatePropagation(); moveFieldMenu(-1); return;
      }
      if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
        event.preventDefault(); event.stopImmediatePropagation(); moveFieldMenu(1); return;
      }
      if (fieldMenuMode === "settings" && (event.key === "ArrowLeft" || event.key === "a" || event.key === "A")) {
        event.preventDefault(); event.stopImmediatePropagation(); adjustAudio(-.1); return;
      }
      if (fieldMenuMode === "settings" && (event.key === "ArrowRight" || event.key === "d" || event.key === "D")) {
        event.preventDefault(); event.stopImmediatePropagation(); adjustAudio(.1); return;
      }
      if (isZ(event)) {
        event.preventDefault(); event.stopImmediatePropagation(); activateFieldMenu(); return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (!fieldScreenActive()) return;

    if (isEnter(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!dialogIsOpen()) openFieldMenu();
      return;
    }

    if (isZ(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.SpellDialogTyping?.handleAdvance?.()) return;
      $("#field-action")?.click();
    }
    // X is intentionally not handled here. plugin-controller.js owns normal-field X.
  }

  ensureUi();
  $("#field-menu")?.addEventListener("click", toggleFieldMenu);
  $("#field-main-menu")?.addEventListener("click", event => {
    const button = event.target.closest("[data-field-menu-index]");
    if (!button) return;
    fieldMenuIndex = Number(button.dataset.fieldMenuIndex) || 0;
    activateFieldMenu(fieldMenuIndex);
  });
  $("#ido-choice-menu")?.addEventListener("click", event => {
    const button = event.target.closest("[data-ido-choice-index]");
    if (!button || !travelChoiceReady) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fieldMenuIndex = Number(button.dataset.idoChoiceIndex) || 0;
    activateFieldMenu(fieldMenuIndex);
  }, true);
  $("#status-back")?.addEventListener("click", closeStatus);
  document.addEventListener("keydown", onKeydown, true);

  window.SpellMenu = {
    renderStatus,
    renderLoadout,
    renderFieldMenu,
    openStatus,
    openFieldMenu,
    closeFieldMenu,
    openTravelMenu,
    openSettingsMenu,
    toggleFieldMenu,
    isOpen: () => fieldMenuOpen || travelCasting,
    isCastingTravel: () => travelCasting
  };
})();
