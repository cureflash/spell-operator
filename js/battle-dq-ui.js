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

  function playAttackBounce(character) {
    const portrait = document.getElementById(`dq-${character}-portrait`);
    if (!portrait) return false;
    portrait.classList.remove("is-attacking");
    void portrait.offsetWidth;
    portrait.classList.add("is-attacking");
    return true;
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

  function bindAttackSignal(character, selector) {
    const legacySprite = document.querySelector(selector);
    const enemySprite = document.getElementById("enemy-sprite");
    if (!legacySprite || !enemySprite) return;
    const observer = new MutationObserver(() => {
      if (!document.getElementById("screen-battle")?.classList.contains("active")) return;
      if (!legacySprite.classList.contains("cast")) return;
      if (!enemySprite.classList.contains("hit")) return;
      playAttackBounce(character);
    });
    observer.observe(legacySprite, { attributes: true, attributeFilter: ["class"] });
  }

  ensurePanel();
  render();

  const legacyTargets = [
    "sophie-hp-text", "lumiere-hp-text",
    "sophie-battle-name", "lumiere-battle-name"
  ].map(id => document.getElementById(id)).filter(Boolean);
  const observer = new MutationObserver(render);
  legacyTargets.forEach(el => observer.observe(el, { childList: true, subtree: true, characterData: true }));

  bindAttackSignal("sophie", ".sophie-battle");
  bindAttackSignal("lumiere", ".lumiere-battle");

  new MutationObserver(() => {
    if (document.getElementById("screen-battle")?.classList.contains("active")) render();
  }).observe(document.getElementById("screen-battle"), { attributes: true, attributeFilter: ["class"] });

  window.SpellBattlePortraits = {
    render,
    setStatus,
    setExpression,
    registerPortrait,
    registerStatusExpression,
    playAttack: playAttackBounce,
    getState(character) {
      return state[character] ? { ...state[character] } : null;
    },
    resolve(character) {
      return resolvePortrait(character);
    }
  };
})();
