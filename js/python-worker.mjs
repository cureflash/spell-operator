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

const PY_HELPER = String.raw`
import ast
import builtins
import io
import json
import math
import sys

_SO_COST_LIMIT = 2_000_000
_SO_BLOCKED_IMPORTS = {"js", "pyodide", "micropip"}
_SO_BLOCKED_CALLS = {"eval", "exec", "compile", "__import__"}

class _SoCostLimit(Exception):
    pass

class _SoTransformer(ast.NodeTransformer):
    def visit_Compare(self, node):
        self.generic_visit(node)
        if len(node.ops) == 1 and isinstance(node.ops[0], (ast.In, ast.NotIn)):
            fn = "_so_not_contains" if isinstance(node.ops[0], ast.NotIn) else "_so_contains"
            return ast.copy_location(ast.Call(func=ast.Name(id=fn, ctx=ast.Load()), args=[node.left, node.comparators[0]], keywords=[]), node)
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id in _SO_BLOCKED_CALLS:
            raise ValueError(f"{node.func.id}() はこの実行環境では使用できません。")
        if isinstance(node.func, ast.Attribute):
            attr = node.func.attr
            if attr == "sort":
                return ast.copy_location(ast.Call(func=ast.Name(id="_so_list_sort", ctx=ast.Load()), args=[node.func.value, *node.args], keywords=node.keywords), node)
            if attr == "count":
                return ast.copy_location(ast.Call(func=ast.Name(id="_so_count", ctx=ast.Load()), args=[node.func.value, *node.args], keywords=node.keywords), node)
            if attr == "index":
                return ast.copy_location(ast.Call(func=ast.Name(id="_so_index", ctx=ast.Load()), args=[node.func.value, *node.args], keywords=node.keywords), node)
        return node

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name.split(".")[0] in _SO_BLOCKED_IMPORTS:
                raise ValueError(f"import {alias.name} は使用できません。")
        return node

    def visit_ImportFrom(self, node):
        if (node.module or "").split(".")[0] in _SO_BLOCKED_IMPORTS:
            raise ValueError(f"from {node.module} import ... は使用できません。")
        return node


def _so_norm_output(text):
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    while lines and lines[-1].strip() == "":
        lines.pop()
    return "\n".join(line.rstrip() for line in lines)


def _so_len(value):
    try:
        return max(0, len(value))
    except Exception:
        return 1


def _so_nlogn(n):
    n = max(0, int(n))
    if n <= 1:
        return n
    return n * max(1, math.ceil(math.log2(n)))


def _so_run_suite(source, tests):
    source = str(source)
    tests = list(tests)
    try:
        tree = ast.parse(source, filename="<spell-operator>", mode="exec")
        tree = _SoTransformer().visit(tree)
        ast.fix_missing_locations(tree)
        code = compile(tree, "<spell-operator>", "exec")
    except Exception as e:
        return {"ok": False, "compileError": f"{type(e).__name__}: {e}", "tests": []}

    results = []
    max_cost = 0
    max_breakdown = {}

    for case_index, case in enumerate(tests):
        stdin_text = str(case.get("input", ""))
        expected = str(case.get("output", ""))
        stdout = io.StringIO()
        stdin = io.StringIO(stdin_text)
        cost = 0
        breakdown = {"opcode": 0, "builtin": 0}

        def _so_add(kind, amount):
            nonlocal cost
            amount = max(0, int(amount))
            cost += amount
            breakdown[kind] = breakdown.get(kind, 0) + amount
            if cost > _SO_COST_LIMIT:
                raise _SoCostLimit(f"抽象計算コストが上限 {_SO_COST_LIMIT} を超えました。")

        def _so_trace(frame, event, arg):
            if frame.f_code.co_filename != "<spell-operator>":
                return _so_trace
            frame.f_trace_opcodes = True
            if event == "opcode":
                _so_add("opcode", 1)
            return _so_trace

        def _wrap_linear(fn):
            def wrapped(iterable, *args, **kwargs):
                try:
                    n = len(iterable)
                    _so_add("builtin", n)
                    return fn(iterable, *args, **kwargs)
                except TypeError:
                    data = list(iterable)
                    _so_add("builtin", len(data))
                    return fn(data, *args, **kwargs)
            return wrapped

        def _so_sorted(iterable, *args, **kwargs):
            data = list(iterable)
            _so_add("builtin", _so_nlogn(len(data)))
            return builtins.sorted(data, *args, **kwargs)

        def _so_contains(item, container):
            if isinstance(container, (set, frozenset, dict)):
                _so_add("builtin", 1)
            else:
                _so_add("builtin", _so_len(container))
            return item in container

        def _so_not_contains(item, container):
            return not _so_contains(item, container)

        def _so_list_sort(obj, *args, **kwargs):
            _so_add("builtin", _so_nlogn(_so_len(obj)))
            return obj.sort(*args, **kwargs)

        def _so_count(obj, value, *args, **kwargs):
            _so_add("builtin", _so_len(obj))
            return obj.count(value, *args, **kwargs)

        def _so_index(obj, value, *args, **kwargs):
            _so_add("builtin", _so_len(obj))
            return obj.index(value, *args, **kwargs)

        safe_builtins = dict(vars(builtins))
        safe_builtins.update({
            "sum": _wrap_linear(builtins.sum),
            "max": _wrap_linear(builtins.max),
            "min": _wrap_linear(builtins.min),
            "any": _wrap_linear(builtins.any),
            "all": _wrap_linear(builtins.all),
            "sorted": _so_sorted,
        })
        namespace = {
            "__name__": "__main__",
            "__builtins__": safe_builtins,
            "_so_contains": _so_contains,
            "_so_not_contains": _so_not_contains,
            "_so_list_sort": _so_list_sort,
            "_so_count": _so_count,
            "_so_index": _so_index,
        }

        old_stdin, old_stdout, old_trace = sys.stdin, sys.stdout, sys.gettrace()
        error = None
        try:
            sys.stdin = stdin
            sys.stdout = stdout
            sys.settrace(_so_trace)
            exec(code, namespace, namespace)
        except Exception as e:
            error = f"{type(e).__name__}: {e}"
        finally:
            sys.settrace(old_trace)
            sys.stdin = old_stdin
            sys.stdout = old_stdout

        actual = stdout.getvalue()
        passed = error is None and _so_norm_output(actual) == _so_norm_output(expected)
        max_cost = max(max_cost, cost)
        if cost >= max_cost:
            max_breakdown = dict(breakdown)
        results.append({
            "index": case_index,
            "passed": passed,
            "input": stdin_text,
            "expected": expected,
            "actual": actual,
            "error": error,
            "cost": cost,
            "breakdown": dict(breakdown),
        })

    return {
        "ok": bool(results) and all(r["passed"] for r in results),
        "compileError": None,
        "tests": results,
        "maxCost": max_cost,
        "maxBreakdown": max_breakdown,
    }


def _so_run_suite_json(source, tests_json):
    return json.dumps(_so_run_suite(source, json.loads(tests_json)), ensure_ascii=False)
`;

async function initialize() {
  const module = await import(PYODIDE_MODULE);
  pyodide = await module.loadPyodide({ indexURL: PYODIDE_BASE });
  await pyodide.runPythonAsync(PY_HELPER);
  self.postMessage({ type: "ready", pyodideVersion: pyodide.version });
}

ready = initialize().catch(error => {
  self.postMessage({ type: "fatal", error: serializeError(error) });
  throw error;
});

self.addEventListener("message", async event => {
  const { id, type, source, tests } = event.data || {};
  if (type !== "run" || !id) return;

  try {
    await ready;
    pyodide.globals.set("__so_source", String(source ?? ""));
    pyodide.globals.set("__so_tests_json", JSON.stringify(Array.isArray(tests) ? tests : []));
    const jsonText = await pyodide.runPythonAsync("_so_run_suite_json(__so_source, __so_tests_json)");
    const result = JSON.parse(String(jsonText));
    self.postMessage({ id, type: "result", result });
  } catch (error) {
    self.postMessage({ id, type: "error", error: serializeError(error) });
  } finally {
    try { pyodide?.globals.delete("__so_source"); } catch {}
    try { pyodide?.globals.delete("__so_tests_json"); } catch {}
  }
});
