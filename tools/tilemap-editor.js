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
    stairs: { label: "S 階段", mark: "S", color: "rgba(233,196,93,.9)", fallback: { x: 10, y: 7 } },
    playerStart: { label: "A ソフィー開始", mark: "A", color: "rgba(240,128,170,.9)", fallback: { x: 10, y: 6, facing: "up" } },
    followerStart: { label: "B ルミエル開始", mark: "B", color: "rgba(130,210,150,.9)", fallback: { x: 10, y: 7, facing: "up" } }
  };
  const SOURCE = { site: "ドット絵世界", page: "https://yms.main.jp/dotartworld/page2/tile-rooms01.html", credit: "ドット絵世界 / http://yms.main.jp", asset: "女の子用の部屋" };
  const $ = s => document.querySelector(s);
  const canvas = $("#mapCanvas"), ctx = canvas.getContext("2d");
  const palette = $("#paletteCanvas"), pctx = palette.getContext("2d", { willReadFrequently: true });
  const cursor = $("#paletteCursor");
  const imageCache = new Map();
  const draftKey = id => `spell-operator-tilemap-editor:${id}`;
  const gameKey = id => `spell-operator-tilemap:${id}`;
  const tileKey = "spell-operator-editor-tileset:dotartworld-room-girl";

  let mapId = "house2", W = 12, H = 9;
  let state = null, events = {}, tileset = null, selectedTile = -1, layer = "base", eventMode = null;
  let history = [], historyIndex = -1, painting = false, lastCell = -1, changed = false;

  const deep = v => JSON.parse(JSON.stringify(v));
  const validDim = (v, fallback, max) => Number.isInteger(Number(v)) && Number(v) >= 4 && Number(v) <= max ? Number(v) : fallback;
  const empty = fill => Array(W * H).fill(fill);
  const blankState = () => ({ layers: { base: empty(-1), object: empty(-1), upper: empty(-1) }, collision: empty(0) });
  const setStatus = text => $("#status").textContent = text;

  function image(url) {
    if (!url) return Promise.resolve(null);
    if (imageCache.has(url)) return imageCache.get(url);
    const p = new Promise(resolve => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = url;
    });
    imageCache.set(url, p);
    return p;
  }

  function fitArray(src, fill) {
    const out = Array(W * H).fill(fill);
    if (Array.isArray(src)) for (let i = 0; i < Math.min(src.length, out.length); i++) out[i] = src[i];
    return out;
  }

  function currentCollision(id) {
    const c = MAPS[id], a = Array(c.w * c.h).fill(0);
    for (let x = 0; x < c.w; x++) { a[x] = 1; a[(c.h - 1) * c.w + x] = 1; }
    for (let y = 1; y < c.h - 1; y++) { a[y * c.w] = 1; a[y * c.w + c.w - 1] = 1; }
    const rect = (x1, y1, x2, y2) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) a[y * c.w + x] = 1; };
    if (id === "town") [[1,1,5,3],[11,1,15,3],[15,7,18,9],[10,10,12,11],[1,6,4,8],[6,1,9,3]].forEach(r => rect(...r));
    if (id === "school") [[2,3,4,3],[6,3,8,3],[10,3,12,3],[2,6,4,6],[6,6,8,6],[10,6,12,6]].forEach(r => rect(...r));
    if (id === "library") [[2,2,5,3],[10,2,13,3],[2,7,5,8],[10,7,13,8]].forEach(r => rect(...r));
    if (id === "house1") [[1,1,4,2],[2,4,4,5],[6,3,8,3],[8,1,9,1]].forEach(r => rect(...r));
    if (id === "house2") [[1,1,3,3],[4,1,6,3],[8,1,10,2],[1,5,2,5],[9,4,10,5]].forEach(r => rect(...r));
    return a;
  }

  function defaults(id) {
    const c = MAPS[id]; W = c.w; H = c.h;
    const s = blankState(); s.collision = currentCollision(id);
    const ev = {};
    if (id === "house2") Object.entries(EVENTS).forEach(([k, v]) => ev[k] = deep(v.fallback));
    return { state: s, events: ev };
  }

  function migrateDraft(id, raw) {
    if (!raw || typeof raw !== "object") return null;
    const c = MAPS[id];
    W = validDim(raw.W ?? raw.width, c.w, 160);
    H = validDim(raw.H ?? raw.height, c.h, 120);
    const src = raw.state || raw;
    const layers = src.layers || raw.layers || {};
    state = {
      layers: {
        base: fitArray(layers.base, -1),
        object: fitArray(layers.object, -1),
        upper: fitArray(layers.upper, -1)
      },
      collision: fitArray(src.collision ?? raw.collision, 0)
    };
    events = deep(raw.events || raw.fixedEvents || src.events || {});
    if (id === "house2") Object.entries(EVENTS).forEach(([k, v]) => events[k] ??= deep(v.fallback));
    return true;
  }

  function scale() { return W > 80 ? .5 : W > 40 ? 1 : 2; }
  function setCanvasSize() {
    canvas.width = W * TILE; canvas.height = H * TILE;
    const s = scale();
    canvas.style.width = `${W * TILE * s}px`; canvas.style.height = `${H * TILE * s}px`;
    $("#mapFrame").style.width = canvas.style.width; $("#mapFrame").style.height = canvas.style.height;
    $("#mapWidth").value = W; $("#mapHeight").value = H;
    $("#mapBadge").textContent = `${MAPS[mapId].name} ${W}×${H}`;
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
  function schoolKind(x,y){if(x===7&&y===11)return"door";if(y===0||x===0||x===15||y===11)return"wall";if(y===1&&x>=3&&x<=12)return"board";if((y===3||y===6)&&((x>=2&&x<=4)||(x>=6&&x<=8)||(x>=10&&x<=12)))return"desk";return"floor";}
  function libraryKind(x,y){if(x===7&&y===11)return"door";if(y===0||x===0||x===15||y===11)return"wall";if((y===2||y===3||y===7||y===8)&&((x>=2&&x<=5)||(x>=10&&x<=13)))return"books";if(y===5&&x>=6&&x<=9)return"table";return"floor";}
  const COLORS = {grass:"#79b95b",flower:"#85bd64",path:"#cfbb85",tree:"#36783c",water:"#6fb4d7",building:"#ddcfb4",door:"#6f4c35",roofSchool:"#7c5e91",roofHome:"#815c76",roofLibrary:"#567d97",roofParts:"#98684b",roofShop:"#598b70",wall:"#795f78",floor:"#d7c2a5",board:"#315b45",desk:"#a9784f",books:"#7a5541",table:"#aa815e"};

  function drawSimpleMap(target, id) {
    const c = MAPS[id], mw = Math.min(W, c.w), mh = Math.min(H, c.h);
    target.save(); target.fillStyle = "#222733"; target.fillRect(0,0,W*TILE,H*TILE);
    for (let y=0;y<mh;y++) for (let x=0;x<mw;x++) {
      const k = id === "town" ? townKind(x,y) : id === "school" ? schoolKind(x,y) : libraryKind(x,y);
      target.fillStyle = COLORS[k] || "#777"; target.fillRect(x*TILE,y*TILE,TILE,TILE);
      if (k === "tree") { target.fillStyle="#2d7b3d"; target.beginPath(); target.arc(x*TILE+16,y*TILE+13,11,0,Math.PI*2); target.fill(); }
      if (k === "water") { target.strokeStyle="#a2d4e8"; target.beginPath(); target.moveTo(x*TILE+3,y*TILE+12); target.lineTo(x*TILE+29,y*TILE+12); target.stroke(); }
    }
    target.restore();
  }

  function drawLaMer(target) {
    target.fillStyle="#416f48"; target.fillRect(0,0,W*TILE,H*TILE);
    const zoneW=36, zoneH=26;
    const rect=(x,y,w,h,color)=>{target.fillStyle=color;target.fillRect(x*TILE,y*TILE,w*TILE,h*TILE)};
    rect(zoneW*2,0,zoneW,zoneH,"#315e38"); rect(zoneW*2,zoneH,zoneW,zoneH,"#6f8760");
    rect(0,zoneH*2,zoneW,zoneH,"#71935e"); rect(zoneW,zoneH*2,zoneW,zoneH,"#b6ad91"); rect(zoneW*2,zoneH*2,zoneW,zoneH,"#859b70"); rect(zoneW*3,zoneH*2,zoneW,zoneH,"#71935e");
    rect(0,zoneH*3,zoneW,zoneH,"#d4bd77"); rect(zoneW,zoneH*3,zoneW,zoneH,"#748992"); rect(zoneW*2,zoneH*3,zoneW,zoneH,"#748992"); rect(zoneW*3,zoneH*3,zoneW,zoneH,"#64a9cf");
    target.fillStyle="#55545b"; target.fillRect(0,(zoneH*2+12)*TILE,W*TILE,4*TILE); target.fillRect((zoneW*2+23)*TILE,zoneH*2*TILE,2*TILE,zoneH*2*TILE);
    target.fillStyle="#8b6a4e"; for(const [zx,zy] of [[1,2],[2,2],[2,1]]) for(let i=0;i<5;i++) target.fillRect((zx*zoneW+4+i*6)*TILE,(zy*zoneH+4)*TILE,5*TILE,6*TILE);
  }

  async function drawBaseline(target) {
    const c = MAPS[mapId];
    target.clearRect(0,0,W*TILE,H*TILE);
    if (c.image) {
      target.fillStyle="#222733"; target.fillRect(0,0,W*TILE,H*TILE);
      const im = await image(c.image);
      if (im) target.drawImage(im,0,0,Math.min(W,c.w)*TILE,Math.min(H,c.h)*TILE);
      return;
    }
    if (mapId === "la_mer_city") drawLaMer(target); else drawSimpleMap(target,mapId);
  }

  function drawTile(target, idx, dx, dy) {
    if (!tileset || idx < 0) return;
    const cols = Math.floor(tileset.width / TILE), sx = (idx % cols) * TILE, sy = Math.floor(idx / cols) * TILE;
    target.drawImage(tileset,sx,sy,TILE,TILE,dx,dy,TILE,TILE);
  }
  function drawEdits(target) { for (const l of ["base","object","upper"]) state.layers[l].forEach((t,i)=>drawTile(target,t,(i%W)*TILE,Math.floor(i/W)*TILE)); }
  function marker(p, text, color) { if(!p||p.x<0||p.y<0||p.x>=W||p.y>=H)return; const x=p.x*TILE,y=p.y*TILE;ctx.fillStyle=color;ctx.fillRect(x+5,y+5,TILE-10,TILE-10);ctx.fillStyle="#111";ctx.font="bold 14px monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(text,x+TILE/2,y+TILE/2); }

  async function draw() {
    await drawBaseline(ctx);
    drawEdits(ctx);
    if (layer === "collision") state.collision.forEach((v,i)=>{if(v){ctx.fillStyle="rgba(216,68,85,.34)";ctx.fillRect((i%W)*TILE,Math.floor(i/W)*TILE,TILE,TILE)}});
    ctx.strokeStyle="rgba(255,255,255,.23)"; ctx.lineWidth=1;
    for(let x=0;x<=W*TILE;x+=TILE){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,H*TILE);ctx.stroke();}
    for(let y=0;y<=H*TILE;y+=TILE){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(W*TILE,y+.5);ctx.stroke();}
    if(mapId==="house2")Object.entries(EVENTS).forEach(([k,v])=>marker(events[k]||v.fallback,v.mark,v.color));
  }

  async function composeFinal() { const c=document.createElement("canvas");c.width=W*TILE;c.height=H*TILE;const x=c.getContext("2d");await drawBaseline(x);drawEdits(x);return c; }

  function snapshot(){return{W,H,state:deep(state),events:deep(events)}}
  function push(){history=history.slice(0,historyIndex+1);history.push(snapshot());if(history.length>80)history.shift();historyIndex=history.length-1;syncUndo();}
  function syncUndo(){$("#undo").disabled=historyIndex<=0;$("#redo").disabled=historyIndex>=history.length-1;}
  function restore(i){if(i<0||i>=history.length)return;historyIndex=i;const s=history[i];W=s.W;H=s.H;state=deep(s.state);events=deep(s.events);setCanvasSize();draw();renderEventButtons();syncUndo();}

  function saveDraft(show=false){if(!state)return;localStorage.setItem(draftKey(mapId),JSON.stringify({version:7,W,H,state,events}));if(show)setStatus("編集状態を保存しました");}
  async function loadMap(id){if(state)saveDraft(false);mapId=id;eventMode=null;$("#mapSelect").value=id;let raw=null;try{raw=JSON.parse(localStorage.getItem(draftKey(id)))}catch{}
    if(!migrateDraft(id,raw)){const d=defaults(id);state=d.state;events=d.events;}
    setCanvasSize();history=[];historyIndex=-1;push();await draw();renderEventButtons();setStatus(`${MAPS[id].name} を編集中`);
    if(raw && (raw.W==null || raw.H==null)){saveDraft(false);setStatus(`${MAPS[id].name}: 古い編集データを自動修復しました`);}
  }

  function resize(nw,nh){nw=validDim(Math.trunc(nw),W,160);nh=validDim(Math.trunc(nh),H,120);if(nw===W&&nh===H)return;const ow=W,oh=H,old=deep(state);W=nw;H=nh;const n=blankState();for(let y=0;y<Math.min(oh,H);y++)for(let x=0;x<Math.min(ow,W);x++){const oi=y*ow+x,ni=y*W+x;for(const l of["base","object","upper"])n.layers[l][ni]=old.layers[l][oi];n.collision[ni]=old.collision[oi];}state=n;for(const e of Object.values(events)){e.x=Math.min(W-1,e.x);e.y=Math.min(H-1,e.y)}setCanvasSize();draw();push();}

  function prepareTileset(im){const c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext("2d",{willReadFrequently:true});x.drawImage(im,0,0);try{const d=x.getImageData(0,0,c.width,c.height),p=d.data;let alpha=false;for(let i=3;i<p.length;i+=4)if(p[i]<255){alpha=true;break}if(!alpha){const r=p[0],g=p[1],b=p[2];for(let i=0;i<p.length;i+=4)if(p[i]===r&&p[i+1]===g&&p[i+2]===b)p[i+3]=0;x.putImageData(d,0,0)}}catch{}tileset=c;palette.width=c.width;palette.height=c.height;$("#paletteStage").style.width=c.width+"px";$("#paletteStage").style.minHeight=c.height+"px";drawPalette();$("#tilesetInfo").textContent=`${c.width}×${c.height}px`;draw();}
  function loadTileset(url,persist=true){const im=new Image();im.onload=()=>{prepareTileset(im);if(persist)localStorage.setItem(tileKey,url)};im.src=url;}
  function drawPalette(){pctx.clearRect(0,0,palette.width,palette.height);if(tileset)pctx.drawImage(tileset,0,0);pctx.strokeStyle="rgba(255,255,255,.18)";for(let x=0;x<=palette.width;x+=TILE){pctx.beginPath();pctx.moveTo(x+.5,0);pctx.lineTo(x+.5,palette.height);pctx.stroke()}for(let y=0;y<=palette.height;y+=TILE){pctx.beginPath();pctx.moveTo(0,y+.5);pctx.lineTo(palette.width,y+.5);pctx.stroke()}}
  function syncCursor(){if(selectedTile<0||!tileset){cursor.style.display="none";$("#tileIndex").textContent="—";return}const cols=Math.floor(tileset.width/TILE);cursor.style.display="block";cursor.style.left=(selectedTile%cols)*TILE+"px";cursor.style.top=Math.floor(selectedTile/cols)*TILE+"px";$("#tileIndex").textContent=selectedTile;}

  function cell(e){const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*canvas.width/r.width/TILE),y=Math.floor((e.clientY-r.top)*canvas.height/r.height/TILE);return x>=0&&y>=0&&x<W&&y<H?{x,y,i:y*W+x}:null;}
  function paint(c,erase=false,eye=false){if(eventMode){events[eventMode]={...(events[eventMode]||{}),x:c.x,y:c.y};state.collision[c.i]=0;eventMode=null;renderEventButtons();draw();push();return}if(eye&&layer!=="collision"){selectedTile=state.layers[layer][c.i];syncCursor();return}if(layer==="collision"){state.collision[c.i]=erase?0:(state.collision[c.i]?0:1);changed=true}else{if(!tileset){setStatus("先にタイルセットPNGを読み込んでください");return}const a=state.layers[layer],v=erase?-1:selectedTile;if(a[c.i]!==v){a[c.i]=v;changed=true}}draw();}

  function renderEventButtons(){const box=$("#eventButtons"),help=$("#eventHelp");box.innerHTML="";if(mapId!=="house2"){help.textContent="このマップはタイル・サイズ・当たり判定を編集できます。";$("#cancelEvent").disabled=true;return}help.textContent="移動したいイベントを押してから、移動先のマスをクリック。";$("#cancelEvent").disabled=false;Object.entries(EVENTS).forEach(([k,v])=>{const b=document.createElement("button"),p=events[k]||v.fallback;b.className="event-btn"+(eventMode===k?" active":"");b.textContent=`${v.label} (${p.x},${p.y})`;b.onclick=()=>{eventMode=k;$("#modeText").textContent=`${v.label} の移動先をクリック`;renderEventButtons()};box.appendChild(b)});}

  async function pack(){const final=await composeFinal();return{version:7,mapId,name:MAPS[mapId].name,width:W,height:H,tileSize:TILE,source:SOURCE,renderedMap:final.toDataURL("image/png"),layers:state.layers,collision:state.collision,events:deep(events),fixedEvents:deep(events),updatedAt:new Date().toISOString()};}

  Object.entries(MAPS).forEach(([id,c])=>{const o=document.createElement("option");o.value=id;o.textContent=c.name;$("#mapSelect").appendChild(o)});
  $("#mapSelect").onchange=e=>loadMap(e.target.value);
  $("#resizeMap").onclick=()=>resize(+$("#mapWidth").value,+$("#mapHeight").value);
  $("#layerButtons").onclick=e=>{const b=e.target.closest("[data-layer]");if(!b)return;layer=b.dataset.layer;eventMode=null;document.querySelectorAll("#layerButtons button").forEach(x=>x.classList.toggle("active",x===b));renderEventButtons();draw();};
  palette.onclick=e=>{if(!tileset)return;const r=palette.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*palette.width/r.width/TILE),y=Math.floor((e.clientY-r.top)*palette.height/r.height/TILE);selectedTile=y*Math.floor(palette.width/TILE)+x;syncCursor();};
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.onpointerdown=e=>{const c=cell(e);if(!c)return;painting=true;lastCell=c.i;changed=false;paint(c,e.button===2,e.shiftKey);canvas.setPointerCapture?.(e.pointerId)};
  canvas.onpointermove=e=>{const c=cell(e);$("#cellPos").textContent=c?`${c.x},${c.y}`:"—";if(!painting||!c||c.i===lastCell||e.shiftKey||eventMode)return;lastCell=c.i;if(layer!=="collision")paint(c,(e.buttons&2)!==0,false)};
  window.onpointerup=()=>{if(painting&&changed)push();painting=false;lastCell=-1;changed=false;};
  $("#tilesetFile").onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>loadTileset(r.result,true);r.readAsDataURL(f)};
  $("#undo").onclick=()=>restore(historyIndex-1); $("#redo").onclick=()=>restore(historyIndex+1);
  $("#clearLayer").onclick=()=>{if(layer==="collision")state.collision=empty(0);else state.layers[layer]=empty(-1);draw();push();};
  $("#cancelEvent").onclick=()=>{eventMode=null;$("#modeText").textContent="";renderEventButtons();};
  $("#saveDraft").onclick=()=>saveDraft(true);
  $("#applyGame").onclick=async()=>{setStatus("ゲーム反映用データを作成中…");const d=await pack();localStorage.setItem(gameKey(mapId),JSON.stringify(d));saveDraft(false);setStatus(`${MAPS[mapId].name} をゲームへ反映しました`);};
  $("#openGame").onclick=()=>window.open("../?mapedit=1&v=103","_blank");
  $("#removeOverride").onclick=()=>{localStorage.removeItem(gameKey(mapId));setStatus("このマップのゲーム反映を解除しました")};
  $("#exportJson").onclick=async()=>{const d=await pack(),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));a.download=`${mapId}-layout.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
  $("#importJson").onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{const d=JSON.parse(r.result),id=MAPS[d.mapId]?d.mapId:mapId;mapId=id;$("#mapSelect").value=id;migrateDraft(id,d);setCanvasSize();history=[];historyIndex=-1;push();await draw();renderEventButtons();saveDraft(false);}catch{alert("JSONを読み込めませんでした")}};r.readAsText(f)};
  $("#resetMap").onclick=()=>{localStorage.removeItem(draftKey(mapId));loadMap(mapId)};
  window.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();restore(e.shiftKey?historyIndex+1:historyIndex-1)}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();restore(historyIndex+1)}});

  const savedTileset=localStorage.getItem(tileKey); if(savedTileset)loadTileset(savedTileset,false); else drawPalette();
  loadMap("house2");
})();
