(() => {
  "use strict";

  const battleScreen = document.getElementById("screen-battle");
  const battleLog = document.getElementById("battle-log");
  const menuWrap = battleScreen?.querySelector(".battle-menu-wrap");
  if (!battleScreen || !battleLog || !menuWrap) return;

  const style = document.createElement("style");
  style.id = "spell-battle-ui-core-style";
  style.textContent = `
    #screen-battle .battle-command-box {
      display: grid !important;
      grid-template-columns: minmax(0, 1.35fr) minmax(220px, .65fr) !important;
      min-height: 154px;
      background: #0b0b0f !important;
      color: #fff !important;
      border-top: 5px solid #454a55;
    }
    #screen-battle .battle-log {
      display: block !important;
      min-height: 132px;
      padding: 16px 18px !important;
      overflow: hidden;
      background: #0b0b0f !important;
      color: #fff !important;
      opacity: 1 !important;
      visibility: visible !important;
      border-right: 4px solid #f4f4f4 !important;
      white-space: pre-line !important;
      font-family: ui-monospace, "Noto Sans JP", monospace;
      font-size: 15px !important;
      line-height: 1.7 !important;
      text-shadow: 1px 1px 0 #000 !important;
    }
    #screen-battle .battle-log::before,
    #screen-battle .battle-log::after {
      content: none !important;
      display: none !important;
    }
    #screen-battle .battle-menu-wrap {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      min-width: 0;
      padding: 12px 14px !important;
      background: #0b0b0f !important;
      color: #fff !important;
    }
    #screen-battle .battle-menu-wrap .command-grid.hidden { display: none !important; }
    #screen-battle .battle-menu-wrap .command-grid:not(.hidden) {
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 3px !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #screen-battle .battle-menu-wrap button.command {
      display: flex !important;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 38px !important;
      padding: 4px 8px !important;
      border: 0 !important;
      background: transparent !important;
      color: #fff !important;
      font-family: ui-monospace, "Noto Sans JP", monospace;
      font-size: 15px;
      font-weight: 900;
      text-align: left;
      visibility: visible !important;
      opacity: 1 !important;
      box-shadow: none !important;
      outline: 0 !important;
    }
    #screen-battle .battle-menu-wrap button.command::before { content: none !important; }
    #screen-battle .battle-menu-wrap button.command:hover,
    #screen-battle .battle-menu-wrap button.command:focus,
    #screen-battle .battle-menu-wrap button.command.is-selected {
      background: transparent !important;
      color: #fff !important;
    }
    #screen-battle .battle-command-cursor {
      display: inline-block;
      flex: 0 0 1.1em;
      width: 1.1em;
      color: #fff;
      text-align: center;
    }
    #screen-battle .battle-menu-wrap button.command > [id$="-cost"] {
      margin-left: auto;
      font-size: 12px;
      opacity: .9;
    }
    @media (max-width: 760px) {
      #screen-battle .battle-command-box { grid-template-columns: 1fr !important; }
      #screen-battle .battle-log {
        border-right: 0 !important;
        border-bottom: 4px solid #f4f4f4 !important;
      }
    }
  `;
  document.head.appendChild(style);

  const history = [];
  const MAX_LINES = 4;
  let rendered = "";
  let internalWrite = false;

  function normalize(line) {
    return String(line || "").trim()
      .replace(/^ソフィーはどうする？$/, "ソフィーは どうする？")
      .replace(/^ルミエルはどうする？$/, "ルミエルは どうする？");
  }

  function keep(line) {
    if (!line) return false;
    if (/^(ソフィー|ルミエル)：(?:たたかう|ぼうぎょ)$/.test(line)) return false;
    if (/^ソフィーの行動を決めた。$/.test(line)) return false;
    return true;
  }

  function visibleGrid() {
    return [...menuWrap.querySelectorAll(".command-grid")]
      .find(grid => !grid.classList.contains("hidden")) || null;
  }

  function promptForVisibleMenu() {
    const grid = visibleGrid();
    if (!grid) return "";
    if (grid.id === "sophie-menu") return "ソフィーは どうする？";
    if (grid.id === "lumiere-menu") return "ルミエルは どうする？";
    if (grid.id === "magic-menu") return "どの まほうを つかう？";
    if (grid.id === "heal-target-menu") return "だれに つかう？";
    return "";
  }

  function renderLog() {
    let lines = history.slice(-MAX_LINES);
    const prompt = promptForVisibleMenu();
    if (prompt && lines[lines.length - 1] !== prompt && !window.SpellGame03?.state?.busy) {
      lines = [...lines.slice(-(MAX_LINES - 1)), prompt];
    }
    if (!lines.length && battleScreen.classList.contains("active")) {
      lines = [prompt || "戦闘開始！"];
    }
    rendered = lines.join("\n");
    internalWrite = true;
    battleLog.textContent = rendered;
    battleLog.style.setProperty("color", "#fff", "important");
    battleLog.style.setProperty("visibility", "visible", "important");
    battleLog.style.setProperty("opacity", "1", "important");
    internalWrite = false;
  }

  function consumeExternalLog() {
    if (internalWrite) return;
    const raw = String(battleLog.textContent || "");
    if (!raw || raw === rendered) {
      renderLog();
      return;
    }
    const lines = raw.split(/\r?\n/).map(normalize).filter(keep);
    if (lines.some(line => line.includes("が あらわれた！"))) history.length = 0;
    for (const line of lines) {
      if (!line) continue;
      if (history[history.length - 1] === line) continue;
      history.push(line);
    }
    if (history.length > MAX_LINES) history.splice(0, history.length - MAX_LINES);
    renderLog();
  }

  new MutationObserver(consumeExternalLog).observe(battleLog, {
    childList: true,
    subtree: true,
    characterData: true
  });

  function visibleCommands() {
    const grid = visibleGrid();
    if (!grid) return [];
    return [...grid.querySelectorAll("button.command")]
      .filter(button => !button.disabled && !button.hidden);
  }

  function ensureCursor(button) {
    let cursor = button.querySelector(":scope > .battle-command-cursor");
    if (!cursor) {
      cursor = document.createElement("span");
      cursor.className = "battle-command-cursor";
      cursor.setAttribute("aria-hidden", "true");
      button.prepend(cursor);
    }
    return cursor;
  }

  function select(button, focus = false) {
    if (!button) return false;
    menuWrap.querySelectorAll("button.command").forEach(item => {
      const selected = item === button;
      item.classList.toggle("is-selected", selected);
      ensureCursor(item).textContent = selected ? "▶" : "";
      if (selected) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });
    if (focus) {
      try { button.focus({ preventScroll: true }); }
      catch (_) { button.focus(); }
    }
    return true;
  }

  function syncSelection() {
    const commands = visibleCommands();
    if (!commands.length) return;
    const current = commands.find(button => button.classList.contains("is-selected"));
    select(current || commands[0]);
    renderLog();
  }

  function moveSelection(delta) {
    const commands = visibleCommands();
    if (!commands.length) return false;
    const current = commands.find(button => button.classList.contains("is-selected")) || commands[0];
    const index = commands.indexOf(current);
    return select(commands[(index + delta + commands.length) % commands.length], true);
  }

  menuWrap.addEventListener("pointerover", event => {
    const button = event.target.closest?.("button.command");
    if (!button || button.disabled || button.closest(".command-grid")?.classList.contains("hidden")) return;
    select(button);
  });
  menuWrap.addEventListener("focusin", event => {
    const button = event.target.closest?.("button.command");
    if (!button || button.disabled || button.closest(".command-grid")?.classList.contains("hidden")) return;
    select(button);
  });

  document.addEventListener("keydown", event => {
    if (!battleScreen.classList.contains("active")) return;
    const commands = visibleCommands();
    if (!commands.length || window.SpellGame03?.state?.busy) return;

    if (["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      moveSelection(event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1);
      return;
    }

    if (event.key === "z" || event.key === "Z" || event.key === "Enter") {
      event.preventDefault();
      event.stopImmediatePropagation();
      const selected = commands.find(button => button.classList.contains("is-selected")) || commands[0];
      select(selected, true);
      selected?.click();
    }
  }, true);

  new MutationObserver(() => {
    syncSelection();
    queueMicrotask(consumeExternalLog);
  }).observe(menuWrap, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "disabled", "hidden"]
  });

  new MutationObserver(() => {
    if (battleScreen.classList.contains("active")) {
      queueMicrotask(() => {
        consumeExternalLog();
        syncSelection();
        renderLog();
      });
    }
  }).observe(battleScreen, {
    attributes: true,
    attributeFilter: ["class"]
  });

  menuWrap.querySelectorAll("button.command").forEach(ensureCursor);
  consumeExternalLog();
  syncSelection();

  window.SpellBattleUiCore = {
    version: "2026-08-22-dq-command-v2",
    syncSelection,
    moveSelection,
    renderLog,
    history
  };
})();