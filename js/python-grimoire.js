(() => {
  "use strict";

  const G = window.SpellGame03;
  const $ = G.$;
  const state = G.state;
  if (!window.SpellPython) throw new Error("SpellPython runner is not loaded.");

  const defs = {
    fire: {
      name: "Fire",
      power: 60,
      baseMp: 3,
      manaDivisor: 400,
      problem: "魔導炉に整数 N が1つ入力される。炎の出力値として N の2倍を1行に出力せよ。",
      inputFormat: "整数 N（0 ≤ N ≤ 10000）",
      outputFormat: "N × 2 を整数で1行に出力する。",
      samples: [{ input: "7\n", output: "14\n" }],
      tests: [
        { input: "0\n", output: "0\n" },
        { input: "1\n", output: "2\n" },
        { input: "25\n", output: "50\n" },
        { input: "999\n", output: "1998\n" },
        { input: "10000\n", output: "20000\n" }
      ],
      debugInitialCode: "n = int(input())\nprint(n * 2)\n"
    },
    repair: {
      name: "Repair",
      heal: 20,
      baseMp: 2,
      manaDivisor: 400,
      problem: "現在HP H と最大HP M が空白区切りで入力される。完全修復に必要なHP量 M-H を出力せよ。",
      inputFormat: "整数 H M（0 ≤ H ≤ M ≤ 10000）",
      outputFormat: "M - H を整数で1行に出力する。",
      samples: [{ input: "12 30\n", output: "18\n" }],
      tests: [
        { input: "0 30\n", output: "30\n" },
        { input: "30 30\n", output: "0\n" },
        { input: "17 80\n", output: "63\n" },
        { input: "1 999\n", output: "998\n" },
        { input: "4321 10000\n", output: "5679\n" }
      ]
    }
  };

  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const blankMap = () => Object.create(null);
  const isUnlocked = key => Boolean(state.unlockedSpellbooks?.[key]);
  const isLearned = key => Boolean(state.learnedSpells?.[key]);
  const manaFor = (def, cost) => Math.min(99, def.baseMp + Math.ceil(Math.max(0, Number(cost) || 0) / def.manaDivisor));

  function normalizeSaved({ migrateRegistered = true } = {}) {
    state.registeredSpells ||= blankMap();
    state.drafts ||= blankMap();
    state.learnedSpells ||= blankMap();

    if (state.registeredSpells.heal && !state.registeredSpells.repair) {
      state.registeredSpells.repair = { ...state.registeredSpells.heal, key: "repair", name: "Repair" };
    }
    delete state.registeredSpells.heal;

    if (state.drafts.heal && !own(state.drafts, "repair")) state.drafts.repair = "";
    delete state.drafts.heal;

    if (state.learnedSpells.heal && !state.learnedSpells.repair) state.learnedSpells.repair = true;
    delete state.learnedSpells.heal;

    if (migrateRegistered && !Object.keys(state.learnedSpells).length) {
      for (const key of Object.keys(state.registeredSpells)) {
        if (defs[key]) state.learnedSpells[key] = true;
      }
    }

    for (const key of Object.keys(state.registeredSpells)) {
      const def = defs[key];
      if (!def) {
        delete state.registeredSpells[key];
        delete state.learnedSpells[key];
        continue;
      }
      const spell = state.registeredSpells[key];
      const oldSource = String(spell.source || "");
      spell.key = key;
      spell.name = def.name;
      spell.power = def.power || 0;
      spell.heal = def.heal || 0;
      if (!Number.isFinite(spell.mpCost)) spell.mpCost = manaFor(def, spell.abstractCost || 0);
      if (!Number.isFinite(spell.abstractCost)) spell.abstractCost = Number.isFinite(spell.steps) ? spell.steps : null;
      if (/^\s*spell\s/m.test(oldSource) || /cast\s*\(/.test(oldSource)) spell.source = "";
    }

    for (const key of Object.keys(state.learnedSpells)) {
      if (!defs[key] || !state.registeredSpells[key]) delete state.learnedSpells[key];
    }

    state.unlockedSpellbooks = {
      fire: true,
      repair: Boolean(state.unlockedSpellbooks?.repair || state.registeredSpells.repair)
    };
    state.spellSlots = [];
  }

  function sampleHtml(def) {
    const sample = def.samples[0];
    return `<div class="grimoire-sample"><strong>サンプル</strong><div><span>入力</span><pre>${esc(sample.input.trimEnd())}</pre></div><div><span>出力</span><pre>${esc(sample.output.trimEnd())}</pre></div></div>`;
  }

  function card(key, learned) {
    const def = defs[key];
    const spell = state.registeredSpells[key];
    const mp = learned && spell ? spell.mpCost : "未修得";
    const cost = learned && spell && Number.isFinite(spell.abstractCost) ? spell.abstractCost : "—";
    return `<article class="panel spell-card ${learned ? "learned" : ""}"><div class="spell-card-head"><div><p class="eyebrow">PROGRAMMING GRIMOIRE</p><h3>${def.name}</h3></div><span class="badge ${learned ? "success" : "muted"}">${learned ? "修得済み" : "未修得"}</span></div><p class="grimoire-problem">${esc(def.problem)}</p><div class="grimoire-spec"><strong>入出力仕様</strong><dl><div><dt>入力</dt><dd>${esc(def.inputFormat)}</dd></div><div><dt>出力</dt><dd>${esc(def.outputFormat)}</dd></div></dl></div>${sampleHtml(def)}<dl class="spell-spec"><div><dt>効果</dt><dd>${key === "fire" ? "威力60" : "HPを20修復"}</dd></div><div><dt>消費MP</dt><dd>${mp}</dd></div><div><dt>計算コスト</dt><dd>${cost}</dd></div></dl><button type="button" class="${learned ? "secondary" : "primary"}" data-python-spellbook="${key}">${learned ? "再テスト / 最適化" : "Pythonで挑戦"}</button>${learned ? '<small class="spell-learned-note">解答判定合格済み。より効率の良いコードでMPを下げられます。</small>' : ""}</article>`;
  }

  function ensureUi() {
    const hub = $("#screen-hub");
    const debug = $("#screen-debug");
    if (!hub || !debug) return;

    hub.classList.add("computer-screen");
    debug.classList.add("computer-editor-screen");
    const heading = hub.querySelector(".screen-heading");
    if (heading) {
      heading.querySelector(".kicker").textContent = "SOPHIE PC";
      heading.querySelector("h2").textContent = "魔導書";
    }

    const grid = hub.querySelector(".spell-grid");
    if (grid) {
      grid.className = "spell-grid grimoire-library";
      grid.innerHTML = `<section class="spellbook-group"><div class="spellbook-group-head"><div><p class="eyebrow">UNLEARNED</p><h3>未修得</h3></div><span>解答判定に合格すると修得</span></div><div id="spellbooks-unlearned" class="spellbook-list"></div></section><section class="spellbook-group learned-group"><div class="spellbook-group-head"><div><p class="eyebrow">LEARNED</p><h3>修得済み</h3></div><span>修得済みの魔法だけ戦闘で使用可能</span></div><div id="spellbooks-learned" class="spellbook-list"></div></section>`;
    }

    $("#spell-loadout")?.remove();
    const deploy = hub.querySelector(".deploy-panel");
    if (deploy) {
      deploy.querySelector(".eyebrow").textContent = "LOG OUT";
      deploy.querySelector("h3").textContent = "パソコンを閉じる";
      deploy.querySelector("p").textContent = "テスト実行だけでは修得しません。解答判定に合格した魔法だけ戦闘で使えます。";
    }

    const kicker = debug.querySelector(".kicker");
    if (kicker) kicker.textContent = "PYTHON / GRIMOIRE TEST";
    const manual = debug.querySelector(".manual");
    if (manual) manual.innerHTML = '<h4>Python 3</h4><p><code>input()</code> で入力を読み、<code>print()</code> で答えを出力します。通常のPython構文を使用できます。</p><p>テスト実行は確認用です。魔法の修得は「解答を判定」に合格した時だけ行われます。</p>';

    if (!hub.dataset.pythonGrimoire) {
      hub.dataset.pythonGrimoire = "1";
      hub.addEventListener("click", event => {
        const button = event.target.closest("[data-python-spellbook]");
        if (button) openEditor(button.dataset.pythonSpellbook);
      });
    }

    replaceButton("reset-code", resetCode);
    replaceButton("run-code", runCode);
    replaceButton("back-workshop", backToPc);
    const register = $("#register-spell");
    if (register) register.hidden = true;
  }

  function replaceButton(id, handler) {
    const old = $("#" + id);
    if (!old || old.dataset.pythonBound) return;
    const fresh = old.cloneNode(true);
    fresh.dataset.pythonBound = "1";
    old.replaceWith(fresh);
    fresh.addEventListener("click", handler);
  }

  function updateComputer() {
    ensureUi();
    normalizeSaved({ migrateRegistered: false });
    const available = Object.keys(defs).filter(isUnlocked);
    const unlearned = available.filter(key => !isLearned(key));
    const learned = available.filter(isLearned);
    const unlearnedBox = $("#spellbooks-unlearned");
    const learnedBox = $("#spellbooks-learned");
    if (unlearnedBox) unlearnedBox.innerHTML = unlearned.length ? unlearned.map(key => card(key, false)).join("") : '<p class="spellbook-empty">未修得の魔導書はありません。</p>';
    if (learnedBox) learnedBox.innerHTML = learned.length ? learned.map(key => card(key, true)).join("") : '<p class="spellbook-empty">修得済みの魔法はまだありません。</p>';
    const progress = $("#workshop-progress");
    if (progress) {
      progress.textContent = `${learned.length} / ${available.length} 修得`;
      progress.className = `badge ${available.length && learned.length === available.length ? "success" : "muted"}`;
    }
    window.SpellField?.updateObjective?.();
  }

  function openComputer() {
    updateComputer();
    G.showScreen("hub");
    window.SpellPython.warmup().catch(() => {});
  }

  function problemHtml(def) {
    const sample = def.samples[0];
    return `<div class="editor-problem"><p>${esc(def.problem)}</p><dl><div><dt>入力</dt><dd>${esc(def.inputFormat)}</dd></div><div><dt>出力</dt><dd>${esc(def.outputFormat)}</dd></div></dl><div class="editor-sample"><div><strong>入力例</strong><pre>${esc(sample.input.trimEnd())}</pre></div><div><strong>出力例</strong><pre>${esc(sample.output.trimEnd())}</pre></div></div></div>`;
  }

  function setState(label, style) {
    const element = $("#run-state");
    if (element) {
      element.textContent = label;
      element.className = `status ${style}`;
    }
  }

  function initialEditorSource(key, def, spell) {
    if (own(state.drafts, key)) return String(state.drafts[key] ?? "");
    if (typeof spell?.source === "string" && spell.source) return spell.source;
    const seed = key === "fire" && !isLearned(key) ? String(def.debugInitialCode || "") : "";
    if (seed) state.drafts[key] = seed;
    return seed;
  }

  function openEditor(key) {
    if (!isUnlocked(key)) return;
    state.selectedSpellKey = key;
    const def = defs[key];
    const spell = state.registeredSpells[key];
    $("#debug-title").textContent = `${def.name} — Python仕様テスト`;
    $("#debug-hint").innerHTML = problemHtml(def);
    $("#code-editor").value = initialEditorSource(key, def, spell);
    $("#code-editor").placeholder = '例：\nn = int(input())\nprint(n * 2)';
    const badge = $("#spell-badge");
    if (badge) {
      badge.textContent = isLearned(key) && spell ? `${def.name} 修得済み / MP ${spell.mpCost}` : "未修得";
      badge.className = isLearned(key) ? "badge success" : "badge muted";
    }
    $("#metric-steps").textContent = isLearned(key) ? spell?.abstractCost ?? "—" : "—";
    $("#metric-mp").textContent = isLearned(key) ? spell?.mpCost ?? "—" : "—";
    $("#metric-result").textContent = "未実行";
    $("#console-output").textContent = "Pythonコードを書いてテスト実行してください。";
    setState("READY", "neutral");
    G.showScreen("debug");
    setTimeout(() => $("#code-editor")?.focus(), 0);
  }

  function resetCode() {
    const key = state.selectedSpellKey;
    if (!key) return;
    state.drafts[key] = "";
    $("#code-editor").value = "";
    $("#console-output").textContent = "コードをクリアしました。";
    setState("READY", "neutral");
  }

  function backToPc() {
    const key = state.selectedSpellKey;
    if (key) state.drafts[key] = $("#code-editor").value;
    openComputer();
  }

  async function runCode() {
    const key = state.selectedSpellKey;
    if (!key) return;
    const def = defs[key];
    const source = $("#code-editor").value;
    state.drafts[key] = source;
    if (!source.trim()) {
      setState("READY", "neutral");
      $("#console-output").textContent = "コードが空です。";
      return;
    }

    const button = $("#run-code");
    button.disabled = true;
    setState("RUNNING PYTHON", "neutral");
    $("#console-output").textContent = "Python実行環境を準備してテストしています…";
    $("#metric-result").textContent = "実行中";
    try {
      const raw = await window.SpellPython.runSuite(source, def.samples.map(test => ({ ...test, kind: "sample" })), { timeoutMs: 7000 });
      const test = raw.tests?.[0];
      if (raw.compileError || test?.error) {
        setState("PYTHON ERROR", "bad");
        $("#metric-result").textContent = "エラー";
        $("#console-output").textContent = raw.compileError || test.error;
        return;
      }
      $("#metric-steps").textContent = raw.maxCost ?? 0;
      if (raw.ok) {
        setState("TEST PASS", "good");
        $("#metric-result").textContent = "成功";
        $("#console-output").textContent = `${String(test?.actual ?? "").trimEnd()}\n\nTEST PASS — 確認用テスト成功。\n修得するには「解答を判定」を実行してください。`;
      } else {
        setState("TEST FAILED", "warn");
        $("#metric-result").textContent = "不合格";
        $("#console-output").textContent = `あなたの出力: ${String(test?.actual ?? "").trimEnd() || "(出力なし)"}\n期待出力: ${String(test?.expected ?? "").trimEnd()}`;
      }
    } catch (error) {
      setState("RUNTIME ERROR", "bad");
      $("#console-output").textContent = `${error.name || "Error"}: ${error.message || error}`;
      $("#metric-result").textContent = "実行環境エラー";
    } finally {
      button.disabled = false;
    }
  }

  const originalRestoreItems = G.restoreItems;
  G.spellDefinitions = defs;
  G.isSpellbookUnlocked = isUnlocked;
  G.isSpellLearned = isLearned;
  G.isSpellEquipped = isLearned;
  G.getEquippedSpell = key => isLearned(key) ? state.registeredSpells[key] || null : null;
  G.equipSpell = isLearned;
  G.unequipSlot = () => false;
  G.magicReady = () => isLearned("fire") && isLearned("repair");
  G.unlockSpellbook = key => {
    if (!defs[key]) return false;
    state.unlockedSpellbooks[key] = true;
    updateComputer();
    return true;
  };
  G.openComputer = openComputer;
  G.openWorkshop = openComputer;
  G.updateComputer = updateComputer;
  G.updateWorkshop = updateComputer;
  G.serializeMagic = () => ({
    drafts: { ...state.drafts },
    registeredSpells: JSON.parse(JSON.stringify(state.registeredSpells)),
    learnedSpells: { ...state.learnedSpells },
    unlockedSpellbooks: { ...state.unlockedSpellbooks }
  });
  G.restoreMagic = data => {
    state.drafts = Object.assign(blankMap(), data?.drafts || {});
    state.registeredSpells = Object.assign(blankMap(), JSON.parse(JSON.stringify(data?.registeredSpells || {})));
    const explicitLearned = data?.learnedSpells && typeof data.learnedSpells === "object";
    state.learnedSpells = Object.assign(blankMap(), explicitLearned ? data.learnedSpells : {});
    state.unlockedSpellbooks = { fire: true, ...(data?.unlockedSpellbooks || {}) };
    normalizeSaved({ migrateRegistered: !explicitLearned });
    updateComputer();
  };
  G.restoreItems = data => {
    originalRestoreItems(data);
    if (Number(data?.inventory?.repairManual || 0) > 0) state.unlockedSpellbooks.repair = true;
    updateComputer();
  };

  normalizeSaved({ migrateRegistered: true });
  updateComputer();
  $("#start-button")?.addEventListener("click", () => queueMicrotask(() => {
    state.learnedSpells = blankMap();
    state.spellSlots = [];
    updateComputer();
  }));
})();
