(() => {
  "use strict";

  const FieldModel = window.SpellFieldModel;
  const Field = window.SpellField;
  if (!FieldModel?.FollowFieldModel || !Field?.activateMap) return;

  const MAP_ID = "kyoto_city";
  const WIDTH = 144;
  const HEIGHT = 104;
  const VIEW_W = 32;
  const VIEW_H = 24;
  const SAFE_X = 6;
  const SAFE_Y = 5;
  const ROAD_W = 3;
  const VERTICAL_ROADS = [9, 27, 45, 63, 81, 99, 117, 135];
  const HORIZONTAL_ROADS = [8, 24, 40, 56, 72, 88];
  const key = FieldModel.key;

  const style = document.createElement("style");
  style.id = "vieille-city-runtime-style";
  style.textContent = `
    #field-world[data-map="kyoto_city"] .vieille-virtual-tile{
      position:absolute!important;
      left:calc(var(--tile-x) * var(--tile-size));
      top:calc(var(--tile-y) * var(--tile-size));
    }
    #field-world[data-map="kyoto_city"] .field-tile.vieille-road{
      background-color:#c7b58c!important;
      background-image:url("assets/tiles/vieille/road.png")!important;
      background-repeat:no-repeat!important;
      background-position:center!important;
      background-size:100% 100%!important;
    }
    #field-world[data-map="kyoto_city"] .field-tile.vieille-empty{
      background:#747957!important;
      background-image:none!important;
      box-shadow:none!important;
    }
  `;
  document.head.appendChild(style);

  let expandingVieille = false;
  let renderedWindow = null;
  let renderQueued = false;

  const onBand = (value, starts) => starts.some(start => value >= start && value < start + ROAD_W);
  const isRoad = (x, y) => onBand(x, VERTICAL_ROADS) || onBand(y, HORIZONTAL_ROADS);
  const tileAt = (x, y) => isRoad(x, y) ? "path vieille-road" : "vieille-empty";

  function buildBlocked() {
    const blocked = new Set();
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        if (!isRoad(x, y)) blocked.add(key(x, y));
      }
    }
    return blocked;
  }

  const blocked = buildBlocked();
  const spawn = {
    player: { x: 64, y: 57, facing: "down" },
    follower: { x: 64, y: 56, facing: "down" }
  };

  function playerPosition() {
    const player = document.getElementById("field-player");
    if (!player) return spawn.player;
    const x = Number.parseFloat(player.style.getPropertyValue("--x"));
    const y = Number.parseFloat(player.style.getPropertyValue("--y"));
    return {
      x: Number.isFinite(x) ? x : spawn.player.x,
      y: Number.isFinite(y) ? y : spawn.player.y
    };
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function windowFor(x, y) {
    const x1 = clamp(Math.floor(x - VIEW_W / 2), 0, WIDTH - VIEW_W);
    const y1 = clamp(Math.floor(y - VIEW_H / 2), 0, HEIGHT - VIEW_H);
    return { x1, y1, x2: x1 + VIEW_W - 1, y2: y1 + VIEW_H - 1 };
  }

  function isSafeInRendered(x, y) {
    if (!renderedWindow) return false;
    const { x1, y1, x2, y2 } = renderedWindow;
    return x >= x1 + SAFE_X && x <= x2 - SAFE_X && y >= y1 + SAFE_Y && y <= y2 - SAFE_Y;
  }

  function renderVisibleTiles(force = false) {
    const world = document.getElementById("field-world");
    if (!world || world.dataset.map !== MAP_ID) return;

    const player = playerPosition();
    if (!force && isSafeInRendered(player.x, player.y)) return;

    const next = windowFor(player.x, player.y);
    renderedWindow = next;
    world.querySelectorAll(".vieille-virtual-tile").forEach(element => element.remove());

    const fragment = document.createDocumentFragment();
    for (let y = next.y1; y <= next.y2; y += 1) {
      for (let x = next.x1; x <= next.x2; x += 1) {
        const tile = document.createElement("div");
        tile.className = `field-tile vieille-virtual-tile ${tileAt(x, y)}`;
        tile.dataset.x = x;
        tile.dataset.y = y;
        tile.style.setProperty("--tile-x", x);
        tile.style.setProperty("--tile-y", y);
        fragment.appendChild(tile);
      }
    }
    world.insertBefore(fragment, world.firstChild);
  }

  function scheduleVisibleTiles(force = false) {
    if (renderQueued && !force) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      renderVisibleTiles(force);
    });
  }

  function rebuildWorld() {
    const world = document.getElementById("field-world");
    if (!world || world.dataset.map !== MAP_ID) return;

    world.querySelectorAll(".field-tile,.field-map-label").forEach(element => element.remove());
    world.style.gridTemplateColumns = `repeat(${WIDTH},var(--tile-size))`;
    world.style.gridTemplateRows = `repeat(${HEIGHT},var(--tile-size))`;
    world.style.width = `calc(${WIDTH} * var(--tile-size))`;
    world.style.height = `calc(${HEIGHT} * var(--tile-size))`;
    world.style.position = "relative";
    world.style.willChange = "transform";

    renderedWindow = null;
    renderVisibleTiles(true);
  }

  const originalRestore = FieldModel.FollowFieldModel.prototype.restore;
  FieldModel.FollowFieldModel.prototype.restore = function restoreVieille(snapshot) {
    const worldIsVieille = document.getElementById("field-world")?.dataset.map === MAP_ID;
    if (!expandingVieille && !worldIsVieille) return originalRestore.call(this, snapshot);

    this.width = WIDTH;
    this.height = HEIGHT;
    this.blocked = new Set(blocked);

    const player = snapshot?.player;
    const looksExpanded = player
      && Number.isFinite(player.x)
      && Number.isFinite(player.y)
      && (player.x >= 20 || player.y >= 14);

    return originalRestore.call(this, looksExpanded ? snapshot : spawn);
  };

  const originalActivate = Field.activateMap.bind(Field);
  Field.activateMap = function activateVieille(id, options = {}) {
    if (id !== MAP_ID) return originalActivate(id, options);

    expandingVieille = true;
    try {
      const result = originalActivate(id, options);
      rebuildWorld();
      requestAnimationFrame(() => window.SpellPlaces?.refresh?.());
      requestAnimationFrame(() => window.SpellBgm?.sync?.());
      return result;
    } finally {
      expandingVieille = false;
    }
  };

  const world = document.getElementById("field-world");
  if (world) {
    const observer = new MutationObserver(() => {
      if (world.dataset.map === MAP_ID) queueMicrotask(rebuildWorld);
    });
    observer.observe(world, { attributes: true, attributeFilter: ["data-map"] });
  }

  const player = document.getElementById("field-player");
  if (player) {
    const observer = new MutationObserver(() => {
      if (document.getElementById("field-world")?.dataset.map === MAP_ID) scheduleVisibleTiles(false);
    });
    observer.observe(player, { attributes: true, attributeFilter: ["style"] });
  }

  document.getElementById("field-load")?.addEventListener("click", () => {
    queueMicrotask(() => {
      if (Field.currentMap?.() === MAP_ID) rebuildWorld();
    });
  });

  window.SpellVieilleCity = {
    mapId: MAP_ID,
    width: WIDTH,
    height: HEIGHT,
    isRoad,
    tileAt,
    spawn,
    blockedCount: blocked.size,
    renderedTileBudget: VIEW_W * VIEW_H,
    renderVisibleTiles,
    rebuildWorld
  };
})();
