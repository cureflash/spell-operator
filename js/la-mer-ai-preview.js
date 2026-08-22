(() => {
  "use strict";

  const MAP_ID = "la_mer_city";
  const ATLAS = "assets/tiles/la_mer_ai_pack.svg?v=2";
  const ATLAS_COLS = 32;
  const ATLAS_ROWS = 20;

  const STAMPS = [
    { id:"sannomiya-west", x:74, y:55, sx:18, sy:4, w:7, h:8, kind:"building" },
    { id:"sannomiya-east", x:99, y:55, sx:10, sy:4, w:7, h:9, kind:"building" },
    { id:"port1-market", x:48, y:82, sx:10, sy:14, w:6, h:4, kind:"market" },
    { id:"port2-market", x:92, y:82, sx:17, sy:14, w:6, h:4, kind:"market" },
    { id:"port2-landmark", x:86, y:86, sx:0, sy:4, w:9, h:9, kind:"building" },
    { id:"port1-boat", x:44, y:96, sx:0, sy:14, w:9, h:4, kind:"water-object" },
    { id:"port2-boat", x:80, y:96, sx:0, sy:14, w:9, h:4, kind:"water-object" },
    { id:"port1-bridge", x:60, y:94, sx:4, sy:0, w:8, h:4, kind:"water-object" },
    { id:"port1-lamp", x:56, y:83, sx:24, sy:14, w:2, h:5, kind:"prop" },
    { id:"port2-lamp", x:100, y:83, sx:24, sy:14, w:2, h:5, kind:"prop" }
  ];

  const style = document.createElement("style");
  style.id = "la-mer-ai-preview-style";
  style.textContent = `
    #field-world[data-map="${MAP_ID}"] .la-mer-pavement,
    #field-world[data-map="${MAP_ID}"] .la-mer-stone,
    #field-world[data-map="${MAP_ID}"] .la-mer-harbor,
    #field-world[data-map="${MAP_ID}"] .la-mer-plaza {
      background-color:#ece7da!important;
      background-image:url("assets/tiles/la_mer/ground.svg?v=2")!important;
      background-repeat:repeat!important;
      background-size:calc(3 * var(--tile-size)) calc(3 * var(--tile-size))!important;
    }
    #field-world[data-map="${MAP_ID}"] .la-mer-virtual-tile.water {
      background-color:#147fb5!important;
      background-image:
        linear-gradient(0deg,transparent 0 58%,rgba(170,232,255,.34) 60% 65%,transparent 67%),
        radial-gradient(ellipse at 30% 35%,rgba(202,244,255,.35) 0 10%,transparent 12%),
        linear-gradient(180deg,#21a0d0 0%,#147fb5 58%,#0b5d91 100%)!important;
      background-size:calc(2 * var(--tile-size)) var(--tile-size),calc(3 * var(--tile-size)) calc(2 * var(--tile-size)),100% 100%!important;
      animation:la-mer-water-drift 3.2s linear infinite;
    }
    #field-world[data-map="${MAP_ID}"] .la-mer-pier {
      background-color:#a97847!important;
      background-image:repeating-linear-gradient(90deg,#9a693d 0 5px,#c18a55 5px 10px)!important;
    }
    #field-world[data-map="${MAP_ID}"] .la-mer-ai-stamp {
      position:absolute;
      pointer-events:none;
      z-index:2;
      image-rendering:pixelated;
      background-image:url("${ATLAS}");
      background-repeat:no-repeat;
      filter:drop-shadow(0 2px 1px rgba(0,0,0,.22));
    }
    #field-world[data-map="${MAP_ID}"] .la-mer-ai-stamp[data-kind="water-object"]{z-index:3}
    #field-world[data-map="${MAP_ID}"] .la-mer-ai-stamp[data-kind="prop"]{z-index:4}
    @keyframes la-mer-water-drift{to{background-position:calc(2 * var(--tile-size)) 0,calc(-3 * var(--tile-size)) 0,0 0}}
  `;
  document.head.appendChild(style);

  function tilePixels(world) {
    const raw = getComputedStyle(world).getPropertyValue("--tile-size");
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 32;
  }

  function makeStamp(world, stamp, tile) {
    const el = document.createElement("div");
    el.className = "la-mer-ai-stamp";
    el.dataset.stampId = stamp.id;
    el.dataset.kind = stamp.kind;
    el.style.left = `calc(${stamp.x} * var(--tile-size))`;
    el.style.top = `calc(${stamp.y} * var(--tile-size))`;
    el.style.width = `calc(${stamp.w} * var(--tile-size))`;
    el.style.height = `calc(${stamp.h} * var(--tile-size))`;
    el.style.backgroundSize = `${ATLAS_COLS * tile}px ${ATLAS_ROWS * tile}px`;
    el.style.backgroundPosition = `${-stamp.sx * tile}px ${-stamp.sy * tile}px`;
    world.appendChild(el);
  }

  function mount() {
    const world = document.getElementById("field-world");
    if (!world || world.dataset.map !== MAP_ID) return false;
    const tile = tilePixels(world);
    const present = new Set([...world.querySelectorAll(":scope > .la-mer-ai-stamp")].map(el => el.dataset.stampId));
    for (const stamp of STAMPS) {
      if (!present.has(stamp.id)) makeStamp(world, stamp, tile);
    }
    return true;
  }

  function unmountIfOtherMap() {
    const world = document.getElementById("field-world");
    if (!world || world.dataset.map === MAP_ID) return;
    world.querySelectorAll(":scope > .la-mer-ai-stamp").forEach(el => el.remove());
  }

  const world = document.getElementById("field-world");
  if (world) {
    new MutationObserver(() => {
      if (world.dataset.map === MAP_ID) requestAnimationFrame(mount);
      else unmountIfOtherMap();
    }).observe(world, { attributes:true, attributeFilter:["data-map"], childList:true });
  }

  const original = window.SpellLaMerExpanded?.rebuildWorld;
  if (original && !original.__laMerAiWrapped) {
    const wrapped = (...args) => {
      const result = original(...args);
      requestAnimationFrame(mount);
      return result;
    };
    wrapped.__laMerAiWrapped = true;
    window.SpellLaMerExpanded.rebuildWorld = wrapped;
  }

  requestAnimationFrame(mount);
  window.SpellLaMerAiPreview = { atlas:ATLAS, stamps:STAMPS.map(x => ({...x})), mount };
})();
