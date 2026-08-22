(() => {
  "use strict";

  const G = window.SpellGame03;
  const debug = document.getElementById("screen-debug");
  if (!G || !debug || !window.SpellPython) return;

  const REFERENCE_URL = "data/python-reference-solutions.json";
  const CASE_COUNT = 10;
  let referencePromise = null;
  let judgeButton = null;

  function randomInt(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    const span = hi - lo + 1;
    if (span <= 1) return lo;

    if (globalThis.crypto?.getRandomValues) {
      const limit = Math.floor(0x100000000 / span) * span;
      const bucket = new Uint32Array(1);
      do globalThis.crypto.getRandomValues(bucket); while (bucket[0] >= limit);
      return lo + (bucket[0] % span);
    }
    return lo + Math.floor(Math.random() * span);
  }

  const generators = {
    fire() {
      const n = randomInt(0, 10000);
      return `${n}\n`;
    },
    repair() {
      const m = randomInt(0, 10000);
      const h = randomInt(0, m);
      return `${h} ${m}\n`;
    }
  };

  function loadReferences() {
    if (!referencePromise) {
      referencePromise = fetch(REFERENCE_URL, { cache: "no-store" })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load ${REFERENCE_URL}: ${response.status}`);
          return response.json();
        });
    }
    return referencePromise;
  }

  function generateInputs(key, count = CASE_COUNT) {
    const generator = generators[key];
    if (!generator) throw new Error(`No random-case generator for ${key}`);
    return Array.from({ length: count }, () => generator());
  }

  async function expectedCases(key, inputs) {
    const references = await loadReferences();
    const referenceSource = String(references?.[key] || "").trim();
    if (!referenceSource) throw new Error(`No reference solution for ${key}`);

    const probes = inputs.map(input => ({ input, output: "", kind: "reference" }));
    const referenceRun = await window.SpellPython.runSuite(referenceSource, probes, { timeoutMs: 7000 });
    if (referenceRun.compileError) throw new Error(`Reference compile error: ${referenceRun.compileError}`);

    const results = referenceRun.tests || [];
    if (results.length !== inputs.length) throw new Error("Reference solution returned an unexpected number of cases.");

    return results.map((result, index) => {
      if (result.error) throw new Error(`Reference runtime error: ${result.error}`);
      return {
        input: inputs[index],
        output: String(result.actual ?? ""),
        kind: "judge"
      };
    });
  }

  async function judge(key, source, count = CASE_COUNT) {
    const code = String(source ?? "");
    if (!code.trim()) return { ok: false, empty: true, cases: [], raw: null };

    const inputs = generateInputs(key, count);
    const cases = await expectedCases(key, inputs);
    const raw = await window.SpellPython.runSuite(code, cases, { timeoutMs: 7000 });
    const tests = raw.tests || [];
    return {
      ok: Boolean(raw.ok) && tests.length === cases.length && tests.length > 0,
      key,
      cases,
      tests,
      raw
    };
  }

  function manaFor(def, cost) {
    return Math.min(99, Number(def.baseMp || 0) + Math.ceil(Math.max(0, Number(cost) || 0) / Number(def.manaDivisor || 400)));
  }

  function saveJudgedSolution(key, raw, source) {
    const def = G.spellDefinitions?.[key];
    if (!def) return null;

    const state = G.state;
    state.registeredSpells = state.registeredSpells || Object.create(null);
    state.drafts = state.drafts || Object.create(null);
    state.drafts[key] = source;

    const cost = Math.max(0, Number(raw?.maxCost) || 0);
    const mpCost = manaFor(def, cost);
    const old = state.registeredSpells[key];
    const candidate = {
      key,
      name: def.name,
      mpCost,
      abstractCost: cost,
      steps: cost,
      costBreakdown: raw?.maxBreakdown || null,
      power: def.power || 0,
      heal: def.heal || 0,
      source
    };
    const improved = !old || !Number.isFinite(old.abstractCost) || mpCost < old.mpCost || (mpCost === old.mpCost && cost < old.abstractCost);
    if (improved) state.registeredSpells[key] = candidate;
    G.updateComputer?.();
    return { spell: state.registeredSpells[key], improved, submittedMp: mpCost, submittedCost: cost };
  }

  function setRunState(label, style) {
    const state = document.getElementById("run-state");
    if (!state) return;
    state.textContent = label;
    state.className = `status ${style}`;
  }

  function setTechnicalOutput(text) {
    const source = document.getElementById("console-output");
    if (source) source.textContent = String(text ?? "");
  }

  function setDialogue(text) {
    window.SpellPluginEditorAssistant?.setDialogue?.(text);
  }

  function updateMetrics({ result, cost = "—", mp = "—" }) {
    const resultEl = document.getElementById("metric-result");
    const costEl = document.getElementById("metric-steps");
    const mpEl = document.getElementById("metric-mp");
    if (resultEl) resultEl.textContent = result;
    if (costEl) costEl.textContent = cost;
    if (mpEl) mpEl.textContent = mp;
  }

  function formatFailed(result, passedCount, total) {
    const input = String(result?.input ?? "").trimEnd() || "(入力なし)";
    const actual = String(result?.actual ?? "").trimEnd() || "(出力なし)";
    const expected = String(result?.expected ?? "").trimEnd() || "(出力なし)";
    const lines = [
      `JUDGE: ${passedCount} / ${total}`,
      "判定: 不正解",
      "",
      "失敗した乱数入力:",
      input
    ];
    if (result?.error) {
      lines.push("", "Pythonエラー:", String(result.error));
    } else {
      lines.push("", "あなたの出力:", actual, "", "期待する出力:", expected);
    }
    return lines.join("\n");
  }

  async function runJudge() {
    const key = G.state?.selectedSpellKey;
    const editor = document.getElementById("code-editor");
    if (!key || !editor || !judgeButton) return;

    const source = editor.value;
    G.state.drafts[key] = source;
    if (!source.trim()) {
      setRunState("JUDGE ERROR", "bad");
      updateMetrics({ result: "未入力" });
      setTechnicalOutput("コードが空です。解答を判定できません。");
      setDialogue("まだコードが書かれていないみたい。");
      return;
    }

    judgeButton.disabled = true;
    setRunState("JUDGING", "neutral");
    updateMetrics({ result: "判定中" });
    setTechnicalOutput(`乱数ケースを ${CASE_COUNT} 件生成して、模範解答と照合しています…`);
    setDialogue("解答を判定するね。ちょっと待ってて。");

    try {
      const result = await judge(key, source, CASE_COUNT);
      const raw = result.raw;
      if (raw?.compileError) {
        setRunState("JUDGE ERROR", "bad");
        updateMetrics({ result: "エラー" });
        setTechnicalOutput(`判定: Pythonエラー\n\n${raw.compileError}`);
        setDialogue("コードにエラーがあるみたい。判定結果を確認してみて。");
        return;
      }

      const tests = result.tests || [];
      const passedCount = tests.filter(test => test.passed).length;
      if (!result.ok) {
        const failed = tests.find(test => !test.passed) || tests[0];
        setRunState("JUDGE FAILED", "warn");
        updateMetrics({ result: "不正解", cost: raw?.maxCost ?? 0 });
        setTechnicalOutput(formatFailed(failed, passedCount, tests.length));
        setDialogue("これだとまだダメそうね。判定結果を確認してみて。");
        return;
      }

      const saved = saveJudgedSolution(key, raw, source);
      const def = G.spellDefinitions?.[key];
      setRunState("JUDGE PASS", "good");
      updateMetrics({ result: "正解", cost: saved?.submittedCost ?? raw?.maxCost ?? 0, mp: saved?.submittedMp ?? "—" });
      setTechnicalOutput([
        `JUDGE: ${tests.length} / ${tests.length}`,
        `乱数ケース: ${tests.length} 件`,
        "判定: 正解",
        `最大抽象コスト: ${raw?.maxCost ?? 0}`,
        `消費MP: ${saved?.submittedMp ?? "—"}`,
        saved?.improved ? "このコードを戦闘用として保存しました。" : "既存の保存コードの方が効率的なので、戦闘用コードは更新しませんでした。"
      ].join("\n"));
      setDialogue("正解！ ちゃんといろんな入力でも動いてるよ。");

      const badge = document.getElementById("spell-badge");
      if (badge && saved?.spell && def) {
        badge.textContent = `${def.name} 修得済み / MP ${saved.spell.mpCost}`;
        badge.className = "badge success";
      }
      window.SpellPluginWorkspace?.renderCodeLibrary?.();
    } catch (error) {
      console.error("Answer judge failed.", error);
      setRunState("JUDGE ERROR", "bad");
      updateMetrics({ result: "エラー" });
      setTechnicalOutput(`判定処理に失敗しました。\n${error?.message || error}`);
      setDialogue("判定処理の途中で問題が起きたみたい。");
    } finally {
      judgeButton.disabled = false;
    }
  }

  function installUi() {
    const actions = debug.querySelector(".plugin-run-actions");
    if (!actions) return false;
    const existing = document.getElementById("plugin-judge-button");
    if (existing) {
      judgeButton = existing;
      return true;
    }

    judgeButton = document.createElement("button");
    judgeButton.id = "plugin-judge-button";
    judgeButton.type = "button";
    judgeButton.className = "primary plugin-judge-button";
    judgeButton.textContent = "解答を判定";
    judgeButton.addEventListener("click", runJudge);

    const hint = document.getElementById("plugin-hint-button");
    actions.insertBefore(judgeButton, hint || null);
    return true;
  }

  function installWhenReady() {
    if (installUi()) return;
    requestAnimationFrame(installWhenReady);
  }

  new MutationObserver(() => {
    if (!debug.classList.contains("active")) return;
    requestAnimationFrame(installUi);
  }).observe(debug, { attributes: true, attributeFilter: ["class"] });

  installWhenReady();

  window.SpellAnswerJudge = {
    judge,
    generateInputs,
    loadReferences,
    run: runJudge,
    caseCount: CASE_COUNT
  };
})();
