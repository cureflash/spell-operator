(() => {
  "use strict";

  const G = window.SpellGame03;
  const debug = document.getElementById("screen-debug");
  if (!G || !debug || !window.SpellPython) return;

  const REFERENCE_URL = "data/python-reference-solutions.json";
  const CASE_COUNT = 3;
  let referencePromise = null;

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
      referencePromise = fetch(REFERENCE_URL, { cache: "no-store" }).then(response => {
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
    if (!code.trim()) return { ok: false, empty: true, cases: [], tests: [], raw: null };

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

  function installUi() {
    const actions = debug.querySelector(".plugin-run-actions");
    if (!actions) return false;
    if (document.getElementById("plugin-judge-button")) return true;

    const button = document.createElement("button");
    button.id = "plugin-judge-button";
    button.type = "button";
    button.className = "primary plugin-judge-button";
    button.textContent = "解答を判定";

    const hint = document.getElementById("plugin-hint-button");
    actions.insertBefore(button, hint || null);
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
    caseCount: CASE_COUNT
  };
})();
