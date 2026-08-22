(() => {
  "use strict";

  const STORAGE_PREFIX = "spell-operator-tilemap:";
  const FALLBACKS = { house2: "assets/maps/house2-layout.json?v=1" };
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

  function collisionSet(layout) {
    if (!layout || !Array.isArray(layout.collision)) return null;
    const width = Number(layout.width) || 0;
    const blocked = new Set();
    layout.collision.forEach((value, index) => {
      if (!value || !width) return;
      blocked.add(`${index % width},${Math.floor(index / width)}`);
    });
    return blocked;
  }

  function applyCollision(mapId) {
    const layout = normalizedLayout(mapId);
    if (!layout || !activeModel) return;
    if (Number(layout.width) !== activeModel.width || Number(layout.height) !== activeModel.height) return;
    const blocked = collisionSet(layout);
    if (blocked) activeModel.blocked = blocked;
  }

  function applyVisual(mapId) {
    const layout = normalizedLayout(mapId);
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
      if (apply() || tries > 30) clearInterval(timer);
    }, 16);
  }

  function apply(mapId) {
    applyCollision(mapId);
    applyVisual(mapId);
  }

  function installFieldPatch() {
    const field = window.SpellField;
    if (!field?.activateMap || field.activateMap.__spellTilemapPatched) return false;
    const original = field.activateMap.bind(field);
    const patched = (mapId, options = {}) => {
      const result = original(mapId, options);
      apply(mapId);
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
