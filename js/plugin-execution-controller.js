(() => {
  "use strict";

  const G = window.SpellGame03;
  const debug = document.getElementById("screen-debug");
  if (!G || !debug || !window.SpellPython) return;

  const $ = id => document.getElementById(id);

  function setRunState(label, style = "neutral") {
    const el = $("run-state");
    if (!el) return;
    el.textContent = label;
    el.className = `status ${style}`;
  }

  function setOutput(text, kind = "neutral") {
    const el = $("plugin-execution-output");
    if (!el) return;
    const value = String(text ?? "").replace(/\r\n?/g, "\n").replace(/\n+$/g, "");
    el.textContent = value || "（出力なし）";
    el.dataset.resultKind = kind;
  }

  function setDialogue(text) {
    const value = String(text ?? "");
    window.SpellPluginEditorAssistant?.setDialogue?.(value);
    const bridge = $("console-output");
    if (bridge) bridge.textContent = `ルミエル「${value}」`;
  }

  async function setPythonErrorDialogue(errorText) {
    const service = window.SpellLumierePythonErrors;
    if (!service?.resolve) {
      setDialogue("コードにエラーがあるみたい。もう一度確認してみて。");
      return;
    }
    try {
      const result = await service.resolve(errorText);
      setDialogue(result?.dialogue || "コードにエラーがあるみたい。もう一度確認してみて。");
    } catch {
      setDialogue("コードにエラーがあるみたい。もう一度確認してみて。");
    }
  }

  function updateMetrics({ result = "—", cost = "—", mp = "—" } = {}) {
    const resultEl = $("metric-result");
    const costEl = $("metric-steps");
    const mpEl = $("metric-mp");
    if (resultEl) resultEl.textContent = result;
    if (costEl) costEl.textContent = cost;
    if (mpEl) mpEl.textContent = mp;
  }

  function firstRuntimeError(raw) {
    if (raw?.compileError) return String(raw.compileError);
    const test = Array.isArray(raw?.tests) ? raw.tests.find(item => item?.error) : null;
    return test?.error ? String(test.error) : "";
  }

  function shownCase(raw) {
    const tests = Array.isArray(raw?.tests) ? raw.tests : [];
    return tests.find(test => !test?.passed) || tests[0] || null;
  }

  function shownStdout(raw) {
    const test = shownCase(raw);
    return String(test?.actual ?? "");
  }

  function sampleTests(def) {
    const samples = Array.isArray(def?.samples) ? def.samples : [];
    if (samples.length) return samples.map(item => ({ ...item, kind: "sample" }));
    const tests = Array.isArray(def?.tests) ? def.tests : [];
    return tests.slice(0, 1).map(item => ({ ...item, kind: "sample" }));
  }

  function manaFor(def, cost) {
    return Math.min(99, Number(def?.baseMp || 0) + Math.ceil(Math.max(0, Number(cost) || 0) / Number(def?.manaDivisor || 400)));
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

  async function runSample() {
    const key = G.state?.selectedSpellKey;
    const editor = $("code-editor");
    const button = $("run-code");
    const def = G.spellDefinitions?.[key];
    if (!key || !editor || !button || !def) return;

    const source = editor.value;
    G.state.drafts[key] = source;
    if (!source.trim()) {
      setRunState("READY", "neutral");
      setOutput("");
      updateMetrics({ result: "未入力" });
      setDialogue("まだコードが書かれていないみたい。");
      return;
    }

    button.disabled = true;
    setRunState("RUNNING", "neutral");
    setOutput("（出力待ち）", "running");
    updateMetrics({ result: "実行中" });
    setDialogue("実行しているよ。少し待ってね。");

    try {
      const raw = await window.SpellPython.runSuite(source, sampleTests(def), { timeoutMs: 7000 });
      const codeError = firstRuntimeError(raw);
      setOutput(shownStdout(raw), codeError ? "error" : (raw.ok ? "passed" : "failed"));

      if (codeError) {
        setRunState("PYTHON ERROR", "bad");
        updateMetrics({ result: "エラー", cost: raw?.maxCost ?? "—" });
        await setPythonErrorDialogue(codeError);
        return;
      }

      if (raw.ok) {
        setRunState("TEST PASS", "good");
        updateMetrics({ result: "成功", cost: raw?.maxCost ?? 0 });
        setDialogue("うん、ちゃんと出力できてるね。解答を判定してみて。");
      } else {
        setRunState("TEST FAILED", "warn");
        updateMetrics({ result: "不合格", cost: raw?.maxCost ?? 0 });
        setDialogue("これだとダメそうね。出力を確認してみて。");
      }
    } catch (error) {
      console.error("Python sample execution failed.", error);
      setRunState("RUNTIME ERROR", "bad");
      setOutput("");
      updateMetrics({ result: "実行環境エラー" });
      setDialogue("実行環境側で問題が起きたみたい。もう一度実行してみて。");
    } finally {
      button.disabled = false;
    }
  }

  async function runJudge() {
    const key = G.state?.selectedSpellKey;
    const editor = $("code-editor");
    const button = $("plugin-judge-button");
    const judgeService = window.SpellAnswerJudge;
    if (!key || !editor || !button || !judgeService?.judge) return;

    const source = editor.value;
    G.state.drafts[key] = source;
    if (!source.trim()) {
      setRunState("READY", "neutral");
      setOutput("");
      updateMetrics({ result: "未入力" });
      setDialogue("まだコードが書かれていないみたい。");
      return;
    }

    button.disabled = true;
    setRunState("JUDGING", "neutral");
    setOutput("（出力待ち）", "running");
    updateMetrics({ result: "判定中" });
    setDialogue("解答を判定するね。ちょっと待ってて。");

    try {
      const result = await judgeService.judge(key, source, judgeService.caseCount || 10);
      const raw = result?.raw;
      const codeError = firstRuntimeError(raw);
      setOutput(shownStdout(raw), codeError ? "error" : (result?.ok ? "passed" : "failed"));

      if (codeError) {
        setRunState("PYTHON ERROR", "bad");
        updateMetrics({ result: "エラー", cost: raw?.maxCost ?? "—" });
        await setPythonErrorDialogue(codeError);
        return;
      }

      if (!result?.ok) {
        setRunState("JUDGE FAILED", "warn");
        updateMetrics({ result: "不正解", cost: raw?.maxCost ?? 0 });
        setDialogue("まだ違うみたい。出力を確認してみて。");
        return;
      }

      const saved = saveJudgedSolution(key, raw, source);
      setRunState("JUDGE PASS", "good");
      updateMetrics({ result: "正解", cost: saved?.submittedCost ?? raw?.maxCost ?? 0, mp: saved?.submittedMp ?? "—" });
      setDialogue("正解！ ちゃんといろんな入力でも動いてるよ。");

      const def = G.spellDefinitions?.[key];
      const badge = $("spell-badge");
      if (badge && saved?.spell && def) {
        badge.textContent = `${def.name} 修得済み / MP ${saved.spell.mpCost}`;
        badge.className = "badge success";
      }
      window.SpellPluginWorkspace?.renderCodeLibrary?.();
    } catch (error) {
      console.error("Answer judging failed.", error);
      setRunState("RUNTIME ERROR", "bad");
      setOutput("");
      updateMetrics({ result: "実行環境エラー" });
      setDialogue("判定処理の実行環境側で問題が起きたみたい。もう一度試してみて。");
    } finally {
      button.disabled = false;
    }
  }

  function resetCode() {
    const key = G.state?.selectedSpellKey;
    const editor = $("code-editor");
    if (!editor) return;
    editor.value = "";
    if (key) G.state.drafts[key] = "";
    setRunState("READY", "neutral");
    setOutput("");
    updateMetrics({ result: "未実行" });
    setDialogue("コードをクリアしたよ。");
  }

  function replaceButton(id, handler) {
    const old = $(id);
    if (!old || old.dataset.executionController === "1") return Boolean(old);
    const fresh = old.cloneNode(true);
    fresh.dataset.executionController = "1";
    old.replaceWith(fresh);
    fresh.addEventListener("click", handler);
    return true;
  }

  function install() {
    const runReady = replaceButton("run-code", runSample);
    const resetReady = replaceButton("reset-code", resetCode);
    const judgeReady = replaceButton("plugin-judge-button", runJudge);
    if (runReady && resetReady && judgeReady) return true;
    return false;
  }

  function installWhenReady() {
    if (install()) return;
    requestAnimationFrame(installWhenReady);
  }

  new MutationObserver(() => {
    if (!debug.classList.contains("active")) return;
    requestAnimationFrame(install);
  }).observe(debug, { attributes: true, attributeFilter: ["class"] });

  installWhenReady();

  window.SpellPluginExecutionController = {
    runSample,
    runJudge,
    resetCode,
    install
  };
})();
