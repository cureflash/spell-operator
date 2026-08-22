(() => {
  "use strict";

  const FORMAT = "spell-operator/python-runtime-diagnostic@1";
  const WORKER_URL = "python-runtime-test-worker.mjs?v=1";
  const INIT_TIMEOUT_MS = 60000;
  const RUN_TIMEOUT_MS = 15000;

  const $ = id => document.getElementById(id);
  const startButton = $("diag-start");
  const copyButton = $("diag-copy");
  const statusEl = $("diag-status");
  const logEl = $("diag-log");
  const jsonEl = $("diag-json");

  let worker = null;
  let seq = 1;
  let pending = new Map();
  let initResolve = null;
  let initReject = null;
  let initTimer = null;
  let diagnostic = null;

  function makeDiagnostic() {
    return {
      format: FORMAT,
      generatedAt: new Date().toISOString(),
      page: {
        href: location.href,
        origin: location.origin,
        protocol: location.protocol
      },
      environment: {
        userAgent: navigator.userAgent,
        platform: navigator.platform || "",
        vendor: navigator.vendor || "",
        language: navigator.language || "",
        languages: Array.from(navigator.languages || []),
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        deviceMemory: navigator.deviceMemory ?? null,
        secureContext: window.isSecureContext,
        crossOriginIsolated: window.crossOriginIsolated,
        workerSupported: typeof Worker === "function",
        webAssemblySupported: typeof WebAssembly === "object",
        sharedArrayBufferSupported: typeof SharedArrayBuffer === "function"
      },
      worker: {
        url: WORKER_URL,
        type: "module",
        created: false,
        ready: false,
        pyodideVersion: null
      },
      phases: [],
      tests: [],
      failure: null,
      finalStatus: "NOT_STARTED"
    };
  }

  function setStatus(text, kind = "neutral") {
    statusEl.textContent = text;
    statusEl.dataset.kind = kind;
  }

  function log(message) {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    logEl.textContent += (logEl.textContent ? "\n" : "") + line;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderJson() {
    if (!diagnostic) return;
    diagnostic.generatedAt = new Date().toISOString();
    jsonEl.value = JSON.stringify(diagnostic, null, 2);
  }

  function serializeError(error) {
    return {
      name: String(error?.name || "Error"),
      message: String(error?.message || error || "Unknown error"),
      stack: String(error?.stack || "")
    };
  }

  function cleanupWorker() {
    if (worker) worker.terminate();
    worker = null;
    if (initTimer) clearTimeout(initTimer);
    initTimer = null;
    for (const [id, item] of pending) {
      clearTimeout(item.timer);
      item.reject(new Error("Diagnostic worker closed."));
      pending.delete(id);
    }
  }

  function createWorker() {
    return new Promise((resolve, reject) => {
      initResolve = resolve;
      initReject = reject;

      try {
        worker = new Worker(WORKER_URL, { type: "module" });
        diagnostic.worker.created = true;
        log("Module Workerを生成しました。Pyodideの初期化を待っています。\n初回は数十秒かかる場合があります。");
      } catch (error) {
        diagnostic.failure = { stage: "worker-construction", error: serializeError(error) };
        reject(error);
        return;
      }

      initTimer = setTimeout(() => {
        const error = new Error(`Worker/Pyodide initialization timed out after ${INIT_TIMEOUT_MS}ms.`);
        diagnostic.failure = { stage: "worker-initialization-timeout", error: serializeError(error) };
        reject(error);
      }, INIT_TIMEOUT_MS);

      worker.addEventListener("message", event => {
        const data = event.data || {};

        if (data.type === "phase") {
          diagnostic.phases.push({ name: data.name, at: data.at || null, ...data });
          log(`phase: ${data.name}`);
          renderJson();
          return;
        }

        if (data.type === "ready") {
          if (initTimer) clearTimeout(initTimer);
          initTimer = null;
          diagnostic.worker.ready = true;
          diagnostic.worker.pyodideVersion = data.pyodideVersion || null;
          log(`Pyodide READY (${data.pyodideVersion || "version unknown"})`);
          renderJson();
          initResolve?.();
          return;
        }

        if (data.type === "fatal") {
          if (initTimer) clearTimeout(initTimer);
          initTimer = null;
          diagnostic.failure = {
            stage: data.stage || "worker-fatal",
            error: data.error || { message: "Unknown worker fatal error" }
          };
          log(`FATAL: ${diagnostic.failure.stage}: ${diagnostic.failure.error?.message || "unknown"}`);
          renderJson();
          initReject?.(new Error(diagnostic.failure.error?.message || "Worker fatal error"));
          return;
        }

        if (!data.id) return;
        const item = pending.get(data.id);
        if (!item) return;
        pending.delete(data.id);
        clearTimeout(item.timer);

        if (data.type === "result") {
          item.resolve(data.result || {});
        } else {
          item.reject(Object.assign(new Error(data.error?.message || "Python run failed."), {
            diagnosticError: data.error || null
          }));
        }
      });

      worker.addEventListener("error", event => {
        const error = new Error(event.message || "Module Worker error.");
        diagnostic.failure = {
          stage: "worker-error-event",
          error: {
            name: "WorkerError",
            message: event.message || "Module Worker error.",
            filename: event.filename || "",
            lineno: event.lineno || 0,
            colno: event.colno || 0
          }
        };
        log(`Worker error: ${event.message || "unknown"}`);
        renderJson();
        initReject?.(error);
      });
    });
  }

  function runPython(source, stdin = "") {
    if (!worker) return Promise.reject(new Error("Worker is not running."));
    const id = seq++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Python test timed out after ${RUN_TIMEOUT_MS}ms.`));
      }, RUN_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      worker.postMessage({ id, type: "run", source, stdin });
    });
  }

  async function runCase(name, source, stdin, expectedStdout) {
    const entry = {
      name,
      source,
      stdin,
      expectedStdout,
      stdout: null,
      pythonError: null,
      passed: false,
      transportError: null
    };
    diagnostic.tests.push(entry);
    log(`test: ${name}`);

    try {
      const result = await runPython(source, stdin);
      entry.stdout = String(result.stdout ?? "");
      entry.pythonError = result.error == null ? null : String(result.error);
      entry.passed = entry.pythonError === null && entry.stdout === expectedStdout;
      log(`${name}: ${entry.passed ? "PASS" : "FAIL"} / stdout=${JSON.stringify(entry.stdout)}`);
    } catch (error) {
      entry.transportError = serializeError(error.diagnosticError || error);
      log(`${name}: TRANSPORT ERROR: ${entry.transportError.message}`);
    }

    renderJson();
    return entry.passed;
  }

  async function runDiagnostics() {
    cleanupWorker();
    diagnostic = makeDiagnostic();
    logEl.textContent = "";
    renderJson();
    startButton.disabled = true;
    copyButton.disabled = true;
    setStatus("診断中", "running");

    if (!diagnostic.environment.workerSupported || !diagnostic.environment.webAssemblySupported) {
      diagnostic.failure = {
        stage: "browser-capability",
        error: { message: "WorkerまたはWebAssemblyが利用できません。" }
      };
      diagnostic.finalStatus = "FAILED";
      renderJson();
      setStatus("FAILED", "bad");
      startButton.disabled = false;
      copyButton.disabled = false;
      return;
    }

    try {
      await createWorker();

      const printPass = await runCase(
        "print",
        'print("str")',
        "",
        "str\n"
      );

      const inputPass = await runCase(
        "input",
        "n = int(input())\nprint(n * 2)",
        "7\n",
        "14\n"
      );

      diagnostic.finalStatus = printPass && inputPass ? "PASS" : "FAILED";
      setStatus(diagnostic.finalStatus, diagnostic.finalStatus === "PASS" ? "good" : "bad");
    } catch (error) {
      if (!diagnostic.failure) {
        diagnostic.failure = { stage: "diagnostic-controller", error: serializeError(error) };
      }
      diagnostic.finalStatus = "FAILED";
      setStatus("FAILED", "bad");
      log(`診断停止: ${diagnostic.failure?.stage || "unknown"}`);
    } finally {
      renderJson();
      startButton.disabled = false;
      copyButton.disabled = false;
      cleanupWorker();
    }
  }

  async function copyJson() {
    const text = jsonEl.value;
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "コピー済み";
      setTimeout(() => { copyButton.textContent = "診断JSONをコピー"; }, 1400);
    } catch {
      jsonEl.focus();
      jsonEl.select();
      document.execCommand("copy");
    }
  }

  startButton.addEventListener("click", runDiagnostics);
  copyButton.addEventListener("click", copyJson);

  diagnostic = makeDiagnostic();
  renderJson();
  setStatus("未実行", "neutral");
})();
