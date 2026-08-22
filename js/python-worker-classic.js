/* Safari/iPad compatible Pyodide worker bootstrap. */
"use strict";

const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";

try {
  importScripts(`${PYODIDE_BASE}pyodide.js`);
} catch (error) {
  self.postMessage({ type: "fatal", error: `Pyodide bootstrap failed: ${String(error?.message || error)}` });
  throw error;
}

fetch("python-worker.mjs?v=1", { cache: "no-store" })
  .then(response => {
    if (!response.ok) throw new Error(`Failed to load shared Python worker body: ${response.status}`);
    return response.text();
  })
  .then(source => {
    const body = source.replace(/^import\s+\{\s*loadPyodide\s*\}\s+from\s+["'][^"']+["'];\s*/m, "");
    if (body === source) throw new Error("Shared Python worker body format changed.");
    (0, eval)(body);
  })
  .catch(error => {
    self.postMessage({ type: "fatal", error: String(error?.stack || error) });
  });
