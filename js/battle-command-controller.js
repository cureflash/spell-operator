(() => {
  "use strict";

  const G = window.SpellGame03;
  const battleScreen = document.getElementById("screen-battle");
  const menuWrap = battleScreen?.querySelector(".battle-menu-wrap");
  if (!G || !battleScreen || !menuWrap) return;

  const grids = () => [...menuWrap.querySelectorAll(".command-grid")];
  const visibleGrid = () => grids().find(grid => !grid.classList.contains("hidden")) || null;
  const commands = (grid = visibleGrid()) => grid
    ? [...grid.querySelectorAll("button.command")].filter(button => !button.disabled && !button.hidden)
    : [];

  function ensureCursor(button) {
    let cursor = button.querySelector(":scope > .battle-command-cursor");
    if (!cursor) {
      cursor = document.createElement("span");
      cursor.className = "battle-command-cursor";
      cursor.setAttribute("aria-hidden", "true");
      button.prepend(cursor);
    }
    return cursor;
  }

  function setSelected(button, focus = false) {
    if (!button) return;
    menuWrap.querySelectorAll("button.command").forEach(item => {
      const selected = item === button;
      item.classList.toggle("is-selected", selected);
      ensureCursor(item).textContent = selected ? "▶" : "";
      if (selected) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });
    if (focus) {
      try { button.focus({ preventScroll: true }); }
      catch (_) { button.focus(); }
    }
  }

  function ensureVisibleMenu() {
    if (!battleScreen.classList.contains("active") || !G.state?.battle) return null;
    let grid = visibleGrid();
    if (grid) return grid;
    if (G.state.busy) return null;

    const pending = G.state.pendingActions || {};
    const id = !pending.sophie ? "sophie-menu" : !pending.lumiere ? "lumiere-menu" : null;
    if (!id) return null;

    grids().forEach(item => item.classList.add("hidden"));
    grid = document.getElementById(id);
    grid?.classList.remove("hidden");
    return grid || null;
  }

  function syncSelection() {
    const grid = ensureVisibleMenu() || visibleGrid();
    const list = commands(grid);
    if (!list.length) {
      menuWrap.querySelectorAll("button.command").forEach(item => {
        item.classList.remove("is-selected");
        ensureCursor(item).textContent = "";
        item.removeAttribute("aria-current");
      });
      return;
    }
    const current = list.find(item => item.classList.contains("is-selected"));
    setSelected(current || list[0]);
  }

  function center(button) {
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function move(direction) {
    const grid = ensureVisibleMenu() || visibleGrid();
    const list = commands(grid);
    if (!list.length) return false;
    const current = list.find(item => item.classList.contains("is-selected")) || list[0];
    const origin = center(current);

    const candidates = list
      .filter(item => item !== current)
      .map(item => {
        const point = center(item);
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        const valid = direction === "left" ? dx < -1
          : direction === "right" ? dx > 1
          : direction === "up" ? dy < -1
          : dy > 1;
        if (!valid) return null;
        const primary = direction === "left" || direction === "right" ? Math.abs(dx) : Math.abs(dy);
        const secondary = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
        return { item, score: primary * 1000 + secondary };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score);

    setSelected(candidates[0]?.item || current, true);
    return true;
  }

  menuWrap.querySelectorAll("button.command").forEach(ensureCursor);
  menuWrap.addEventListener("pointerover", event => {
    const button = event.target.closest?.("button.command");
    if (!button || button.disabled || button.closest(".command-grid")?.classList.contains("hidden")) return;
    setSelected(button);
  });
  menuWrap.addEventListener("focusin", event => {
    const button = event.target.closest?.("button.command");
    if (!button || button.disabled || button.closest(".command-grid")?.classList.contains("hidden")) return;
    setSelected(button);
  });

  document.addEventListener("keydown", event => {
    if (!battleScreen.classList.contains("active")) return;
    const grid = ensureVisibleMenu() || visibleGrid();
    if (!grid || G.state?.busy) return;

    const direction = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down"
    }[event.key];

    if (direction) {
      event.preventDefault();
      event.stopImmediatePropagation();
      move(direction);
      return;
    }

    if (event.key === "z" || event.key === "Z" || event.key === "Enter") {
      const list = commands(grid);
      const selected = list.find(item => item.classList.contains("is-selected")) || list[0];
      if (!selected) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setSelected(selected, true);
      selected.click();
    }
  }, true);

  new MutationObserver(syncSelection).observe(menuWrap, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "disabled", "hidden"]
  });

  new MutationObserver(syncSelection).observe(battleScreen, {
    attributes: true,
    attributeFilter: ["class"]
  });

  syncSelection();
  window.SpellBattleCommands = { sync: syncSelection, move };
})();
