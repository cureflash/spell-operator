(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const screens = {
    title: $("#screen-title"),
    debug: $("#screen-debug"),
    battle: $("#screen-battle"),
    clear: $("#screen-clear"),
  };

  const initialCode = `# Fire を完成させるチュートリアル\n# 1000回ループではルミエルがオーバーヒートします。\nspell fire\n\nfor i in range(1000):\n    print(5 - i)\n\ncast("fire")`;

  const state = {
    lastRun: null,
    registeredSpell: null,
    battle: null,
    busy: false,
    pendingActions: { sophie: null, lumiere: null },
  };

  const interpreter = new SpellRuntime.SpellInterpreter({ stepLimit: 1000 });

  function showScreen(name) {
    Object.values(screens).forEach(el => el.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function resetDebug() {
    $("#code-editor").value = initialCode;
    state.lastRun = null;
    state.registeredSpell = null;
    $("#register-spell").disabled = true;
    $("#spell-badge").textContent = "未登録";
    $("#spell-badge").className = "badge muted";
    setRunState("READY", "neutral");
    $("#console-output").textContent = "コードを実行してください。";
    $("#metric-steps").textContent = "—";
    $("#metric-mp").textContent = "—";
    $("#metric-result").textContent = "未実行";
  }

  function setRunState(label, style) {
    const el = $("#run-state");
    el.textContent = label;
    el.className = `status ${style}`;
  }

  function runCode() {
    const source = $("#code-editor").value;
    try {
      const result = interpreter.run(source);
      const validation = interpreter.validateFire(result);
      state.lastRun = { ...result, validation };
      const lines = [];
      if (result.output.length) lines.push(...result.output.map(v => `> ${v}`));
      for (const spell of result.casts) lines.push(`[CAST] ${spell.toUpperCase()}`);
      if (!lines.length) lines.push("(出力なし)");
      lines.push("", `実行ステップ: ${result.steps}`, `推定MP: ${result.mpCost}`);

      if (validation.ok) {
        lines.push("", "CHECK OK: Fire は実戦登録できます。");
        setRunState("SUCCESS", "good");
        $("#metric-result").textContent = "成功";
        $("#register-spell").disabled = false;
      } else {
        lines.push("", "CHECK NG:");
        if (!validation.checks.spellMatches) lines.push("- `spell fire` が必要です。");
        if (!validation.checks.outputMatches) lines.push("- 出力を 5,4,3,2,1 にしてください。");
        if (!validation.checks.castMatches) lines.push("- `cast(\"fire\")` を1回実行してください。");
        setRunState("CHECK NG", "warn");
        $("#metric-result").textContent = "条件未達";
        $("#register-spell").disabled = true;
      }
      $("#console-output").textContent = lines.join("\n");
      $("#metric-steps").textContent = result.steps;
      $("#metric-mp").textContent = result.mpCost;
    } catch (error) {
      state.lastRun = null;
      $("#register-spell").disabled = true;
      const overheat = error instanceof SpellRuntime.OverheatError;
      setRunState(overheat ? "OVERHEAT" : "ERROR", "bad");
      $("#console-output").textContent = overheat
        ? `${error.name}: ${error.message}\n\nヒント: range(1000) を range(5) に直して再実行してください。`
        : `${error.name}: ${error.message}`;
      $("#metric-steps").textContent = overheat ? ">1000" : "—";
      $("#metric-mp").textContent = "—";
      $("#metric-result").textContent = overheat ? "過熱停止" : "エラー";
    }
  }

  function registerSpell() {
    if (!state.lastRun?.validation?.ok) return;
    state.registeredSpell = {
      name: "Fire",
      element: "fire",
      mpCost: state.lastRun.mpCost,
      steps: state.lastRun.steps,
      damage: 35,
    };
    $("#spell-badge").textContent = `Fire 登録済み / MP ${state.registeredSpell.mpCost}`;
    $("#spell-badge").className = "badge success";
    startBattle();
  }

  function startBattle() {
    state.battle = {
      enemy: { hp: 80, maxHp: 80 },
      sophie: { hp: 42, maxHp: 42 },
      lumiere: { hp: 35, maxHp: 35, mp: 30, maxMp: 30 },
      defend: { sophie: false, lumiere: false },
    };
    state.pendingActions = { sophie: null, lumiere: null };
    state.busy = false;
    $("#fire-cost").textContent = `MP ${state.registeredSpell.mpCost}`;
    setBattleLog("デバッグスライムが あらわれた！\nソフィーはどうする？");
    showMenu("sophie");
    renderBattle();
    showScreen("battle");
  }

  function showMenu(name) {
    ["#sophie-menu", "#lumiere-menu", "#magic-menu"].forEach(id => $(id).classList.add("hidden"));
    if (name === "sophie") $("#sophie-menu").classList.remove("hidden");
    if (name === "lumiere") $("#lumiere-menu").classList.remove("hidden");
    if (name === "magic") $("#magic-menu").classList.remove("hidden");
  }

  function renderBattle() {
    const b = state.battle;
    if (!b) return;
    updateBar("#enemy-hp-bar", "#enemy-hp-text", b.enemy.hp, b.enemy.maxHp);
    updateBar("#sophie-hp-bar", "#sophie-hp-text", b.sophie.hp, b.sophie.maxHp);
    updateBar("#lumiere-hp-bar", "#lumiere-hp-text", b.lumiere.hp, b.lumiere.maxHp);
    updateBar("#lumiere-mp-bar", "#lumiere-mp-text", b.lumiere.mp, b.lumiere.maxMp);
  }

  function updateBar(barSelector, textSelector, value, max) {
    const pct = Math.max(0, Math.min(100, value / max * 100));
    $(barSelector).style.width = `${pct}%`;
    $(textSelector).textContent = `${Math.max(0, value)}/${max}`;
  }

  function setBattleLog(text) { $("#battle-log").textContent = text; }

  function animate(selector, className) {
    const el = $(selector);
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 700);
  }

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function chooseSophie(action) {
    if (state.busy) return;
    state.pendingActions.sophie = action;
    setBattleLog(`ソフィー：${action === "fight" ? "たたかう" : "ぼうぎょ"}\nルミエルはどうする？`);
    showMenu("lumiere");
  }

  function chooseLumiere(action) {
    if (state.busy) return;
    if (action === "magic") {
      showMenu("magic");
      setBattleLog("ルミエルはどの魔法を使う？");
      return;
    }
    state.pendingActions.lumiere = action;
    resolveRound();
  }

  function chooseFire() {
    if (state.busy) return;
    const b = state.battle;
    if (b.lumiere.mp < state.registeredSpell.mpCost) {
      setBattleLog("MPが足りない！\nルミエルは別の行動を選んでください。");
      showMenu("lumiere");
      return;
    }
    state.pendingActions.lumiere = "fire";
    resolveRound();
  }

  async function resolveRound() {
    if (state.busy || !state.battle) return;
    state.busy = true;
    const b = state.battle;
    b.defend.sophie = state.pendingActions.sophie === "defend";
    b.defend.lumiere = state.pendingActions.lumiere === "defend";
    showMenu("none");

    if (state.pendingActions.sophie === "fight") {
      const damage = 12;
      b.enemy.hp -= damage;
      animate(".sprite.sophie", "cast");
      animate("#enemy-sprite", "hit");
      setBattleLog(`ソフィーの こうげき！\nデバッグスライムに ${damage} のダメージ！`);
      renderBattle();
      await delay(600);
      if (b.enemy.hp <= 0) return finishBattle();
    } else {
      setBattleLog("ソフィーは みをまもっている。");
      await delay(400);
    }

    if (state.pendingActions.lumiere === "fire") {
      const spell = state.registeredSpell;
      b.lumiere.mp -= spell.mpCost;
      b.enemy.hp -= spell.damage;
      animate(".sprite.lumiere", "cast");
      animate("#enemy-sprite", "hit");
      setBattleLog(`ルミエルは 自作魔法 Fire を実行した！\nデバッグスライムに ${spell.damage} のダメージ！\nMP ${spell.mpCost} 消費（${spell.steps} steps）。`);
      renderBattle();
      await delay(700);
      if (b.enemy.hp <= 0) return finishBattle();
    } else {
      setBattleLog("ルミエルは みをまもっている。");
      await delay(400);
    }

    await enemyTurn();
    if (b.sophie.hp <= 0 || b.lumiere.hp <= 0) return;

    state.pendingActions = { sophie: null, lumiere: null };
    state.busy = false;
    setBattleLog("次のターン。\nソフィーはどうする？");
    showMenu("sophie");
  }

  async function enemyTurn() {
    const b = state.battle;
    const baseDamage = 8;
    const target = Math.random() < .5 ? "sophie" : "lumiere";
    const damage = b.defend[target] ? Math.ceil(baseDamage / 2) : baseDamage;
    b[target].hp -= damage;
    animate(target === "sophie" ? ".sprite.sophie" : ".sprite.lumiere", "hit");
    const targetName = target === "sophie" ? "ソフィー" : "ルミエル";
    setBattleLog(`デバッグスライムの こうげき！\n${targetName}は ${damage} のダメージをうけた。`);
    renderBattle();
    await delay(650);

    if (b.sophie.hp <= 0 || b.lumiere.hp <= 0) {
      setBattleLog("戦闘不能。Prototypeではデバッグルームへ戻ります。");
      await delay(800);
      state.busy = false;
      showScreen("debug");
    }
  }

  function finishBattle() {
    state.busy = false;
    $("#clear-mp").textContent = state.registeredSpell.mpCost;
    $("#clear-steps").textContent = state.registeredSpell.steps;
    showScreen("clear");
  }

  $("#start-button").addEventListener("click", () => {
    resetDebug();
    showScreen("debug");
  });
  $("#reset-code").addEventListener("click", resetDebug);
  $("#run-code").addEventListener("click", runCode);
  $("#register-spell").addEventListener("click", registerSpell);
  $("#restart-button").addEventListener("click", () => {
    resetDebug();
    showScreen("title");
  });

  $("#sophie-fight").addEventListener("click", () => chooseSophie("fight"));
  $("#sophie-defend").addEventListener("click", () => chooseSophie("defend"));
  $("#lumiere-magic").addEventListener("click", () => chooseLumiere("magic"));
  $("#lumiere-defend").addEventListener("click", () => chooseLumiere("defend"));
  $("#magic-back").addEventListener("click", () => {
    showMenu("lumiere");
    setBattleLog("ルミエルはどうする？");
  });
  $("#cast-fire").addEventListener("click", chooseFire);

  resetDebug();
})();
