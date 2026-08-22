(() => {
  "use strict";

  const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent || "");

  let worker = null;
  let workerReady = null;
  let workerResolve = null;
  let workerReject = null;
  let workerStartupTimer = null;
  let seq = 1;
  let backend = isSafari ? "main-thread" : "worker";

  let mainReady = null;
  let mainPyodide = null;
  let mainHelperReady = false;

  let lastResult = null;
  let lastError = null;
  const pending = new Map();

  function setLastResult(result) {
    lastResult = result || null;
    lastError = null;
  }

  function setLastError(error) {
    lastError = error || null;
    lastResult = null;
  }

  function resetWorker(reason = null) {
    if (worker) worker.terminate();
    worker = null;
    workerReady = null;
    workerResolve = null;
    workerReject = null;
    if (workerStartupTimer) clearTimeout(workerStartupTimer);
    workerStartupTimer = null;
    for (const [id, item] of pending) {
      clearTimeout(item.timer);
      item.reject(reason || new Error("Python worker was reset."));
      pending.delete(id);
    }
  }

  function ensureWorker() {
    if (worker && workerReady) return workerReady;

    workerReady = new Promise((resolve, reject) => {
      workerResolve = resolve;
      workerReject = reject;
    });

    try {
      worker = new Worker("js/python-worker-classic.js?v=3");
    } catch (error) {
      workerReject?.(error);
      return workerReady;
    }

    workerStartupTimer = setTimeout(() => {
      const error = new Error("Python worker startup timed out.");
      workerReject?.(error);
      resetWorker(error);
    }, 8000);

    worker.addEventListener("message", event => {
      const data = event.data || {};
      if (data.type === "ready") {
        if (workerStartupTimer) clearTimeout(workerStartupTimer);
        workerStartupTimer = null;
        workerResolve?.();
        return;
      }
      if (data.type === "fatal") {
        const error = new Error(data.error || "Python runtime failed to load.");
        workerReject?.(error);
        resetWorker(error);
        return;
      }
      if (!data.id) return;
      const item = pending.get(data.id);
      if (!item) return;
      pending.delete(data.id);
      clearTimeout(item.timer);
      if (data.type === "result") {
        setLastResult(data.result);
        item.resolve(data.result);
      } else {
        const error = new Error(data.error || "Python execution failed.");
        setLastError(error);
        item.reject(error);
      }
    });

    worker.addEventListener("error", event => {
      const error = new Error(event.message || "Python worker error.");
      workerReject?.(error);
      resetWorker(error);
    });

    return workerReady;
  }

  function loadScriptOnce(src) {
    const existing = [...document.scripts].find(script => script.src === src);
    if (existing && typeof window.loadPyodide === "function") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadSharedHelper() {
    const response = await fetch("js/python-worker.mjs?v=1", { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load Python helper: ${response.status}`);
    const source = await response.text();
    const match = source.match(/const PY_HELPER = String\.raw`([\s\S]*?)`;\s*\n\s*let helperReady/);
    if (!match) throw new Error("Python helper could not be extracted.");
    return match[1];
  }

  async function ensureMainThread() {
    if (mainReady) return mainReady;
    mainReady = (async () => {
      await loadScriptOnce(`${PYODIDE_BASE}pyodide.js`);
      if (typeof window.loadPyodide !== "function") throw new Error("loadPyodide is unavailable.");
      mainPyodide = await window.loadPyodide({ indexURL: PYODIDE_BASE });
      if (!mainHelperReady) {
        const helper = await loadSharedHelper();
        await mainPyodide.runPythonAsync(helper);
        mainHelperReady = true;
      }
      return mainPyodide;
    })().catch(error => {
      mainReady = null;
      mainPyodide = null;
      mainHelperReady = false;
      throw error;
    });
    return mainReady;
  }

  async function runInWorker(source, tests, timeoutMs) {
    await ensureWorker();
    const id = seq++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        const error = new Error("TIME LIMIT: Pythonの実行が制限時間を超えました。");
        resetWorker(error);
        reject(error);
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      worker.postMessage({ id, type: "run", source: String(source ?? ""), tests: Array.isArray(tests) ? tests : [] });
    });
  }

  async function runOnMainThread(source, tests) {
    const pyodide = await ensureMainThread();
    pyodide.globals.set("__so_source", String(source ?? ""));
    pyodide.globals.set("__so_tests_json", JSON.stringify(Array.isArray(tests) ? tests : []));
    try {
      const proxy = await pyodide.runPythonAsync("__so_run_suite(__so_source, json.loads(__so_tests_json))");
      const result = proxy.toJs({ dict_converter: Object.fromEntries });
      proxy.destroy();
      setLastResult(result);
      return result;
    } finally {
      try { pyodide.globals.delete("__so_source"); } catch {}
      try { pyodide.globals.delete("__so_tests_json"); } catch {}
    }
  }

  async function runSuite(source, tests, { timeoutMs = 6000 } = {}) {
    try {
      if (backend === "main-thread") {
        return await runOnMainThread(source, tests);
      }
      try {
        return await runInWorker(source, tests, timeoutMs);
      } catch (workerError) {
        console.warn("Python worker failed; switching to main-thread Pyodide.", workerError);
        backend = "main-thread";
        resetWorker();
        return await runOnMainThread(source, tests);
      }
    } catch (error) {
      setLastError(error);
      throw error;
    }
  }

  async function warmup() {
    try {
      if (backend === "main-thread") return await ensureMainThread();
      try {
        return await ensureWorker();
      } catch (workerError) {
        console.warn("Python worker warmup failed; switching to main-thread Pyodide.", workerError);
        backend = "main-thread";
        resetWorker();
        return await ensureMainThread();
      }
    } catch (error) {
      setLastError(error);
      throw error;
    }
  }

  window.SpellPython = {
    runSuite,
    warmup,
    resetWorker,
    get runtimeMode() { return backend; },
    get lastResult() { return lastResult; },
    get lastError() { return lastError; }
  };
})();
