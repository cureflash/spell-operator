const PYODIDE_VERSION = "0.28.3";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_MODULE = `${PYODIDE_BASE}pyodide.mjs`;

let pyodide = null;
let ready = null;

function serializeError(error) {
  return {
    name: String(error?.name || "Error"),
    message: String(error?.message || error || "Unknown error"),
    stack: String(error?.stack || "")
  };
}

function phase(name, extra = {}) {
  self.postMessage({ type: "phase", name, at: new Date().toISOString(), ...extra });
}

async function initialize() {
  phase("worker-started", { href: self.location.href });

  let module;
  try {
    module = await import(PYODIDE_MODULE);
    phase("pyodide-module-imported", { pyodideModule: PYODIDE_MODULE });
  } catch (error) {
    self.postMessage({ type: "fatal", stage: "pyodide-module-import", error: serializeError(error) });
    throw error;
  }

  try {
    pyodide = await module.loadPyodide({ indexURL: PYODIDE_BASE });
    phase("pyodide-loaded", { version: pyodide.version });
  } catch (error) {
    self.postMessage({ type: "fatal", stage: "pyodide-load", error: serializeError(error) });
    throw error;
  }

  const helper = String.raw`
import io
import json
import sys
import traceback


def _spell_diag_run(source, stdin_text):
    stdout = io.StringIO()
    stdin = io.StringIO(stdin_text)
    old_stdin = sys.stdin
    old_stdout = sys.stdout
    error = None
    try:
        sys.stdin = stdin
        sys.stdout = stdout
        namespace = {"__name__": "__main__"}
        exec(compile(source, "<spell-diagnostic>", "exec"), namespace, namespace)
    except Exception:
        error = traceback.format_exc()
    finally:
        sys.stdin = old_stdin
        sys.stdout = old_stdout

    return json.dumps({
        "stdout": stdout.getvalue(),
        "error": error,
    }, ensure_ascii=False)
`;

  try {
    await pyodide.runPythonAsync(helper);
    phase("python-helper-ready");
  } catch (error) {
    self.postMessage({ type: "fatal", stage: "python-helper", error: serializeError(error) });
    throw error;
  }

  self.postMessage({
    type: "ready",
    pyodideVersion: pyodide.version,
    at: new Date().toISOString()
  });
}

ready = initialize();

self.addEventListener("message", async event => {
  const data = event.data || {};
  if (data.type !== "run" || !data.id) return;

  try {
    await ready;
    pyodide.globals.set("__spell_diag_source", String(data.source ?? ""));
    pyodide.globals.set("__spell_diag_stdin", String(data.stdin ?? ""));

    const jsonText = await pyodide.runPythonAsync(
      "_spell_diag_run(__spell_diag_source, __spell_diag_stdin)"
    );
    const result = JSON.parse(String(jsonText));

    self.postMessage({
      type: "result",
      id: data.id,
      result,
      at: new Date().toISOString()
    });
  } catch (error) {
    self.postMessage({
      type: "run-error",
      id: data.id,
      error: serializeError(error),
      at: new Date().toISOString()
    });
  } finally {
    try { pyodide?.globals.delete("__spell_diag_source"); } catch {}
    try { pyodide?.globals.delete("__spell_diag_stdin"); } catch {}
  }
});
