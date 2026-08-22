(() => {
  "use strict";

  const STORAGE_PREFIX = "spell-operator-tilemap:";
  const PREVIEW_MODE = new URLSearchParams(window.location.search).get("mapedit") === "1";
  const OLD_HOUSE2 = {
    pc: { x: 9, y: 2 },
    stairs: { x: 10, y: 7 },
    playerStart: { x: 10, y: 6, facing: "up" },
    followerStart: { x: 10, y: 7, facing: "up" }
  };

  const safeParse = raw => {
    try { return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  };
  const localLayout = mapId => safeParse(localStorage.getItem(STORAGE_PREFIX + mapId));
  const ready = Promise.resolve({ previewMode: PREVIEW_MODE });

  function dims(layout) {
    const width = Number(layout?.width), height = Number(layout?.height);
    if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
    if (width < 1 || height < 1 || width > 180 || height > 140) return null;
    return { width, height };
  }

  function collisionSet(layout, width) {
    if (!Array.isArray(layout?.collision)) return null;
    const set = new Set();
    layout.collision.forEach((value, index) => {
      if (value) set.add(`${index % width},${Math.floor(index / width)}`);
    });
    return set;
  }

  function get(mapId) {
    return PREVIEW_MODE ? localLayout(mapId) : null;
  }

  function spec(mapId, base) {
    if (!PREVIEW_MODE) return base;
    const layout = get(mapId), d = dims(layout);
    if (!d) return base;
    const blocked = collisionSet(layout, d.width);
    return { ...base, ...d, blocked: blocked || base.blocked };
  }

  function event(mapId, key, fallback = null) {
    if (!PREVIEW_MODE) return fallback;
    const layout = get(mapId);
    const events = layout?.events || layout?.fixedEvents || {};
    const value = events?.[key];
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return fallback;
    return { ...fallback, ...value };
  }

  function clearLocal(mapId) {
    localStorage.removeItem(STORAGE_PREFIX + mapId);
    return true;
  }

  // Normal game must never consume editor/browser overrides.
  if (!PREVIEW_MODE) {
    window.SpellTilemapRuntime = {
      ready,
      previewMode: false,
      storageKey: mapId => STORAGE_PREFIX + mapId,
      get: () => null,
      spec: (_mapId, base) => base,
      event: (_mapId, _key, fallback = null) => fallback,
      apply: () => false,
      clearLocal
    };
    return;
  }

  let activeModel = null;
  const baseModel = window.SpellFieldModel?.FollowFieldModel;
  if (baseModel && !baseModel.__spellTilemapCaptured) {
    class CapturedFollowFieldModel extends baseModel {
      constructor(options) {
        super(options);
        activeModel = this;
        window.SpellTilemapActiveModel = this;
      }
    }
    CapturedFollowFieldModel.__spellTilemapCaptured = true;
    window.SpellFieldModel.FollowFieldModel = CapturedFollowFieldModel;
  }

  const same = (a, b) => Boolean(a && b && a.x === b.x && a.y === b.y);

  function rebuildGrid(mapId, width, height) {
    const world = document.getElementById("field-world");
    if (!world || world.dataset.map !== mapId) return;
    world.style.gridTemplateColumns = `repeat(${width},var(--tile-size))`;
    world.style.gridTemplateRows = `repeat(${height},var(--tile-size))`;
    world.style.width = `calc(${width} * var(--tile-size))`;
    world.style.height = `calc(${height} * var(--tile-size))`;
    world.querySelectorAll(":scope > .field-tile").forEach(el => el.remove());
    if (width * height > 3000) return;
    const frag = document.createDocumentFragment();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = document.createElement("div");
        tile.className = "field-tile custom-map-floor";
        tile.dataset.x = String(x);
        tile.dataset.y = String(y);
        tile.style.background = "transparent";
        tile.style.border = "0";
        tile.style.boxShadow = "none";
        frag.appendChild(tile);
      }
    }
    world.insertBefore(frag, world.firstChild);
  }

  function syncEntity(selector, entity) {
    const el = document.querySelector(selector);
    if (!el || !entity) return;
    el.style.setProperty("--x", entity.x);
    el.style.setProperty("--y", entity.y);
    if (entity.facing) el.dataset.facing = entity.facing;
  }

  function restoreEntity(entity, snap, width, height) {
    if (!entity || !snap) return false;
    if (!Number.isFinite(snap.x) || !Number.isFinite(snap.y)) return false;
    if (snap.x < 0 || snap.y < 0 || snap.x >= width || snap.y >= height) return false;
    Object.assign(entity, snap);
    return true;
  }

  function applyModel(mapId, layout, options = {}) {
    const d = dims(layout);
    if (!d || !activeModel) return;
    activeModel.width = d.width;
    activeModel.height = d.height;
    activeModel.blocked = collisionSet(layout, d.width) || new Set();

    const snapshot = options?.snapshot || null;
    if (snapshot) {
      restoreEntity(activeModel.player, snapshot.player, d.width, d.height);
      restoreEntity(activeModel.follower, snapshot.follower, d.width, d.height);
    }

    if (mapId === "house2" && options?.from === "game-start") {
      restoreEntity(activeModel.player, event(mapId, "playerStart", OLD_HOUSE2.playerStart), d.width, d.height);
      restoreEntity(activeModel.follower, event(mapId, "followerStart", OLD_HOUSE2.followerStart), d.width, d.height);
    } else {
      if (!activeModel.inBounds(activeModel.player.x, activeModel.player.y)) {
        restoreEntity(activeModel.player, event(mapId, "playerStart"), d.width, d.height);
      }
      if (!activeModel.inBounds(activeModel.follower.x, activeModel.follower.y)) {
        restoreEntity(activeModel.follower, event(mapId, "followerStart"), d.width, d.height);
      }
    }

    rebuildGrid(mapId, d.width, d.height);
    syncEntity("#field-player", activeModel.player);
    syncEntity("#field-follower", activeModel.follower);
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  function applyVisual(mapId, layout) {
    if (!layout?.renderedMap) return;
    const doApply = () => {
      const world = document.getElementById("field-world");
      if (!world || world.dataset.map !== mapId) return false;
      let layer = world.querySelector(":scope > .custom-tilemap-layer");
      if (!layer) {
        layer = document.createElement("div");
        layer.className = "custom-tilemap-layer";
        Object.assign(layer.style, {
          position: "absolute",
          inset: "0",
          zIndex: "0",
          pointerEvents: "none",
          imageRendering: "pixelated",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "0 0",
          backgroundSize: "100% 100%"
        });
        world.insertBefore(layer, world.firstChild);
      }
      layer.style.backgroundImage = `url(${JSON.stringify(layout.renderedMap)})`;
      layer.dataset.mapId = mapId;
      world.querySelectorAll(":scope > .field-tile").forEach(tile => {
        tile.style.background = "transparent";
        tile.style.border = "0";
        tile.style.boxShadow = "none";
      });
      return true;
    };
    if (doApply()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (doApply() || tries > 60) clearInterval(timer);
    }, 16);
  }

  function apply(mapId, options = {}) {
    const layout = get(mapId);
    if (!layout) return false;
    applyModel(mapId, layout, options);
    applyVisual(mapId, layout);
    return true;
  }

  function installFieldPatch() {
    const field = window.SpellField;
    if (!field?.activateMap || field.activateMap.__spellTilemapPatched) return false;
    const original = field.activateMap.bind(field);
    const patched = (mapId, options = {}) => {
      const result = original(mapId, options);
      apply(mapId, options);
      return result;
    };
    patched.__spellTilemapPatched = true;
    field.activateMap = patched;
    apply(field.currentMap?.(), {});
    return true;
  }

  function installHouse2EventInput() {
    const mapForKey = { ArrowUp:"up", w:"up", W:"up", ArrowDown:"down", s:"down", S:"down", ArrowLeft:"left", a:"left", A:"left", ArrowRight:"right", d:"right", D:"right" };
    const dirDelta = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };

    window.addEventListener("keydown", eventObject => {
      if (window.SpellField?.currentMap?.() !== "house2" || !activeModel) return;
      if (!get("house2")) return;
      const stairs = event("house2", "stairs", OLD_HOUSE2.stairs);
      const pc = event("house2", "pc", OLD_HOUSE2.pc);
      const direction = mapForKey[eventObject.key];
      if (direction) {
        const d = dirDelta[direction];
        const next = { x: activeModel.player.x + d.x, y: activeModel.player.y + d.y };
        if (same(next, stairs) && !same(stairs, OLD_HOUSE2.stairs)) {
          eventObject.preventDefault();
          eventObject.stopImmediatePropagation();
          window.SpellField.activateMap("house1", { from: "house2" });
          return;
        }
        if (same(next, OLD_HOUSE2.stairs) && !same(stairs, OLD_HOUSE2.stairs)) {
          eventObject.preventDefault();
          eventObject.stopImmediatePropagation();
          activeModel.player.facing = direction;
          activeModel.tryMove(direction);
          window.SpellField.render?.();
          return;
        }
      }

      const action = eventObject.key === "Enter" || eventObject.key === "z" || eventObject.key === "Z";
      if (!action) return;
      const front = activeModel.front(activeModel.player);
      if (same(front, pc) && !same(pc, OLD_HOUSE2.pc)) {
        eventObject.preventDefault();
        eventObject.stopImmediatePropagation();
        window.SpellGame03?.openComputer?.();
        return;
      }
      if (same(front, OLD_HOUSE2.pc) && !same(pc, OLD_HOUSE2.pc)) {
        eventObject.preventDefault();
        eventObject.stopImmediatePropagation();
      }
    }, true);

    document.addEventListener("click", eventObject => {
      if (!eventObject.target.closest?.("#field-action")) return;
      if (window.SpellField?.currentMap?.() !== "house2" || !activeModel) return;
      const pc = event("house2", "pc", OLD_HOUSE2.pc);
      const front = activeModel.front(activeModel.player);
      if (same(front, pc) && !same(pc, OLD_HOUSE2.pc)) {
        eventObject.preventDefault();
        eventObject.stopImmediatePropagation();
        window.SpellGame03?.openComputer?.();
      }
    }, true);
  }

  const timer = setInterval(() => {
    if (installFieldPatch()) clearInterval(timer);
  }, 20);
  setTimeout(() => clearInterval(timer), 10000);
  installHouse2EventInput();

  window.addEventListener("storage", eventObject => {
    if (!eventObject.key?.startsWith(STORAGE_PREFIX)) return;
    const mapId = eventObject.key.slice(STORAGE_PREFIX.length);
    if (window.SpellField?.currentMap?.() === mapId) apply(mapId, {});
  });

  window.SpellTilemapRuntime = {
    ready,
    previewMode: true,
    storageKey: mapId => STORAGE_PREFIX + mapId,
    get,
    spec,
    event,
    apply,
    clearLocal
  };
})();