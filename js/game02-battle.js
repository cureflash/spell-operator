(() => {
  "use strict";
  const G = window.SpellGame02, $ = G.$, state = G.state;
  const enemies = [
    { name: "デバッグスライム", maxHp: 80, attack: 8, symbol: "◉" },
    { name: "スタックビートル", maxHp: 115, attack: 16, symbol: "◆" },
  ];
  const enemyAt = i => ({ ...enemies[i], hp: enemies[i].maxHp });
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const log = t => $("#battle-log").textContent = t;
  function menu(name) {
    ["#sophie-menu", "#lumiere-menu", "#magic-menu", "#heal-target-menu"].forEach(id => $(id).classList.add("hidden"));
    if (name === "sophie") $("#sophie-menu").classList.remove("hidden");
    if (name === "lumiere") $("#lumiere-menu").classList.remove("hidden");
    if (name === "magic") $("#magic-menu").classList.remove("hidden");
    if (name === "heal") $("#heal-target-menu").classList.remove("hidden");
  }
  function bar(b, t, v, m) {
    v = Math.max(0, v); $(b).style.width = `${Math.max(0, Math.min(100, v / m * 100))}%`; $(t).textContent = `${v}/${m}`;
  }
  function render() {
    const b = state.battle; if (!b) return;
    bar("#enemy-hp-bar", "#enemy-hp-text", b.enemy.hp, b.enemy.maxHp);
    bar("#sophie-hp-bar", "#sophie-hp-text", b.sophie.hp, b.sophie.maxHp);
    bar("#lumiere-hp-bar", "#lumiere-hp-text", b.lumiere.hp, b.lumiere.maxHp);
    bar("#lumiere-mp-bar", "#lumiere-mp-text", b.lumiere.mp, b.lumiere.maxMp);
  }
  function anim(sel, cls) {
    const el = $(sel); el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 700);
  }
  function begin() {
    const b = state.battle, e = b.enemy;
    $("#enemy-name").textContent = e.name; $("#enemy-sprite").textContent = e.symbol;
    $("#encounter-badge").textContent = `ENCOUNTER ${b.encounterIndex + 1} / ${enemies.length}`;
    state.pendingActions = { sophie: null, lumiere: null }; state.busy = false; b.defend = { sophie: false, lumiere: false };
    log(`${e.name}が あらわれた！\nソフィーはどうする？`); menu("sophie"); render();
  }
  function startBattle() {
    if (!state.registeredSpells.fire || !state.registeredSpells.heal) return;
    state.battle = { encounterIndex: 0, enemy: enemyAt(0), sophie: { hp: 42, maxHp: 42 },
      lumiere: { hp: 35, maxHp: 35, mp: 30, maxMp: 30 }, defend: { sophie: false, lumiere: false } };
    $("#fire-cost").textContent = `MP ${state.registeredSpells.fire.mpCost}`;
    $("#heal-cost").textContent = `MP ${state.registeredSpells.heal.mpCost}`;
    begin(); G.showScreen("battle");
  }
  function sophie(action) {
    if (state.busy) return; state.pendingActions.sophie = action;
    log(`ソフィー：${action === "fight" ? "たたかう" : "ぼうぎょ"}\nルミエルはどうする？`); menu("lumiere");
  }
  function lumiere(action) {
    if (state.busy) return;
    if (action === "magic") { log("ルミエルはどの魔法を使う？"); menu("magic"); return; }
    state.pendingActions.lumiere = { type: action }; round();
  }
  function mpCheck(spell) {
    if (state.battle.lumiere.mp >= spell.mpCost) return true;
    log("MPが足りない！\nルミエルは別の行動を選んでください。"); menu("lumiere"); return false;
  }
  function fire() {
    if (state.busy || !mpCheck(state.registeredSpells.fire)) return;
    state.pendingActions.lumiere = { type: "fire" }; round();
  }
  function heal() {
    if (state.busy || !mpCheck(state.registeredSpells.heal)) return;
    log("Healの対象を選んでください。"); menu("heal");
  }
  function healTarget(target) { if (!state.busy) { state.pendingActions.lumiere = { type: "heal", target }; round(); } }
  async function enemyTurn() {
    const b = state.battle, target = Math.random() < .5 ? "sophie" : "lumiere";
    const dmg = b.defend[target] ? Math.ceil(b.enemy.attack / 2) : b.enemy.attack;
    b[target].hp -= dmg; anim(target === "sophie" ? ".sprite.sophie" : ".sprite.lumiere", "hit");
    log(`${b.enemy.name}の こうげき！\n${target === "sophie" ? "ソフィー" : "ルミエル"}は ${dmg} のダメージをうけた。`); render(); await delay(580);
  }
  async function enemyDown() {
    const b = state.battle; log(`${b.enemy.name}を たおした！`); render(); await delay(650);
    if (b.encounterIndex + 1 >= enemies.length) {
      state.busy = false; $("#clear-fire-mp").textContent = state.registeredSpells.fire.mpCost;
      $("#clear-heal-mp").textContent = state.registeredSpells.heal.mpCost; G.showScreen("clear"); return;
    }
    b.encounterIndex++; b.enemy = enemyAt(b.encounterIndex); b.lumiere.mp = Math.min(b.lumiere.maxMp, b.lumiere.mp + 3);
    log("短い移動のあいだに MPが3回復した。\n次の敵が近づいてくる……"); render(); await delay(850); begin();
  }
  async function round() {
    if (state.busy || !state.battle) return; state.busy = true;
    const b = state.battle, la = state.pendingActions.lumiere;
    b.defend.sophie = state.pendingActions.sophie === "defend"; b.defend.lumiere = la?.type === "defend"; menu("none");
    if (state.pendingActions.sophie === "fight") {
      b.enemy.hp -= 12; anim(".sprite.sophie", "cast"); anim("#enemy-sprite", "hit");
      log(`ソフィーの こうげき！\n${b.enemy.name}に 12 のダメージ！`); render(); await delay(520); if (b.enemy.hp <= 0) return enemyDown();
    } else { log("ソフィーは みをまもっている。"); await delay(350); }
    if (la?.type === "fire") {
      const s = state.registeredSpells.fire; b.lumiere.mp -= s.mpCost; b.enemy.hp -= s.damage;
      anim(".sprite.lumiere", "cast"); anim("#enemy-sprite", "hit");
      log(`ルミエルは 自作魔法 Fire を実行した！\n${b.enemy.name}に ${s.damage} のダメージ！\nMP ${s.mpCost} 消費（${s.steps} steps）。`);
      render(); await delay(620); if (b.enemy.hp <= 0) return enemyDown();
    } else if (la?.type === "heal") {
      const s = state.registeredSpells.heal, t = b[la.target], before = t.hp; t.hp = Math.min(t.maxHp, t.hp + s.heal); b.lumiere.mp -= s.mpCost;
      anim(".sprite.lumiere", "cast"); log(`ルミエルは 自作魔法 Heal を実行した！\n${la.target === "sophie" ? "ソフィー" : "ルミエル"}のHPが ${t.hp - before} 回復した。\nMP ${s.mpCost} 消費（${s.steps} steps）。`); render(); await delay(620);
    } else { log("ルミエルは みをまもっている。"); await delay(350); }
    await enemyTurn();
    if (b.sophie.hp <= 0 || b.lumiere.hp <= 0) { state.busy = false; G.showScreen("defeat"); return; }
    state.pendingActions = { sophie: null, lumiere: null }; state.busy = false; log("次のターン。\nソフィーはどうする？"); menu("sophie");
  }

  $("#battle-button").addEventListener("click", startBattle);
  $("#sophie-fight").addEventListener("click", () => sophie("fight")); $("#sophie-defend").addEventListener("click", () => sophie("defend"));
  $("#lumiere-magic").addEventListener("click", () => lumiere("magic")); $("#lumiere-defend").addEventListener("click", () => lumiere("defend"));
  $("#cast-fire").addEventListener("click", fire); $("#cast-heal").addEventListener("click", heal);
  $("#magic-back").addEventListener("click", () => { log("ルミエルはどうする？"); menu("lumiere"); });
  $("#heal-sophie").addEventListener("click", () => healTarget("sophie")); $("#heal-lumiere").addEventListener("click", () => healTarget("lumiere"));
  $("#heal-back").addEventListener("click", () => { log("ルミエルはどの魔法を使う？"); menu("magic"); });
  $("#retry-battle").addEventListener("click", startBattle); $("#defeat-workshop").addEventListener("click", G.openWorkshop);
  $("#clear-workshop").addEventListener("click", G.openWorkshop);
  G.startBattle = startBattle;
})();
