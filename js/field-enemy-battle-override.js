(() => {
  "use strict";

  const G = window.SpellGame03;
  if (!G || typeof G.startFieldBattle !== "function") return;

  const originalStartFieldBattle = G.startFieldBattle;
  const originalGetEquippedSpell = G.getEquippedSpell;
  let starting = false;

  const fallbackSpells = {
    fire: { key: "fire", name: "Fire", mpCost: 0, steps: 0, power: 60 },
    repair: { key: "repair", name: "Repair", mpCost: 0, steps: 0, heal: 20 }
  };

  function readCoord(element, name) {
    if (!element) return NaN;
    const inline = element.style.getPropertyValue(name);
    const raw = inline || getComputedStyle(element).getPropertyValue(name);
    return Number.parseFloat(raw);
  }

  function entityPosition(selector) {
    const element = document.querySelector(selector);
    if (!element) return null;
    const x = readCoord(element, "--x");
    const y = readCoord(element, "--y");
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y, facing: element.dataset.facing || "down" };
  }

  function front(position) {
    if (!position) return null;
    const vector = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    }[position.facing] || { x: 0, y: 1 };
    return { x: position.x + vector.x, y: position.y + vector.y };
  }

  function same(a, b) {
    return Boolean(a && b && a.x === b.x && a.y === b.y);
  }

  function fieldReady() {
    return Boolean(
      document.getElementById("screen-field")?.classList.contains("active") &&
      window.SpellField?.currentMap?.() === "town" &&
      !window.SpellStory?.isOverlayOpen?.() &&
      !window.SpellMenu?.isOpen?.() &&
      !window.SpellMapTransition?.isActive?.() &&
      !window.SpellPlugin?.isTransitioning?.() &&
      document.getElementById("field-dialog")?.classList.contains("hidden")
    );
  }

  function withTemporaryBattleSpells(callback) {
    if (typeof originalGetEquippedSpell !== "function") return callback();
    G.getEquippedSpell = key => originalGetEquippedSpell(key) || fallbackSpells[key] || null;
    try {
      return callback();
    } finally {
      G.getEquippedSpell = originalGetEquippedSpell;
    }
  }

  function startBattleRegardless() {
    if (starting) return false;
    starting = true;
    try {
      return Boolean(withTemporaryBattleSpells(() => originalStartFieldBattle()));
    } finally {
      setTimeout(() => { starting = false; }, 250);
    }
  }

  // Any caller that explicitly starts the field battle now bypasses story/spell flags.
  G.startFieldBattle = startBattleRegardless;

  function enemyPosition() {
    return entityPosition("#field-enemy");
  }

  function playerPosition() {
    return entityPosition("#field-player");
  }

  function directionFromKey(event) {
    return {
      ArrowUp: "up", w: "up", W: "up",
      ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right"
    }[event.key] || null;
  }

  function nextForDirection(player, direction) {
    const vector = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    }[direction];
    return vector && player ? { x: player.x + vector.x, y: player.y + vector.y } : null;
  }

  function interceptMove(direction, event) {
    if (!fieldReady()) return false;
    if (!same(nextForDirection(playerPosition(), direction), enemyPosition())) return false;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    startBattleRegardless();
    return true;
  }

  function interceptAction(event) {
    if (!fieldReady()) return false;
    if (!same(front(playerPosition()), enemyPosition())) return false;
    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    startBattleRegardless();
    return true;
  }

  document.addEventListener("keydown", event => {
    const direction = directionFromKey(event);
    if (direction) {
      interceptMove(direction, event);
      return;
    }
    if (event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter") {
      interceptAction(event);
    }
  }, true);

  document.addEventListener("click", event => {
    const directionButton = event.target.closest?.("[data-dir]");
    if (directionButton && interceptMove(directionButton.dataset.dir, event)) return;
    if (event.target.closest?.("#field-action")) interceptAction(event);
    if (event.target.closest?.("#retry-battle")) {
      const hasFire = originalGetEquippedSpell?.("fire");
      const hasRepair = originalGetEquippedSpell?.("repair");
      if (!hasFire || !hasRepair) {
        event.preventDefault();
        event.stopImmediatePropagation();
        startBattleRegardless();
      }
    }
  }, true);

  window.SpellTownBattleOverride = {
    startBattleRegardless,
    isEnemyInFront: () => same(front(playerPosition()), enemyPosition())
  };
})();
