(() => {
  "use strict";

  let worker = null;
  let readyPromise = null;
  let readyResolve = null;
  let readyReject = null;
  let startupTimer = null;
  let seq = 1;
  let lastResult = null;
  let lastError = null;
  const pending = new Map();

  function asError(payload, fallback) {
    if (payload instanceof Error) return payload;
    if (payload && typeof payload === "object") {
      const error = new Error(String(payload.message || fallback || "Python runtime error."));
      error.name = String(payload.name || "Error");
      if (payload.stack) error.stack = String(payload.stack);
      return error;
    }
    return new Error(String(payload || fallback || "Python runtime error."));
  }

  function clearStartupTimer() {
    if (startupTimer) clearTimeout(startupTimer);
    startupTimer = null;
  }

  function rejectPending(error) {
    for (const [id, item] of pending) {
      clearTimeout(item.timer);
      item.reject(error);
      pending.delete(id);
    }
  }

  function disposeWorker(error = null) {
    clearStartupTimer();
    if (worker) worker.terminate();
    worker = null;
    readyPromise = null;
    readyResolve = null;
    readyReject = null;
    if (error) {
      lastError = error;
      lastResult = null;
      rejectPending(error);
    }
  }

  function ensureWorker() {
    if (worker && readyPromise) return readyPromise;

    readyPromise = new Promise((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
    });

    try {
      worker = new Worker("js/python-worker.mjs?v=2", { type: "module" });
    } catch (rawError) {
      const error = asError(rawError, "Python Module Worker could not be created.");
      readyReject?.(error);
      disposeWorker(error);
      return Promise.reject(error);
    }

    startupTimer = setTimeout(() => {
      const error = new Error("Python runtime startup timed out.");
      readyReject?.(error);
      disposeWorker(error);
    }, 15000);

    worker.addEventListener("message", event => {
      const data = event.data || {};

      if (data.type === "ready") {
        clearStartupTimer();
        lastError = null;
        readyResolve?.({ pyodideVersion: data.pyodideVersion || null });
        return;
      }

      if (data.type === "fatal") {
        const error = asError(data.error, "Python runtime failed to initialize.");
        readyReject?.(error);
        disposeWorker(error);
        return;
      }

      if (!data.id) return;
      const item = pending.get(data.id);
      if (!item) return;
      pending.delete(data.id);
      clearTimeout(item.timer);

      if (data.type === "result") {
        lastResult = data.result || null;
        lastError = null;
        item.resolve(data.result);
        return;
      }

      const error = asError(data.error, "Python execution failed.");
      lastError = error;
      lastResult = null;
      item.reject(error);
    });

    worker.addEventListener("error", event => {
      const error = new Error(event.message || "Python Module Worker error.");
      readyReject?.(error);
      disposeWorker(error);
    });

    return readyPromise;
  }

  async function runSuite(source, tests, { timeoutMs = 7000 } = {}) {
    await ensureWorker();
    const id = seq++;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        const error = new Error("TIME LIMIT: Pythonの実行が制限時間を超えました。");
        lastError = error;
        lastResult = null;
        reject(error);
      }, timeoutMs);

      pending.set(id, { resolve, reject, timer });
      worker.postMessage({
        id,
        type: "run",
        source: String(source ?? ""),
        tests: Array.isArray(tests) ? tests : []
      });
    });
  }

  function warmup() {
    return ensureWorker();
  }

  function resetWorker() {
    disposeWorker();
  }

  window.SpellPython = {
    runSuite,
    warmup,
    resetWorker,
    runtimeMode: "module-worker",
    get lastResult() { return lastResult; },
    get lastError() { return lastError; }
  };
})();
