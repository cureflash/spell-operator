(() => {
  "use strict";

  const HINT_URL = "data/python-hints.json";
  let hintPromise = null;

  const freePolicy = () => ({
    name: "free",
    canUse: async () => ({ ok: true }),
    consume: async () => ({ ok: true, consumed: false })
  });

  let policy = freePolicy();

  function normalizeDecision(value, fallbackReason) {
    if (value === false) return { ok: false, reason: fallbackReason };
    if (value === true || value == null) return { ok: true };
    if (typeof value === "object") {
      return {
        ok: value.ok !== false,
        reason: typeof value.reason === "string" ? value.reason : "",
        consumed: Boolean(value.consumed)
      };
    }
    return { ok: Boolean(value), reason: fallbackReason };
  }

  function load() {
    if (!hintPromise) {
      hintPromise = fetch(HINT_URL, { cache: "no-store" })
        .then(response => {
          if (!response.ok) throw new Error(`Failed to load ${HINT_URL}: ${response.status}`);
          return response.json();
        })
        .catch(error => {
          console.warn("Python hint data could not be loaded.", error);
          return {};
        });
    }
    return hintPromise;
  }

  async function request(spellKey, context = {}) {
    const key = String(spellKey ?? "").trim();
    if (!key) return { ok: false, reason: "今はヒントを出せる問題がないみたい。" };

    const gate = normalizeDecision(
      await policy.canUse({ spellKey: key, ...context }),
      "ヒントを使うためのアイテムが足りないみたい。"
    );
    if (!gate.ok) return { ok: false, reason: gate.reason };

    const table = await load();
    const hint = typeof table?.[key] === "string" ? table[key].trim() : "";
    if (!hint) return { ok: false, reason: "この問題のヒントはまだ用意されていないみたい。" };

    const consume = normalizeDecision(
      await policy.consume({ spellKey: key, hint, ...context }),
      "ヒント用アイテムを使えなかったみたい。"
    );
    if (!consume.ok) return { ok: false, reason: consume.reason };

    return {
      ok: true,
      text: hint,
      consumed: Boolean(consume.consumed),
      policy: policy.name
    };
  }

  function setConsumptionPolicy(next = {}) {
    policy = {
      name: String(next.name || "custom"),
      canUse: typeof next.canUse === "function" ? next.canUse : async () => ({ ok: true }),
      consume: typeof next.consume === "function" ? next.consume : async () => ({ ok: true, consumed: false })
    };
  }

  function resetConsumptionPolicy() {
    policy = freePolicy();
  }

  window.SpellPluginHints = {
    load,
    request,
    setConsumptionPolicy,
    resetConsumptionPolicy,
    status: () => ({ policy: policy.name })
  };

  load();
})();
