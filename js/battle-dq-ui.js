(() => {
  "use strict";

  const G = window.SpellGame03;
  const scene = document.querySelector("#screen-battle .battle-scene");
  if (!G || !scene) return;

  const characters = ["sophie", "lumiere"];
  const labels = { sophie: "ソフィー", lumiere: "ルミエル" };
  const portraitOverrides = Object.create(null);
  const statusExpressions = {
    normal: "battle",
    danger: "neutral",
    ko: "neutral",
    fainted: "neutral"
  };
  const state = {
    sophie: { status: "normal", expression: "neutral" },
    lumiere: { status: "normal", expression: "neutral" }
  };

  const battleScreen = document.getElementById("screen-battle");
  const battleLog = document.getElementById("battle-log");
  const commandMenuWrap = battleScreen?.querySelector(".battle-menu-wrap");
  const battleLogLines = [];
  const MAX_BATTLE_LOG_LINES = 4;
  let renderedBattleLog = "";

  function normalizeBattleLine(line) {
    return String(line || "").trim()
      .replace(/^ソフィーはどうする？$/, "ソフィーは どうする？")
      .replace(/^ルミエルはどうする？$/, "ルミエルは どうする？");
  }

  function shouldKeepBattleLine(line) {
    if (!line) return false;
    if (/^(ソフィー|ルミエル)：(?:たたかう|ぼうぎょ)$/.test(line)) return false;
    if (/^ソフィーの行動を決めた。$/.test(line)) return false;
    return true;
  }

  function renderBattleLog() {
    if (!battleLog) return;
    renderedBattleLog = battleLogLines.slice(-MAX_BATTLE_LOG_LINES).join("\n");
    if (battleLog.textContent !== renderedBattleLog) battleLog.textContent = renderedBattleLog;
  }

  function consumeBattleLogWrite() {
    if (!battleLog) return;
    const raw = battleLog.textContent || "";
    if (raw === renderedBattleLog) return;

    const lines = raw
      .split(/\r?\n/)
      .map(normalizeBattleLine)
      .filter(shouldKeepBattleLine);

    if (lines.some(line => line.includes("が あらわれた！"))) battleLogLines.length = 0;
    battleLogLines.push(...lines);
    if (battleLogLines.length > MAX_BATTLE_LOG_LINES) {
      battleLogLines.splice(0, battleLogLines.length - MAX_BATTLE_LOG_LINES);
    }
    renderBattleLog();
  }

  function installBattleLogHistory() {
    if (!battleLog) return;
    new MutationObserver(consumeBattleLogWrite).observe(battleLog, {
      childList: true,
      subtree: true,
      characterData: true
    });
    consumeBattleLogWrite();
  }

  function visibleCommandGrid() {
    if (!commandMenuWrap) return null;
    return [...commandMenuWrap.querySelectorAll(".command-grid")]
      .find(grid => !grid.classList.contains("hidden")) || null;
  }

  function availableCommands(grid = visibleCommandGrid()) {
    if (!grid) return [];
    return [...grid.querySelectorAll("button.command")]
      .filter(button => !button.disabled && !button.hidden);
  }

  function setSelectedCommand(button, { focus = false } = {}) {
    if (!commandMenuWrap || !button) return;
    commandMenuWrap.querySelectorAll("button.command").forEach(item => {
      const selected = item === button;
      item.classList.toggle("is-selected", selected);
      if (selected) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });
    if (focus) {
      try { button.focus({ preventScroll: true }); }
      catch (_) { button.focus(); }
    }
  }

  function syncCommandSelection() {
    if (!commandMenuWrap) return;
    const grid = visibleCommandGrid();
    if (!grid) {
      commandMenuWrap.querySelectorAll("button.command.is-selected").forEach(item => {
        item.classList.remove("is-selected");
        item.removeAttribute("aria-current");
      });
      return;
    }
    const commands = availableCommands(grid);
    if (!commands.length) return;
    const selected = commands.find(button => button.classList.contains("is-selected"));
    setSelectedCommand(selected || commands[0]);
  }

  function commandCenter(button) {
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function moveCommandSelection(direction) {
    const grid = visibleCommandGrid();
    const commands = availableCommands(grid);
    if (!commands.length) return false;

    const current = commands.find(button => button.classList.contains("is-selected")) || commands[0];
    const origin = commandCenter(current);
    const candidates = commands
      .filter(button => button !== current)
      .map(button => {
        const center = commandCenter(button);
        const dx = center.x - origin.x;
        const dy = center.y - origin.y;
        const valid = direction === "left" ? dx < -1
          : direction === "right" ? dx > 1
          : direction === "up" ? dy < -1
          : dy > 1;
        if (!valid) return null;
        const primary = direction === "left" || direction === "right" ? Math.abs(dx) : Math.abs(dy);
        const secondary = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
        return { button, score: primary * 1000 + secondary };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);

    let next = candidates[0]?.button;
    if (!next) {
      const index = commands.indexOf(current);
      const step = direction === "left" || direction === "up" ? -1 : 1;
      next = commands[(index + step + commands.length) % commands.length];
    }
    setSelectedCommand(next, { focus: true });
    return true;
  }

  function installCommandSelection() {
    if (!commandMenuWrap || !battleScreen) return;

    const selectFromEvent = event => {
      const button = event.target.closest?.("button.command");
      if (!button || button.disabled || button.closest(".command-grid")?.classList.contains("hidden")) return;
      setSelectedCommand(button);
    };
    commandMenuWrap.addEventListener("pointerdown", selectFromEvent);
    commandMenuWrap.addEventListener("pointerover", selectFromEvent);
    commandMenuWrap.addEventListener("focusin", selectFromEvent);

    new MutationObserver(syncCommandSelection).observe(commandMenuWrap, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "disabled", "hidden"]
    });

    document.addEventListener("keydown", event => {
      if (!battleScreen.classList.contains("active") || G.state?.busy) return;
      const grid = visibleCommandGrid();
      if (!grid) return;

      const direction = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down"
      }[event.key];

      if (direction) {
        event.preventDefault();
        event.stopImmediatePropagation();
        moveCommandSelection(direction);
        return;
      }

      if (event.key === "z" || event.key === "Z" || event.key === "Enter") {
        const commands = availableCommands(grid);
        const selected = commands.find(button => button.classList.contains("is-selected")) || commands[0];
        if (!selected) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        setSelectedCommand(selected, { focus: true });
        selected.click();
      }
    }, true);

    syncCommandSelection();
  }

  function makeCard(character) {
    const card = document.createElement("section");
    card.className = "dq-party-card";
    card.dataset.character = character;
    card.dataset.status = "normal";
    card.innerHTML = `
      <div class="dq-party-portrait" id="dq-${character}-portrait" aria-label="${labels[character]}の顔グラ"></div>
      <div class="dq-party-stats">
        <div class="dq-party-name" id="dq-${character}-name">${labels[character]}</div>
        <div class="dq-party-line"><span>Lv</span><strong id="dq-${character}-level">—</strong></div>
        <div class="dq-party-line"><span>HP</span><strong id="dq-${character}-hp">— / —</strong></div>
      </div>`;
    return card;
  }

  function ensurePanel() {
    let panel = document.getElementById("dq-party-panel");
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "dq-party-panel";
    panel.className = "dq-party-panel";
    characters.forEach(character => panel.appendChild(makeCard(character)));
    scene.appendChild(panel);
    return panel;
  }

  function resolvePortrait(character) {
    const current = state[character] || state.sophie;
    const byCharacter = portraitOverrides[character] || {};
    return byCharacter[current.status]
      || byCharacter[current.expression]
      || byCharacter.normal
      || window.SpellPortraits?.resolve?.(character, current.expression)
      || window.SpellPortraits?.resolve?.(character, "neutral")
      || "";
  }

  function applyPortrait(character) {
    const portrait = document.getElementById(`dq-${character}-portrait`);
    const card = document.querySelector(`.dq-party-card[data-character="${character}"]`);
    if (!portrait || !card) return;
    const current = state[character];
    card.dataset.status = current.status;
    const src = resolvePortrait(character);
    portrait.style.backgroundImage = src ? `url("${src}")` : "none";
  }

  function deriveStatus(member) {
    if (!member || member.hp <= 0) return "ko";
    if (member.maxHp > 0 && member.hp / member.maxHp <= 0.25) return "danger";
    return "normal";
  }

  function renderCharacter(character) {
    const battle = G.state?.battle;
    const member = battle?.[character];
    const progress = G.state?.party?.[character];
    const name = document.getElementById(`dq-${character}-name`);
    const level = document.getElementById(`dq-${character}-level`);
    const hp = document.getElementById(`dq-${character}-hp`);
    if (name) name.textContent = labels[character];
    if (level) level.textContent = String(member?.level ?? progress?.level ?? "—");
    if (hp) hp.textContent = member ? `${Math.max(0, member.hp)} / ${member.maxHp}` : "— / —";

    const automaticStatus = deriveStatus(member);
    if (state[character].status === "normal" || ["normal", "danger", "ko"].includes(state[character].status)) {
      state[character].status = automaticStatus;
      state[character].expression = statusExpressions[automaticStatus] || "neutral";
    }
    applyPortrait(character);
  }

  function render() {
    ensurePanel();
    characters.forEach(renderCharacter);
    syncCommandSelection();
  }

  function setStatus(character, status, expression = null) {
    if (!state[character]) return false;
    const nextStatus = String(status || "normal").trim().toLowerCase() || "normal";
    state[character].status = nextStatus;
    state[character].expression = expression || statusExpressions[nextStatus] || "neutral";
    applyPortrait(character);
    return true;
  }

  function setExpression(character, expression) {
    if (!state[character]) return false;
    state[character].expression = String(expression || "neutral").trim().toLowerCase() || "neutral";
    applyPortrait(character);
    return true;
  }

  function registerPortrait(character, stateKey, src) {
    if (!characters.includes(character) || !stateKey || !src) return false;
    portraitOverrides[character] ||= Object.create(null);
    portraitOverrides[character][String(stateKey).trim().toLowerCase()] = String(src);
    applyPortrait(character);
    return true;
  }

  function registerStatusExpression(status, expression) {
    if (!status || !expression) return false;
    statusExpressions[String(status).trim().toLowerCase()] = String(expression).trim().toLowerCase();
    return true;
  }

  ensurePanel();
  render();
  installBattleLogHistory();
  installCommandSelection();

  const legacyTargets = [
    "sophie-hp-text", "lumiere-hp-text",
    "sophie-battle-name", "lumiere-battle-name"
  ].map(id => document.getElementById(id)).filter(Boolean);
  const observer = new MutationObserver(render);
  legacyTargets.forEach(el => observer.observe(el, { childList: true, subtree: true, characterData: true }));

  new MutationObserver(() => {
    if (battleScreen?.classList.contains("active")) {
      render();
      syncCommandSelection();
    }
  }).observe(battleScreen, { attributes: true, attributeFilter: ["class"] });

  window.SpellBattlePortraits = {
    render,
    setStatus,
    setExpression,
    registerPortrait,
    registerStatusExpression,
    getState(character) {
      return state[character] ? { ...state[character] } : null;
    },
    resolve(character) {
      return resolvePortrait(character);
    }
  };
})();
