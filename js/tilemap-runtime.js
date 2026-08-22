(() => {
  "use strict";

  const STORAGE_PREFIX = "spell-operator-tilemap:";
  const FALLBACKS = { house2: "assets/maps/house2-layout.json?v=2" };
  const layouts = Object.create(null);
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

  function safeParse(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function localLayout(mapId) {
    return safeParse(localStorage.getItem(STORAGE_PREFIX + mapId));
  }

  async function loadFallback(mapId) {
    const url = FALLBACKS[mapId];
    if (!url) return null;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  function normalizedLayout(mapId) {
    return localLayout(mapId) || layouts[mapId] || null;
  }

  function validDimensions(layout) {
    const width = Number(layout?.width), height = Number(layout?.height);
    if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
    if (width < 1 || height < 1 || width > 80 || height > 60) return null;
    return { width, height };
  }

  function collisionSet(layout, width) {
    if (!layout || !Array.isArray(layout.collision)) return new Set();
    const blocked = new Set();
    layout.collision.forEach((value, index) => {
      if (value) blocked.add(`${index % width},${Math.floor(index / width)}`);
    });
    return blocked;
  }

  function rebuildHouseGrid(mapId, width, height) {
    const world = document.getElementById("field-world");
    if (!world || world.dataset.map !== mapId) return;
    world.style.gridTemplateColumns = `repeat(${width},var(--tile-size))`;
    world.style.gridTemplateRows = `repeat(${height},var(--tile-size))`;
    world.style.width = `calc(${width} * var(--tile-size))`;
    world.style.height = `calc(${height} * var(--tile-size))`;

    world.querySelectorAll(":scope > .field-tile").forEach(el => el.remove());
    const frag = document.createDocumentFragment();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = document.createElement("div");
        tile.className = "field-tile house-floor";
        tile.dataset.x = String(x);
        tile.dataset.y = String(y);
        frag.appendChild(tile);
      }
    }
    world.insertBefore(frag, world.firstChild);
  }

  function restoreEntityFromSnapshot(entity, snap, width, height) {
    if (!entity || !snap) return false;
    if (!Number.isFinite(snap.x) || !Number.isFinite(snap.y)) return false;
    if (snap.x < 0 || snap.y < 0 || snap.x >= width || snap.y >= height) return false;
    Object.assign(entity, snap);
    return true;
  }

  function syncEntityElement(selector, entity) {
    const el = document.querySelector(selector);
    if (!el || !entity) return;
    el.style.setProperty("--x", entity.x);
    el.style.setProperty("--y", entity.y);
    if (entity.facing) el.dataset.facing = entity.facing;
  }

  function applyModel(mapId, layout, snapshot = null) {
    const dims = validDimensions(layout);
    if (!dims || !activeModel) return;
    activeModel.width = dims.width;
    activeModel.height = dims.height;
    activeModel.blocked = collisionSet(layout, dims.width);

    if (snapshot) {
      restoreEntityFromSnapshot(activeModel.player, snapshot.player, dims.width, dims.height);
      restoreEntityFromSnapshot(activeModel.follower, snapshot.follower, dims.width, dims.height);
    }

    const events = layout.fixedEvents || layout.events || {};
    if (!activeModel.inBounds(activeModel.player.x, activeModel.player.y)) {
      restoreEntityFromSnapshot(activeModel.player, events.playerStart, dims.width, dims.height);
    }
    if (!activeModel.inBounds(activeModel.follower.x, activeModel.follower.y)) {
      restoreEntityFromSnapshot(activeModel.follower, events.followerStart, dims.width, dims.height);
    }

    rebuildHouseGrid(mapId, dims.width, dims.height);
    syncEntityElement("#field-player", activeModel.player);
    syncEntityElement("#field-follower", activeModel.follower);
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  function applyVisual(mapId, layout) {
    if (!layout?.renderedMap) return;
    const apply = () => {
      const world = document.getElementById("field-world");
      if (!world || world.dataset.map !== mapId) return false;
      const tilemap = world.querySelector(".house-room-layer .house-tilemap");
      if (!tilemap) return false;
      tilemap.style.backgroundImage = `url(${JSON.stringify(layout.renderedMap)})`;
      tilemap.style.backgroundSize = "100% 100%";
      tilemap.style.backgroundPosition = "0 0";
      tilemap.style.backgroundRepeat = "no-repeat";
      tilemap.dataset.customTilemap = "1";
      return true;
    };
    if (apply()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (apply() || tries > 60) clearInterval(timer);
    }, 16);
  }

  function apply(mapId, snapshot = null) {
    const layout = normalizedLayout(mapId);
    if (!layout) return;
    applyModel(mapId, layout, snapshot);
    applyVisual(mapId, layout);
  }

  function installFieldPatch() {
    const field = window.SpellField;
    if (!field?.activateMap || field.activateMap.__spellTilemapPatched) return false;
    const original = field.activateMap.bind(field);
    const patched = (mapId, options = {}) => {
      const result = original(mapId, options);
      apply(mapId, options?.snapshot || null);
      return result;
    };
    patched.__spellTilemapPatched = true;
    field.activateMap = patched;
    apply(field.currentMap?.());
    return true;
  }

  const ready = Promise.all(Object.keys(FALLBACKS).map(async mapId => {
    layouts[mapId] = await loadFallback(mapId);
  })).then(() => layouts);

  const patchTimer = setInterval(() => {
    if (installFieldPatch()) clearInterval(patchTimer);
  }, 20);
  setTimeout(() => clearInterval(patchTimer), 10000);

  window.addEventListener("storage", event => {
    if (!event.key?.startsWith(STORAGE_PREFIX)) return;
    const mapId = event.key.slice(STORAGE_PREFIX.length);
    if (window.SpellField?.currentMap?.() === mapId) apply(mapId);
  });

  window.SpellTilemapRuntime = {
    ready,
    storageKey: mapId => STORAGE_PREFIX + mapId,
    get: normalizedLayout,
    apply,
    clearLocal(mapId) {
      localStorage.removeItem(STORAGE_PREFIX + mapId);
      return true;
    }
  };
})();