(() => {
  "use strict";

  const TILE = 32;
  const MAPS = {
    town: { name: "フルール村", w: 20, h: 14 },
    school: { name: "学校", w: 16, h: 12 },
    library: { name: "ピジブルの図書館", w: 16, h: 12 },
    house1: { name: "ソフィーの家 1F", w: 11, h: 9, image: "../assets/maps/sophie_house_1f_tilemap.png?v=1" },
    house2: { name: "ソフィーとルミエルの部屋", w: 12, h: 9, image: "../assets/maps/sophie_house_2f_tilemap.png?v=1" },
    la_mer_city: { name: "ラメールシティ", w: 144, h: 104 }
  };
  const EVENTS = {
    pc: { label: "P PC", mark: "P", color: "rgba(95,215,229,.88)", fallback: { x: 9, y: 2 } },
    stairs: { label: "S 階段", mark: "S", color: "rgba(233,196,93,.90)", fallback: { x: 10, y: 7 } },
    playerStart: { label: "A ソフィー開始", mark: "A", color: "rgba(240,128,170,.90)", fallback: { x: 10, y: 6, facing: "up" } },
    followerStart: { label: "B ルミエル開始", mark: "B", color: "rgba(130,210,150,.90)", fallback: { x: 10, y: 7, facing: "up" } }
  };

  const PIPO_ROOT = "https://raw.githubusercontent.com/eil941/rpg-a/main/assets/%E3%81%B4%E3%81%BD%E3%82%84/map/%E3%82%A6%E3%83%87%E3%82%A3%E3%82%BF2_32x32mapchip_20210215/MapChip/";
  const pipoUrl = filename => PIPO_ROOT + encodeURIComponent(filename);
  const PALETTES = [
    { id: "dotart-room", set: "ドット絵世界", type: "部屋", variant: "女の子の部屋（ローカル）", local: true },
    { id: "pipoya-base", set: "Pipoya FREE RPG Tileset 32x32", type: "基本・家具/建物", variant: "BaseChip", url: pipoUrl("[Base]BaseChip_pipo.png") },
    ...[1,2,3,4].map(n => ({ id: `pipoya-grass${n}`, set: "Pipoya FREE RPG Tileset 32x32", type: "草地", variant: `Grass${n}`, url: pipoUrl(`[A]Grass${n}_pipo.png`) })),
    ...[1,2,3,4].map(n => ({ id: `pipoya-dirt${n}`, set: "Pipoya FREE RPG Tileset 32x32", type: "土・道", variant: `Dirt${n}`, url: pipoUrl(`[A]Dirt${n}_pipo.png`) })),
    ...[1,2,3,4,5,6,7].map(n => ({ id: `pipoya-water${n}`, set: "Pipoya FREE RPG Tileset 32x32", type: "水", variant: `Water${n}`, url: pipoUrl(`[A]Water${n}_pipo.png`) })),
    ...[1,2].map(n => ({ id: `pipoya-wall${n}`, set: "Pipoya FREE RPG Tileset 32x32", type: "壁", variant: `Wall-Up${n}`, url: pipoUrl(`[A]Wall-Up${n}_pipo.png`) })),
    { id: "pipoya-flower", set: "Pipoya FREE RPG Tileset 32x32", type: "装飾", variant: "Flower", url: pipoUrl("[A]Flower_pipo.png") },
    { id: "pipoya-longgrass", set: "Pipoya FREE RPG Tileset 32x32", type: "装飾", variant: "LongGrass", url: pipoUrl("[A]LongGrass_pipo.png") }
  ];
  const PALETTE_BY_ID = new Map(PALETTES.map(p => [p.id, p]));

  const $ = s => document.querySelector(s);
  const canvas = $("#mapCanvas");
  const ctx = canvas.getContext("2d");
  const paletteCanvas = $("#paletteCanvas");
  const pctx = paletteCanvas.getContext("2d");
  const cursor = $("#paletteCursor");
  const mapFrame = $("#mapFrame");
  const paletteStage = $("#paletteStage");

  const draftKey = id => `spell-operator-tilemap-editor:${id}`;
  const gameKey = id => `spell-operator-tilemap:${id}`;
  const dotartKey = "spell-operator-editor-tileset:dotartworld-room-girl";

  const baselineImageCache = new Map();
  const paletteImages = new Map();

  let mapId = "house2";
  let W = MAPS.house2.w;
  let H = MAPS.house2.h;
  let state = null;
  let events = {};
  let layer = "base";
  let eventMode = null;

  let activePaletteId = "pipoya-base";
  let paletteSelection = { x: 0, y: 0, w: 1, h: 1 };
  let paletteDragStart = null;
  let paletteDragging = false;

  let mapPainting = false;
  let mapErase = false;
  let lastMapCell = null;
  let changed = false;

  let history = [];
  let historyIndex = -1;
  let drawGeneration = 0;

  const deep = v => JSON.parse(JSON.stringify(v));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const validDim = (v, fallback, max) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 4 && n <= max ? n : fallback;
  };
  const empty = fill => Array(W * H).fill(fill);
  const blankState = () => ({ layers: { base: empty(null), object: empty(null), upper: empty(null) }, collision: empty(0) });
  const setStatus = text => { $("#status").textContent = text; };

  function oldNumericToRef(value) {
    if (!Number.isInteger(value) || value < 0) return null;
    return { p: "dotart-room", x: value % 8, y: Math.floor(value / 8) };
  }

  function normalizeRef(value) {
    if (!value && value !== 0) return null;
    if (typeof value === "number") return oldNumericToRef(value);
    if (typeof value !== "object") return null;
    const p = String(value.p || value.palette || "");
    const x = Number(value.x), y = Number(value.y);
    if (!p || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) return null;
    return { p, x, y };
  }

  function fitRefs(src) {
    const out = Array(W * H).fill(null);
    if (Array.isArray(src)) {
      for (let i = 0; i < Math.min(src.length, out.length); i++) out[i] = normalizeRef(src[i]);
    }
    return out;
  }

  function fitCollision(src) {
    const out = Array(W * H).fill(0);
    if (Array.isArray(src)) {
      for (let i = 0; i < Math.min(src.length, out.length); i++) out[i] = src[i] ? 1 : 0;
    }
    return out;
  }

  function currentCollision(id) {
    const c = MAPS[id];
    const a = Array(c.w * c.h).fill(0);
    for (let x = 0; x < c.w; x++) { a[x] = 1; a[(c.h - 1) * c.w + x] = 1; }
    for (let y = 1; y < c.h - 1; y++) { a[y * c.w] = 1; a[y * c.w + c.w - 1] = 1; }
    const rect = (x1, y1, x2, y2) => {
      for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) a[y * c.w + x] = 1;
    };
    if (id === "town") [[1,1,5,3],[11,1,15,3],[15,7,18,9],[10,10,12,11],[1,6,4,8],[6,1,9,3]].forEach(r => rect(...r));
    if (id === "school") [[2,3,4,3],[6,3,8,3],[10,3,12,3],[2,6,4,6],[6,6,8,6],[10,6,12,6]].forEach(r => rect(...r));
    if (id === "library") [[2,2,5,3],[10,2,13,3],[2,7,5,8],[10,7,13,8]].forEach(r => rect(...r));
    if (id === "house1") [[1,1,4,2],[2,4,4,5],[6,3,8,3],[8,1,9,1]].forEach(r => rect(...r));
    if (id === "house2") [[1,1,3,3],[4,1,6,3],[8,1,10,2],[1,5,2,5],[9,4,10,5]].forEach(r => rect(...r));
    return a;
  }

  function defaults(id) {
    const c = MAPS[id];
    W = c.w; H = c.h;
    const s = blankState();
    s.collision = currentCollision(id);
    const ev = {};
    if (id === "house2") Object.entries(EVENTS).forEach(([k, v]) => ev[k] = deep(v.fallback));
    return { state: s, events: ev };
  }

  function migrateDraft(id, raw) {
    if (!raw || typeof raw !== "object") return false;
    const c = MAPS[id];
    W = validDim(raw.W ?? raw.width, c.w, 160);
    H = validDim(raw.H ?? raw.height, c.h, 120);
    const src = raw.state || raw;
    const layers = src.layers || raw.layers || {};
    state = {
      layers: {
        base: fitRefs(layers.base),
        object: fitRefs(layers.object),
        upper: fitRefs(layers.upper)
      },
      collision: fitCollision(src.collision ?? raw.collision)
    };
    events = deep(raw.events || raw.fixedEvents || src.events || {});
    if (id === "house2") Object.entries(EVENTS).forEach(([k, v]) => events[k] ??= deep(v.fallback));
    return true;
  }

  function scale() { return W > 80 ? .5 : W > 40 ? 1 : 2; }

  function setCanvasSize() {
    canvas.width = W * TILE;
    canvas.height = H * TILE;
    const s = scale();
    canvas.style.width = `${W * TILE * s}px`;
    canvas.style.height = `${H * TILE * s}px`;
    mapFrame.style.width = canvas.style.width;
    mapFrame.style.height = canvas.style.height;
    $("#mapWidth").value = W;
    $("#mapHeight").value = H;
    $("#mapBadge").textContent = `${MAPS[mapId].name} ${W}×${H}`;
  }

  function loadImage(url, crossOrigin = false) {
    if (!url) return Promise.resolve(null);
    const key = `${crossOrigin ? "cors:" : ""}${url}`;
    if (baselineImageCache.has(key)) return baselineImageCache.get(key);
    const promise = new Promise(resolve => {
      const im = new Image();
      if (crossOrigin) im.crossOrigin = "anonymous";
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = url;
    });
    baselineImageCache.set(key, promise);
    return promise;
  }

  async function ensurePalette(id) {
    if (paletteImages.has(id)) return paletteImages.get(id);
    const def = PALETTE_BY_ID.get(id);
    if (!def) return null;
    let url = def.url || null;
    if (def.local) url = localStorage.getItem(dotartKey);
    if (!url) return null;
    const promise = new Promise(resolve => {
      const im = new Image();
      if (!url.startsWith("data:")) im.crossOrigin = "anonymous";
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = url;
    });
    paletteImages.set(id, promise);
    return promise;
  }

  function invalidatePalette(id) {
    paletteImages.delete(id);
  }

  function usedPaletteIds() {
    const ids = new Set();
    for (const l of ["base", "object", "upper"]) {
      for (const ref of state.layers[l]) if (ref?.p) ids.add(ref.p);
    }
    return [...ids];
  }

  async function ensureUsedPalettes() {
    await Promise.all(usedPaletteIds().map(ensurePalette));
  }

  function townKind(x, y) {
    const path = (y===4&&x>=2&&x<=17)||(y===5&&x>=2&&x<=17)||(x===3&&y>=3&&y<=12)||(x===13&&y>=3&&y<=11)||(x===16&&y>=4&&y<=10)||(y===10&&x>=8&&x<=16)||(y===11&&x>=3&&x<=13);
    if (y===0||y===13||x===0||x===19) return "tree";
    if (x>=6&&x<=9&&y>=1&&y<=3) return "water";
    if (x>=1&&x<=5&&y>=1&&y<=3) return y===1?"roofSchool":x===3&&y===3?"door":"building";
    if (x>=1&&x<=4&&y>=6&&y<=8) return y===6?"roofHome":x===2&&y===8?"door":"building";
    if (x>=11&&x<=15&&y>=1&&y<=3) return y===1?"roofLibrary":x===13&&y===3?"door":"building";
    if (x>=15&&x<=18&&y>=7&&y<=9) return y===7?"roofParts":x===16&&y===9?"door":"building";
    if (x>=10&&x<=12&&y>=10&&y<=11) return y===10?"roofShop":x===11&&y===11?"door":"building";
    return path ? "path" : ((x+y)%9===0 ? "flower" : "grass");
  }

  function schoolKind(x,y) {
    if (x===7&&y===11) return "door";
    if (y===0||x===0||x===15||y===11) return "wall";
    if (y===1&&x>=3&&x<=12) return "board";
    if ((y===3||y===6)&&((x>=2&&x<=4)||(x>=6&&x<=8)||(x>=10&&x<=12))) return "desk";
    return "floor";
  }

  function libraryKind(x,y) {
    if (x===7&&y===11) return "door";
    if (y===0||x===0||x===15||y===11) return "wall";
    if ((y===2||y===3||y===7||y===8)&&((x>=2&&x<=5)||(x>=10&&x<=13))) return "books";
    if (y===5&&x>=6&&x<=9) return "table";
    return "floor";
  }

  const COLORS = {
    grass:"#79b95b", flower:"#85bd64", path:"#cfbb85", tree:"#36783c", water:"#6fb4d7",
    building:"#ddcfb4", door:"#6f4c35", roofSchool:"#7c5e91", roofHome:"#815c76",
    roofLibrary:"#567d97", roofParts:"#98684b", roofShop:"#598b70", wall:"#795f78",
    floor:"#d7c2a5", board:"#315b45", desk:"#a9784f", books:"#7a5541", table:"#aa815e"
  };

  function drawSimpleMap(target, id) {
    const c = MAPS[id], mw = Math.min(W, c.w), mh = Math.min(H, c.h);
    target.save();
    target.fillStyle = "#222733";
    target.fillRect(0, 0, W*TILE, H*TILE);
    for (let y=0; y<mh; y++) for (let x=0; x<mw; x++) {
      const k = id === "town" ? townKind(x,y) : id === "school" ? schoolKind(x,y) : libraryKind(x,y);
      target.fillStyle = COLORS[k] || "#777";
      target.fillRect(x*TILE, y*TILE, TILE, TILE);
      if (k === "tree") {
        target.fillStyle="#2d7b3d";
        target.beginPath(); target.arc(x*TILE+16, y*TILE+13, 11, 0, Math.PI*2); target.fill();
      }
      if (k === "water") {
        target.strokeStyle="#a2d4e8";
        target.beginPath(); target.moveTo(x*TILE+3, y*TILE+12); target.lineTo(x*TILE+29, y*TILE+12); target.stroke();
      }
    }
    target.restore();
  }

  function drawLaMer(target) {
    target.fillStyle="#416f48"; target.fillRect(0,0,W*TILE,H*TILE);
    const zoneW=36, zoneH=26;
    const rect=(x,y,w,h,color)=>{target.fillStyle=color;target.fillRect(x*TILE,y*TILE,w*TILE,h*TILE);};
    rect(zoneW*2,0,zoneW,zoneH,"#315e38"); rect(zoneW*2,zoneH,zoneW,zoneH,"#6f8760");
    rect(0,zoneH*2,zoneW,zoneH,"#71935e"); rect(zoneW,zoneH*2,zoneW,zoneH,"#b6ad91"); rect(zoneW*2,zoneH*2,zoneW,zoneH,"#859b70"); rect(zoneW*3,zoneH*2,zoneW,zoneH,"#71935e");
    rect(0,zoneH*3,zoneW,zoneH,"#d4bd77"); rect(zoneW,zoneH*3,zoneW,zoneH,"#748992"); rect(zoneW*2,zoneH*3,zoneW,zoneH,"#748992"); rect(zoneW*3,zoneH*3,zoneW,zoneH,"#64a9cf");
    target.fillStyle="#55545b"; target.fillRect(0,(zoneH*2+12)*TILE,W*TILE,4*TILE); target.fillRect((zoneW*2+23)*TILE,zoneH*2*TILE,2*TILE,zoneH*2*TILE);
    target.fillStyle="#8b6a4e";
    for (const [zx,zy] of [[1,2],[2,2],[2,1]]) for (let i=0;i<5;i++) target.fillRect((zx*zoneW+4+i*6)*TILE,(zy*zoneH+4)*TILE,5*TILE,6*TILE);
  }

  async function drawBaseline(target) {
    const c = MAPS[mapId];
    target.clearRect(0,0,W*TILE,H*TILE);
    if (c.image) {
      target.fillStyle="#222733";
      target.fillRect(0,0,W*TILE,H*TILE);
      const im = await loadImage(c.image);
      if (im) target.drawImage(im,0,0,Math.min(W,c.w)*TILE,Math.min(H,c.h)*TILE);
      return;
    }
    if (mapId === "la_mer_city") drawLaMer(target);
    else drawSimpleMap(target,mapId);
  }

  async function drawTileRef(target, ref, dx, dy) {
    if (!ref?.p) return;
    const im = await ensurePalette(ref.p);
    if (!im) return;
    const sx = ref.x * TILE, sy = ref.y * TILE;
    if (sx >= im.naturalWidth || sy >= im.naturalHeight) return;
    target.drawImage(im, sx, sy, TILE, TILE, dx, dy, TILE, TILE);
  }

  async function drawEdits(target) {
    await ensureUsedPalettes();
    for (const l of ["base", "object", "upper"]) {
      const arr = state.layers[l];
      for (let i=0;i<arr.length;i++) {
        const ref = arr[i];
        if (!ref) continue;
        await drawTileRef(target, ref, (i%W)*TILE, Math.floor(i/W)*TILE);
      }
    }
  }

  function drawMarker(target, p, text, color) {
    if (!p || p.x<0 || p.y<0 || p.x>=W || p.y>=H) return;
    const x=p.x*TILE,y=p.y*TILE;
    target.fillStyle=color; target.fillRect(x+5,y+5,TILE-10,TILE-10);
    target.fillStyle="#111"; target.font="bold 14px monospace"; target.textAlign="center"; target.textBaseline="middle";
    target.fillText(text,x+TILE/2,y+TILE/2);
  }

  async function draw() {
    const generation = ++drawGeneration;
    await drawBaseline(ctx);
    if (generation !== drawGeneration) return;
    await drawEdits(ctx);
    if (generation !== drawGeneration) return;

    if (layer === "collision") {
      state.collision.forEach((v,i)=>{
        if (!v) return;
        ctx.fillStyle="rgba(216,68,85,.34)";
        ctx.fillRect((i%W)*TILE,Math.floor(i/W)*TILE,TILE,TILE);
      });
    }
    ctx.strokeStyle="rgba(255,255,255,.22)";
    ctx.lineWidth=1;
    for (let x=0;x<=W*TILE;x+=TILE) { ctx.beginPath(); ctx.moveTo(x+.5,0); ctx.lineTo(x+.5,H*TILE); ctx.stroke(); }
    for (let y=0;y<=H*TILE;y+=TILE) { ctx.beginPath(); ctx.moveTo(0,y+.5); ctx.lineTo(W*TILE,y+.5); ctx.stroke(); }
    if (mapId === "house2") Object.entries(EVENTS).forEach(([k,v])=>drawMarker(ctx,events[k],v.mark,v.color));
  }

  async function finalRenderedMap() {
    const c = document.createElement("canvas");
    c.width = W*TILE; c.height = H*TILE;
    const x = c.getContext("2d");
    await drawBaseline(x);
    await drawEdits(x);
    return c.toDataURL("image/png");
  }

  function cellFromMapEvent(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX-r.left) * canvas.width/r.width / TILE);
    const y = Math.floor((e.clientY-r.top) * canvas.height/r.height / TILE);
    return x>=0&&y>=0&&x<W&&y<H ? {x,y,i:y*W+x} : null;
  }

  function paletteCellFromEvent(e) {
    const r = paletteCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX-r.left) * paletteCanvas.width/r.width / TILE);
    const y = Math.floor((e.clientY-r.top) * paletteCanvas.height/r.height / TILE);
    const cols = Math.floor(paletteCanvas.width/TILE), rows=Math.floor(paletteCanvas.height/TILE);
    return x>=0&&y>=0&&x<cols&&y<rows ? {x,y} : null;
  }

  function normalizeSelection(a, b) {
    return {
      x: Math.min(a.x,b.x), y: Math.min(a.y,b.y),
      w: Math.abs(a.x-b.x)+1, h: Math.abs(a.y-b.y)+1
    };
  }

  function updateSelectionOverlay() {
    const s = paletteSelection;
    if (!s) { cursor.style.display="none"; $("#stampSize").textContent="—"; return; }
    cursor.style.display="block";
    cursor.style.left=`${s.x*TILE}px`; cursor.style.top=`${s.y*TILE}px`;
    cursor.style.width=`${s.w*TILE}px`; cursor.style.height=`${s.h*TILE}px`;
    $("#stampSize").textContent=`${s.w}×${s.h}`;
  }

  async function renderPalette() {
    const def = PALETTE_BY_ID.get(activePaletteId);
    $("#paletteName").textContent = def ? `${def.set} / ${def.type} / ${def.variant}` : "";
    const im = await ensurePalette(activePaletteId);
    if (!im) {
      paletteCanvas.width=256; paletteCanvas.height=32;
      paletteStage.style.width="256px"; paletteStage.style.minHeight="32px";
      pctx.fillStyle="#10131b"; pctx.fillRect(0,0,256,32);
      pctx.fillStyle="#c9cfe0"; pctx.font="11px monospace"; pctx.fillText("ローカル素材を読み込んでください",8,20);
      $("#tilesetInfo").textContent = def?.local ? "未読込" : "読込失敗";
      paletteSelection={x:0,y:0,w:1,h:1}; updateSelectionOverlay();
      return;
    }
    const w = Math.floor(im.naturalWidth/TILE)*TILE;
    const h = Math.floor(im.naturalHeight/TILE)*TILE;
    paletteCanvas.width=Math.max(TILE,w); paletteCanvas.height=Math.max(TILE,h);
    paletteStage.style.width=`${paletteCanvas.width}px`; paletteStage.style.minHeight=`${paletteCanvas.height}px`;
    pctx.clearRect(0,0,paletteCanvas.width,paletteCanvas.height);
    pctx.drawImage(im,0,0);
    pctx.strokeStyle="rgba(255,255,255,.16)";
    for(let x=0;x<=paletteCanvas.width;x+=TILE){pctx.beginPath();pctx.moveTo(x+.5,0);pctx.lineTo(x+.5,paletteCanvas.height);pctx.stroke();}
    for(let y=0;y<=paletteCanvas.height;y+=TILE){pctx.beginPath();pctx.moveTo(0,y+.5);pctx.lineTo(paletteCanvas.width,y+.5);pctx.stroke();}
    $("#tilesetInfo").textContent=`${im.naturalWidth}×${im.naturalHeight}px`;
    const cols=Math.floor(paletteCanvas.width/TILE),rows=Math.floor(paletteCanvas.height/TILE);
    paletteSelection.x=clamp(paletteSelection.x,0,Math.max(0,cols-1));
    paletteSelection.y=clamp(paletteSelection.y,0,Math.max(0,rows-1));
    paletteSelection.w=clamp(paletteSelection.w,1,cols-paletteSelection.x);
    paletteSelection.h=clamp(paletteSelection.h,1,rows-paletteSelection.y);
    updateSelectionOverlay();
  }

  function populatePaletteSets() {
    const setEl=$("#paletteSet"), typeEl=$("#paletteType"), varEl=$("#paletteVariant");
    const sets=[...new Set(PALETTES.map(p=>p.set))];
    setEl.replaceChildren(...sets.map(v=>new Option(v,v)));

    function syncTypes(preferredType=null) {
      const set=setEl.value;
      const types=[...new Set(PALETTES.filter(p=>p.set===set).map(p=>p.type))];
      typeEl.replaceChildren(...types.map(v=>new Option(v,v)));
      if(preferredType&&types.includes(preferredType))typeEl.value=preferredType;
      syncVariants();
    }
    function syncVariants(preferredId=null) {
      const choices=PALETTES.filter(p=>p.set===setEl.value&&p.type===typeEl.value);
      varEl.replaceChildren(...choices.map(p=>new Option(p.variant,p.id)));
      if(preferredId&&choices.some(p=>p.id===preferredId))varEl.value=preferredId;
      activePaletteId=varEl.value||choices[0]?.id||activePaletteId;
      paletteSelection={x:0,y:0,w:1,h:1};
      renderPalette();
    }
    setEl.onchange=()=>syncTypes();
    typeEl.onchange=()=>syncVariants();
    varEl.onchange=()=>{activePaletteId=varEl.value;paletteSelection={x:0,y:0,w:1,h:1};renderPalette();};
    const current=PALETTE_BY_ID.get(activePaletteId)||PALETTES[0];
    setEl.value=current.set; syncTypes(current.type); varEl.value=current.id; activePaletteId=current.id; renderPalette();

    window.__spellSelectPalette = id => {
      const def=PALETTE_BY_ID.get(id); if(!def)return;
      setEl.value=def.set; syncTypes(def.type); varEl.value=def.id; activePaletteId=def.id; renderPalette();
    };
  }

  function stampAt(mapX, mapY, erase=false) {
    if (layer === "collision") {
      const x=mapX,y=mapY;
      if(x<0||y<0||x>=W||y>=H)return false;
      const i=y*W+x;
      const next=erase?0:(state.collision[i]?0:1);
      if(state.collision[i]===next)return false;
      state.collision[i]=next;
      return true;
    }
    const arr=state.layers[layer];
    let any=false;
    const sel=paletteSelection;
    for(let dy=0;dy<sel.h;dy++)for(let dx=0;dx<sel.w;dx++){
      const tx=mapX+dx,ty=mapY+dy;
      if(tx<0||ty<0||tx>=W||ty>=H)continue;
      const i=ty*W+tx;
      const next=erase?null:{p:activePaletteId,x:sel.x+dx,y:sel.y+dy};
      if(JSON.stringify(arr[i])!==JSON.stringify(next)){arr[i]=next;any=true;}
    }
    return any;
  }

  function eyedropAt(c) {
    if (layer === "collision") return;
    const ref=state.layers[layer][c.i];
    if(!ref?.p)return;
    const def=PALETTE_BY_ID.get(ref.p);
    if(!def){setStatus(`未登録パレット: ${ref.p}`);return;}
    window.__spellSelectPalette?.(ref.p);
    paletteSelection={x:ref.x,y:ref.y,w:1,h:1};
    updateSelectionOverlay();
    setStatus(`${def.variant} をスポイト`);
  }

  function snapshot() { return {W,H,state:deep(state),events:deep(events)}; }
  function pushHistory() {
    history=history.slice(0,historyIndex+1);
    history.push(snapshot());
    if(history.length>80)history.shift();
    historyIndex=history.length-1;
    syncUndo();
  }
  function syncUndo() { $("#undo").disabled=historyIndex<=0; $("#redo").disabled=historyIndex>=history.length-1; }
  function restoreHistory(index) {
    if(index<0||index>=history.length)return;
    historyIndex=index;
    const s=history[index]; W=s.W; H=s.H; state=deep(s.state); events=deep(s.events);
    setCanvasSize(); renderEventButtons(); draw(); syncUndo();
  }

  function saveDraft(show=true) {
    localStorage.setItem(draftKey(mapId),JSON.stringify({version:8,W,H,state,events}));
    if(show)setStatus("編集状態を保存しました");
  }

  async function loadMap(id) {
    if(state)saveDraft(false);
    mapId=id; eventMode=null; $("#mapSelect").value=id;
    let raw=null;
    try{raw=JSON.parse(localStorage.getItem(draftKey(id)));}catch{}
    if(!migrateDraft(id,raw)){
      if(id==="house2"){
        try{
          const r=await fetch("../assets/maps/house2-layout.json?v=2",{cache:"no-store"});
          if(r.ok){const d=await r.json();migrateDraft(id,d);}
        }catch{}
      }
      if(!state||W!==MAPS[id].w||H!==MAPS[id].h){const d=defaults(id);state=d.state;events=d.events;}
    }
    setCanvasSize(); history=[]; historyIndex=-1; pushHistory(); renderEventButtons(); await draw(); setStatus(`${MAPS[id].name} を編集中`);
  }

  function resizeMap(nw,nh) {
    nw=validDim(nw,W,160); nh=validDim(nh,H,120);
    if(nw===W&&nh===H)return;
    const ow=W,oh=H,old=deep(state); W=nw;H=nh; const next=blankState();
    for(let y=0;y<Math.min(oh,H);y++)for(let x=0;x<Math.min(ow,W);x++){
      const oi=y*ow+x,ni=y*W+x;
      for(const l of["base","object","upper"])next.layers[l][ni]=old.layers[l][oi];
      next.collision[ni]=old.collision[oi];
    }
    state=next;
    for(const e of Object.values(events)){e.x=clamp(e.x,0,W-1);e.y=clamp(e.y,0,H-1);}
    setCanvasSize(); draw(); pushHistory(); setStatus(`サイズを ${W}×${H} に変更`);
  }

  function renderEventButtons() {
    const box=$("#eventButtons"), help=$("#eventHelp"); box.innerHTML="";
    if(mapId!=="house2"){
      help.textContent="このマップは現在、タイル・サイズ・当たり判定を編集できます。";
      $("#cancelEvent").disabled=true; return;
    }
    help.textContent="移動したいイベントを押してから、移動先のマスをクリック。";
    $("#cancelEvent").disabled=false;
    for(const[k,v]of Object.entries(EVENTS)){
      const b=document.createElement("button"),p=events[k]||v.fallback;
      b.className="event-btn"+(eventMode===k?" active":"");
      b.textContent=`${v.label} (${p.x},${p.y})`;
      b.onclick=()=>{eventMode=k;$("#modeText").textContent=`${v.label} の移動先をクリック`;renderEventButtons();};
      box.appendChild(b);
    }
  }

  function placeEvent(c) {
    if(!eventMode)return false;
    events[eventMode]={...(events[eventMode]||{}),x:c.x,y:c.y};
    state.collision[c.i]=0;
    eventMode=null; $("#modeText").textContent=""; renderEventButtons(); draw(); pushHistory(); setStatus("イベント位置を移動しました");
    return true;
  }

  async function pack() {
    return {
      version:8,mapId,name:MAPS[mapId].name,width:W,height:H,tileSize:TILE,
      source:{editor:"Spell Operator Map Editor",palettes:[...new Set(usedPaletteIds())]},
      renderedMap:await finalRenderedMap(),layers:deep(state.layers),collision:deep(state.collision),
      events:deep(events),fixedEvents:deep(events),updatedAt:new Date().toISOString()
    };
  }

  function activateLocalDotart(dataUrl) {
    localStorage.setItem(dotartKey,dataUrl);
    invalidatePalette("dotart-room");
    activePaletteId="dotart-room";
    window.__spellSelectPalette?.("dotart-room");
    setStatus("女の子の部屋タイルセットを読み込みました");
  }

  for(const[id,c]of Object.entries(MAPS)){
    const o=document.createElement("option");o.value=id;o.textContent=c.name;$("#mapSelect").appendChild(o);
  }
  $("#mapSelect").onchange=e=>loadMap(e.target.value);
  $("#resizeMap").onclick=()=>resizeMap(+$("#mapWidth").value,+$("#mapHeight").value);

  $("#layerButtons").onclick=e=>{
    const b=e.target.closest("[data-layer]");if(!b)return;
    layer=b.dataset.layer;eventMode=null;$("#modeText").textContent="";
    document.querySelectorAll("#layerButtons button").forEach(x=>x.classList.toggle("active",x===b));
    renderEventButtons();draw();
  };

  paletteCanvas.oncontextmenu=e=>e.preventDefault();
  paletteCanvas.onpointerdown=e=>{
    if(e.button!==0)return;
    const c=paletteCellFromEvent(e);if(!c)return;
    paletteDragging=true;paletteDragStart=c;paletteSelection={x:c.x,y:c.y,w:1,h:1};updateSelectionOverlay();
    paletteCanvas.setPointerCapture?.(e.pointerId);
  };
  paletteCanvas.onpointermove=e=>{
    if(!paletteDragging||!paletteDragStart)return;
    const c=paletteCellFromEvent(e);if(!c)return;
    paletteSelection=normalizeSelection(paletteDragStart,c);updateSelectionOverlay();
  };
  paletteCanvas.onpointerup=e=>{
    if(!paletteDragging)return;
    const c=paletteCellFromEvent(e);if(c&&paletteDragStart)paletteSelection=normalizeSelection(paletteDragStart,c);
    paletteDragging=false;paletteDragStart=null;updateSelectionOverlay();
    setStatus(`${paletteSelection.w}×${paletteSelection.h} チップを選択`);
  };

  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onpointerdown=e=>{
    const c=cellFromMapEvent(e);if(!c)return;
    if(placeEvent(c))return;
    if(e.shiftKey){eyedropAt(c);return;}
    mapPainting=true;mapErase=e.button===2;lastMapCell=`${c.x},${c.y}`;changed=stampAt(c.x,c.y,mapErase);
    if(changed)draw();canvas.setPointerCapture?.(e.pointerId);
  };
  canvas.onpointermove=e=>{
    const c=cellFromMapEvent(e);$("#cellPos").textContent=c?`${c.x},${c.y}`:"—";
    if(!mapPainting||!c)return;
    const key=`${c.x},${c.y}`;if(key===lastMapCell)return;lastMapCell=key;
    if(stampAt(c.x,c.y,mapErase)){changed=true;draw();}
  };
  window.addEventListener("pointerup",()=>{
    if(mapPainting&&changed)pushHistory();
    mapPainting=false;lastMapCell=null;changed=false;
  });

  $("#tilesetFile").onchange=e=>{
    const f=e.target.files?.[0];if(!f)return;
    const reader=new FileReader();reader.onload=()=>activateLocalDotart(reader.result);reader.readAsDataURL(f);
  };

  $("#undo").onclick=()=>restoreHistory(historyIndex-1);
  $("#redo").onclick=()=>restoreHistory(historyIndex+1);
  $("#clearLayer").onclick=()=>{
    if(layer==="collision")state.collision=empty(0);
    else state.layers[layer]=empty(null);
    draw();pushHistory();
  };
  $("#cancelEvent").onclick=()=>{eventMode=null;$("#modeText").textContent="";renderEventButtons();};
  $("#saveDraft").onclick=()=>saveDraft(true);
  $("#applyGame").onclick=async()=>{
    setStatus("プレビュー用マップを生成中…");
    try{
      const d=await pack();
      localStorage.setItem(gameKey(mapId),JSON.stringify(d));
      saveDraft(false);
      setStatus(`${MAPS[mapId].name} をプレビューへ反映しました`);
    }catch(err){console.error(err);alert("プレビュー画像を生成できませんでした。外部素材の読み込み状態を確認してください。");setStatus("プレビュー生成に失敗");}
  };
  $("#openGame").onclick=()=>window.open("../?mapedit=1&v=103","_blank");
  $("#removeOverride").onclick=()=>{localStorage.removeItem(gameKey(mapId));setStatus("プレビュー反映を解除しました");};
  $("#exportJson").onclick=async()=>{
    const d=await pack();
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));a.download=`${mapId}-layout.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
  $("#importJson").onchange=e=>{
    const f=e.target.files?.[0];if(!f)return;
    const reader=new FileReader();
    reader.onload=async()=>{
      try{
        const d=JSON.parse(reader.result);const id=MAPS[d.mapId]?d.mapId:mapId;
        mapId=id;$("#mapSelect").value=id;migrateDraft(id,d);setCanvasSize();history=[];historyIndex=-1;pushHistory();renderEventButtons();await draw();setStatus("JSONを読み込みました");
      }catch(err){console.error(err);alert("JSONを読み込めませんでした");}
    };
    reader.readAsText(f);
  };
  $("#resetMap").onclick=()=>{localStorage.removeItem(draftKey(mapId));state=null;loadMap(mapId);};

  window.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){
      e.preventDefault();restoreHistory(e.shiftKey?historyIndex+1:historyIndex-1);
    }else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){
      e.preventDefault();restoreHistory(historyIndex+1);
    }
  });

  (async()=>{
    populatePaletteSets();
    if(localStorage.getItem(dotartKey)) window.__spellSelectPalette?.("dotart-room");
    await loadMap("house2");
  })();
})();