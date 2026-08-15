(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const screens = {
    title: $("#screen-title"), hub: $("#screen-hub"), debug: $("#screen-debug"),
    battle: $("#screen-battle"), clear: $("#screen-clear"), defeat: $("#screen-defeat"),
  };
  const interpreter = new SpellRuntime.SpellInterpreter({ stepLimit: 1000 });
  const spellDefinitions = {
    fire: {
      name: "Fire", damage: 35,
      initialCode: `# Fire: 1000回ループではオーバーヒートします。\nspell fire\n\nfor i in range(1000):\n    print(5 - i)\n\ncast("fire")`,
      hint: 'range(1000) を必要な回数まで減らし、5 → 4 → 3 → 2 → 1 と出力してから cast("fire") を実行する。',
      validate: r => interpreter.validateFire(r),
    },
    heal: {
      name: "Heal", heal: 20,
      initialCode: `# Heal: HPが20未満のときだけ回復する。\nspell heal\n\nhp = 12\n\nif hp < 5:\n    cast("heal")`,
      hint: 'hp は12です。HPが20未満なら Heal を実行するよう、if の条件を直してください。',
      validate: r => interpreter.validateHeal(r),
    },
  };
  const state = {
    selectedSpellKey: null, drafts: Object.create(null), lastRun: null,
    registeredSpells: Object.create(null), battle: null, busy: false,
    pendingActions: { sophie: null, lumiere: null },
  };

  function showScreen(name) {
    Object.values(screens).forEach(el => el.classList.remove("active"));
    screens[name].classList.add("active");
  }
  function setRunState(label, style) {
    const el = $("#run-state"); el.textContent = label; el.className = `status ${style}`;
  }
  function resetAll() {
    state.selectedSpellKey = null; state.drafts = Object.create(null); state.lastRun = null;
    state.registeredSpells = Object.create(null); state.battle = null; state.busy = false;
    state.pendingActions = { sophie: null, lumiere: null }; updateWorkshop();
  }
  function updateWorkshop() {
    const n = Object.keys(state.registeredSpells).length;
    $("#workshop-progress").textContent = `${n} / 2 登録`;
    $("#workshop-progress").className = `badge ${n === 2 ? "success" : "muted"}`;
    for (const key of ["fire", "heal"]) {
      const badge = $(`#${key}-status`), spell = state.registeredSpells[key];
      badge.textContent = spell ? `登録済み / MP ${spell.mpCost}` : "未登録";
      badge.className = spell ? "badge success" : "badge muted";
    }
    $("#battle-button").disabled = n < 2;
  }
  function openWorkshop() { updateWorkshop(); showScreen("hub"); }
  function resetDebugResult() {
    state.lastRun = null; $("#register-spell").disabled = true;
    const key = state.selectedSpellKey, reg = key ? state.registeredSpells[key] : null;
    $("#spell-badge").textContent = reg ? `${spellDefinitions[key].name} 登録済み / MP ${reg.mpCost}` : "未登録";
    $("#spell-badge").className = reg ? "badge success" : "badge muted";
    setRunState("READY", "neutral"); $("#console-output").textContent = "コードを実行してください。";
    $("#metric-steps").textContent = "—"; $("#metric-mp").textContent = "—"; $("#metric-result").textContent = "未実行";
  }
  function openDebug(key) {
    state.selectedSpellKey = key; state.lastRun = null;
    const def = spellDefinitions[key];
    $("#debug-title").textContent = `魔法開発：${def.name}`; $("#debug-hint").textContent = def.hint;
    $("#code-editor").value = state.drafts[key] ?? def.initialCode; resetDebugResult(); showScreen("debug");
  }
  function resetCode() {
    const key = state.selectedSpellKey; if (!key) return;
    state.drafts[key] = spellDefinitions[key].initialCode; $("#code-editor").value = state.drafts[key]; resetDebugResult();
  }
  function ngMessages(key, v) {
    const c = v.checks || {}, a = [];
    if (key === "fire") {
      if (!c.spellMatches) a.push("- `spell fire` が必要です。");
      if (!c.loopUsed) a.push("- `for` ループを使ってください。");
      if (!c.outputMatches) a.push("- 出力を 5,4,3,2,1 にしてください。");
      if (!c.castMatches) a.push('- `cast("fire")` を1回実行してください。');
    } else {
      if (!c.spellMatches) a.push("- `spell heal` が必要です。");
      if (!c.assignmentUsed) a.push("- HPを変数へ代入してください。");
      if (!c.conditionalUsed) a.push("- `if` 条件分岐を使ってください。");
      if (!c.castMatches) a.push('- 条件成立時に `cast("heal")` を1回実行してください。');
    }
    return a;
  }
  function runCode() {
    const key = state.selectedSpellKey; if (!key) return;
    const source = $("#code-editor").value; state.drafts[key] = source;
    try {
      const result = interpreter.run(source), validation = spellDefinitions[key].validate(result);
      state.lastRun = { ...result, validation, key, source };
      const lines = result.output.map(v => `> ${v}`);
      result.casts.forEach(s => lines.push(`[CAST] ${s.toUpperCase()}`));
      if (!lines.length) lines.push("(出力なし)");
      lines.push("", `実行ステップ: ${result.steps}`, `推定MP: ${result.mpCost}`);
      if (validation.ok) {
        lines.push("", `CHECK OK: ${spellDefinitions[key].name} は実戦登録できます。`);
        setRunState("SUCCESS", "good"); $("#metric-result").textContent = "成功"; $("#register-spell").disabled = false;
      } else {
        lines.push("", "CHECK NG:", ...ngMessages(key, validation));
        setRunState("CHECK NG", "warn"); $("#metric-result").textContent = "条件未達"; $("#register-spell").disabled = true;
      }
      $("#console-output").textContent = lines.join("\n"); $("#metric-steps").textContent = result.steps; $("#metric-mp").textContent = result.mpCost;
    } catch (e) {
      state.lastRun = null; $("#register-spell").disabled = true;
      const hot = e instanceof SpellRuntime.OverheatError; setRunState(hot ? "OVERHEAT" : "ERROR", "bad");
      $("#console-output").textContent = hot ? `${e.name}: ${e.message}\n\nヒント: ループ回数を減らして再実行してください。` : `${e.name}: ${e.message}`;
      $("#metric-steps").textContent = hot ? ">1000" : "—"; $("#metric-mp").textContent = "—"; $("#metric-result").textContent = hot ? "過熱停止" : "エラー";
    }
  }
  function registerSpell() {
    if (!state.lastRun?.validation?.ok) return;
    const key = state.lastRun.key, def = spellDefinitions[key];
    state.registeredSpells[key] = { key, name: def.name, mpCost: state.lastRun.mpCost, steps: state.lastRun.steps,
      damage: def.damage || 0, heal: def.heal || 0, source: state.lastRun.source };
    openWorkshop();
  }

  window.SpellGame02 = { $, screens, state, interpreter, spellDefinitions, showScreen, openWorkshop, updateWorkshop };
  $("#start-button").addEventListener("click", () => { resetAll(); openWorkshop(); });
  $("#develop-fire").addEventListener("click", () => openDebug("fire"));
  $("#develop-heal").addEventListener("click", () => openDebug("heal"));
  $("#reset-code").addEventListener("click", resetCode); $("#run-code").addEventListener("click", runCode);
  $("#register-spell").addEventListener("click", registerSpell);
  $("#back-workshop").addEventListener("click", () => { if (state.selectedSpellKey) state.drafts[state.selectedSpellKey] = $("#code-editor").value; openWorkshop(); });
  resetAll();
})();
