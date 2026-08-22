(() => {
  "use strict";

  const TILE = 32;
  const MAPS = {
    town:{name:"フルール村",w:20,h:14}, school:{name:"学校",w:16,h:12}, library:{name:"ピジブルの図書館",w:16,h:12},
    house1:{name:"ソフィーの家 1F",w:11,h:9,image:"../assets/maps/sophie_house_1f_tilemap.png?v=1"},
    house2:{name:"ソフィーとルミエルの部屋",w:12,h:9,image:"../assets/maps/sophie_house_2f_tilemap.png?v=1"},
    la_mer_city:{name:"ラメールシティ",w:144,h:104}
  };
  const EVENTS = {
    pc:{label:"P PC",mark:"P",color:"rgba(95,215,229,.88)",fallback:{x:9,y:2}},
    stairs:{label:"S 階段",mark:"S",color:"rgba(233,196,93,.90)",fallback:{x:10,y:7}},
    playerStart:{label:"A ソフィー開始",mark:"A",color:"rgba(240,128,170,.90)",fallback:{x:10,y:6,facing:"up"}},
    followerStart:{label:"B ルミエル開始",mark:"B",color:"rgba(130,210,150,.90)",fallback:{x:10,y:7,facing:"up"}}
  };

  const PIPO_ROOT = "https://raw.githubusercontent.com/eil941/rpg-a/main/assets/%E3%81%B4%E3%81%BD%E3%82%84/map/%E3%82%A6%E3%83%87%E3%82%A3%E3%82%BF2_32x32mapchip_20210215/MapChip/";
  const pipoUrl = filename => PIPO_ROOT + encodeURIComponent(filename);
  const LA_MER_ATLAS = "../assets/tiles/la_mer_ai_pack.svg?v=2";
  const PALETTES = [
    {id:"dotart-room",set:"ドット絵世界",type:"部屋",variant:"女の子の部屋（ローカル）",local:true},
    {id:"pipoya-base",set:"Pipoya FREE RPG Tileset 32x32",type:"基本・家具/建物",variant:"BaseChip",url:pipoUrl("[Base]BaseChip_pipo.png")},
    ...[1,2,3,4].map(n=>({id:`pipoya-grass${n}`,set:"Pipoya FREE RPG Tileset 32x32",type:"草地",variant:`Grass${n}`,url:pipoUrl(`[A]Grass${n}_pipo.png`)})),
    ...[1,2,3,4].map(n=>({id:`pipoya-dirt${n}`,set:"Pipoya FREE RPG Tileset 32x32",type:"土・道",variant:`Dirt${n}`,url:pipoUrl(`[A]Dirt${n}_pipo.png`)})),
    ...[1,2,3,4,5,6,7].map(n=>({id:`pipoya-water${n}`,set:"Pipoya FREE RPG Tileset 32x32",type:"水",variant:`Water${n}`,url:pipoUrl(`[A]Water${n}_pipo.png`)})),
    ...[1,2].map(n=>({id:`pipoya-wall${n}`,set:"Pipoya FREE RPG Tileset 32x32",type:"壁",variant:`Wall-Up${n}`,url:pipoUrl(`[A]Wall-Up${n}_pipo.png`)})),
    {id:"pipoya-flower",set:"Pipoya FREE RPG Tileset 32x32",type:"装飾",variant:"Flower",url:pipoUrl("[A]Flower_pipo.png")},
    {id:"pipoya-longgrass",set:"Pipoya FREE RPG Tileset 32x32",type:"装飾",variant:"LongGrass",url:pipoUrl("[A]LongGrass_pipo.png")},
    {id:"lamer-ground",set:"ラメールシティ AI加工素材",type:"地面",variant:"白石畳 3×3",url:LA_MER_ATLAS,region:{x:0,y:0,w:3,h:3},stamp:{w:3,h:3}},
    {id:"lamer-bridge",set:"ラメールシティ AI加工素材",type:"橋",variant:"石橋 8×4",url:LA_MER_ATLAS,region:{x:4,y:0,w:8,h:4},stamp:{w:8,h:4}},
    {id:"lamer-landmark",set:"ラメールシティ AI加工素材",type:"建物",variant:"港ランドマーク 9×9",url:LA_MER_ATLAS,region:{x:0,y:4,w:9,h:9},stamp:{w:9,h:9}},
    {id:"lamer-house-a",set:"ラメールシティ AI加工素材",type:"建物",variant:"青屋根建物A 7×9",url:LA_MER_ATLAS,region:{x:10,y:4,w:7,h:9},stamp:{w:7,h:9}},
    {id:"lamer-house-b",set:"ラメールシティ AI加工素材",type:"建物",variant:"青屋根建物B 7×8",url:LA_MER_ATLAS,region:{x:18,y:4,w:7,h:8},stamp:{w:7,h:8}},
    {id:"lamer-boat",set:"ラメールシティ AI加工素材",type:"港",variant:"ボート 9×4",url:LA_MER_ATLAS,region:{x:0,y:14,w:9,h:4},stamp:{w:9,h:4}},
    {id:"lamer-market-blue",set:"ラメールシティ AI加工素材",type:"市場",variant:"青白テント 6×4",url:LA_MER_ATLAS,region:{x:10,y:14,w:6,h:4},stamp:{w:6,h:4}},
    {id:"lamer-market-white",set:"ラメールシティ AI加工素材",type:"市場",variant:"白テント 6×4",url:LA_MER_ATLAS,region:{x:17,y:14,w:6,h:4},stamp:{w:6,h:4}},
    {id:"lamer-lamp",set:"ラメールシティ AI加工素材",type:"小物",variant:"街灯 2×5",url:LA_MER_ATLAS,region:{x:24,y:14,w:2,h:5},stamp:{w:2,h:5}},
    {id:"lamer-props",set:"ラメールシティ AI加工素材",type:"小物",variant:"樽・植木 6×6",url:LA_MER_ATLAS,region:{x:26,y:14,w:6,h:6}}
  ];
  const BY_ID = new Map(PALETTES.map(p=>[p.id,p]));

  const $=s=>document.querySelector(s);
  const canvas=$("#mapCanvas"),ctx=canvas.getContext("2d"),pal=$("#paletteCanvas"),pctx=pal.getContext("2d"),cursor=$("#paletteCursor"),frame=$("#mapFrame"),stage=$("#paletteStage");
  const draftKey=id=>`spell-operator-tilemap-editor:${id}`, gameKey=id=>`spell-operator-tilemap:${id}`, dotartKey="spell-operator-editor-tileset:dotartworld-room-girl";
  const images=new Map();
  let mapId="house2",W=12,H=9,state=null,events={},layer="base",eventMode=null;
  let activePaletteId="pipoya-base",selection={x:0,y:0,w:1,h:1},palStart=null,palDrag=false,mapDrag=false,mapErase=false,lastCell="",changed=false;
  let history=[],historyIndex=-1,drawSerial=0;
  const deep=v=>JSON.parse(JSON.stringify(v)), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const empty=v=>Array(W*H).fill(v), blank=()=>({layers:{base:empty(null),object:empty(null),upper:empty(null)},collision:empty(0)});
  const status=t=>$("#status").textContent=t;

  function validDim(v,f,max){const n=Number(v);return Number.isInteger(n)&&n>=4&&n<=max?n:f;}
  function oldRef(v){return Number.isInteger(v)&&v>=0?{p:"dotart-room",x:v%8,y:Math.floor(v/8)}:null;}
  function ref(v){if(v===null||v===undefined)return null;if(typeof v==="number")return oldRef(v);if(typeof v!=="object")return null;const p=String(v.p||v.palette||""),x=Number(v.x),y=Number(v.y);return p&&Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0?{p,x,y}:null;}
  function fitRefs(a){const o=empty(null);if(Array.isArray(a))for(let i=0;i<Math.min(a.length,o.length);i++)o[i]=ref(a[i]);return o;}
  function fitCol(a){const o=empty(0);if(Array.isArray(a))for(let i=0;i<Math.min(a.length,o.length);i++)o[i]=a[i]?1:0;return o;}

  function inRect(x,y,x1,y1,x2,y2){return x>=x1&&x<=x2&&y>=y1&&y<=y2;}
  function laMerSolid(x,y){
    const ZW=36,ZH=26,col=Math.floor(x/ZW),row=Math.floor(y/ZH),lx=x%ZW,ly=y%ZH;
    if(row===0&&col===2)return !(ly>=5&&ly<=8&&lx>=9&&lx<=26)&&!(ly>=9&&ly<=24&&lx>=17&&lx<=18)&&!(ly===25&&lx>=17&&lx<=19);
    if(row===1&&col===2){if(ly===1||ly===2)return lx<17||lx>19;const b=[[3,3,8,7],[12,3,15,7],[23,3,28,7],[4,10,10,16],[24,10,30,16],[6,19,12,22]];return b.some(r=>inRect(lx,ly,...r));}
    if(row===2&&col===1){const shops=[[3,4,8,10],[10,4,15,10],[17,4,22,10],[24,4,29,10],[4,18,12,23],[22,18,31,23]];return shops.some(r=>inRect(lx,ly,...r));}
    if(row===2&&col===2){return inRect(lx,ly,2,3,9,9)||inRect(lx,ly,27,3,33,10)||inRect(lx,ly,2,18,10,23)||inRect(lx,ly,28,18,33,23)||inRect(lx,ly,15,10,20,14);}
    if(row===3&&(col===1||col===2)){const pier=(lx>=5&&lx<=7&&ly>=13&&ly<=19)||(lx>=17&&lx<=19&&ly>=13&&ly<=22)||(lx>=29&&lx<=31&&ly>=13&&ly<=19);if(pier)return false;if(ly>=15)return true;return inRect(lx,ly,3,8,8,14)||inRect(lx,ly,14,8,21,14)||inRect(lx,ly,26,8,32,14);}
    if(row===3&&col===3)return true;
    if(row===3&&col===0)return ly>=19||ly<=7||(ly===8&&lx<=8);
    if((row===0||row===1)&&col!==2)return true;
    return false;
  }
  function collision(id){
    const c=MAPS[id],a=Array(c.w*c.h).fill(0);for(let x=0;x<c.w;x++){a[x]=1;a[(c.h-1)*c.w+x]=1;}for(let y=1;y<c.h-1;y++){a[y*c.w]=1;a[y*c.w+c.w-1]=1;}
    const r=(x1,y1,x2,y2)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)a[y*c.w+x]=1;};
    if(id==="town")[[1,1,5,3],[11,1,15,3],[15,7,18,9],[10,10,12,11],[1,6,4,8],[6,1,9,3]].forEach(x=>r(...x));
    if(id==="school")[[2,3,4,3],[6,3,8,3],[10,3,12,3],[2,6,4,6],[6,6,8,6],[10,6,12,6]].forEach(x=>r(...x));
    if(id==="library")[[2,2,5,3],[10,2,13,3],[2,7,5,8],[10,7,13,8]].forEach(x=>r(...x));
    if(id==="house1")[[1,1,4,2],[2,4,4,5],[6,3,8,3],[8,1,9,1]].forEach(x=>r(...x));
    if(id==="house2")[[1,1,3,3],[4,1,6,3],[8,1,10,2],[1,5,2,5],[9,4,10,5]].forEach(x=>r(...x));
    if(id==="la_mer_city")for(let y=0;y<c.h;y++)for(let x=0;x<c.w;x++)a[y*c.w+x]=laMerSolid(x,y)?1:0;
    return a;
  }
  function putStamp(arr,p,x,y,w,h){for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){const tx=x+dx,ty=y+dy;if(tx>=0&&ty>=0&&tx<W&&ty<H)arr[ty*W+tx]={p,x:dx,y:dy};}}
  function seedLaMer(){
    if(mapId!=="la_mer_city")return;
    const ids=new Set(state.layers.object.filter(Boolean).map(v=>v.p));if([...ids].some(id=>id.startsWith("lamer-")))return;
    putStamp(state.layers.object,"lamer-house-b",74,55,7,8);putStamp(state.layers.object,"lamer-house-a",99,55,7,9);
    putStamp(state.layers.object,"lamer-market-blue",48,82,6,4);putStamp(state.layers.object,"lamer-market-white",92,82,6,4);
    putStamp(state.layers.object,"lamer-landmark",86,86,9,9);putStamp(state.layers.object,"lamer-boat",44,96,9,4);putStamp(state.layers.object,"lamer-boat",80,96,9,4);putStamp(state.layers.object,"lamer-bridge",60,94,8,4);
    putStamp(state.layers.upper,"lamer-lamp",56,83,2,5);putStamp(state.layers.upper,"lamer-lamp",100,83,2,5);
    [[39,79],[42,79],[75,79],[78,79]].forEach(([x,y])=>putStamp(state.layers.base,"lamer-ground",x,y,3,3));
  }
  function defaults(id){const c=MAPS[id];W=c.w;H=c.h;state=blank();state.collision=collision(id);events={};if(id==="house2")for(const[k,v]of Object.entries(EVENTS))events[k]=deep(v.fallback);mapId=id;seedLaMer();}
  function migrate(id,raw){if(!raw||typeof raw!=="object")return false;const c=MAPS[id];W=validDim(raw.W??raw.width,c.w,160);H=validDim(raw.H??raw.height,c.h,120);const s=raw.state||raw,L=s.layers||raw.layers||{};state={layers:{base:fitRefs(L.base),object:fitRefs(L.object),upper:fitRefs(L.upper)},collision:fitCol(s.collision??raw.collision)};events=deep(raw.events||raw.fixedEvents||s.events||{});if(id==="house2")for(const[k,v]of Object.entries(EVENTS))events[k]??=deep(v.fallback);mapId=id;seedLaMer();return true;}

  function scale(){return W>80?.5:W>40?1:2;}
  function sizeCanvas(){canvas.width=W*TILE;canvas.height=H*TILE;const s=scale();canvas.style.width=`${W*TILE*s}px`;canvas.style.height=`${H*TILE*s}px`;frame.style.width=canvas.style.width;frame.style.height=canvas.style.height;$("#mapWidth").value=W;$("#mapHeight").value=H;$("#mapBadge").textContent=`${MAPS[mapId].name} ${W}×${H}`;}
  function image(url){if(!url)return Promise.resolve(null);if(images.has(url))return images.get(url);const p=new Promise(r=>{const im=new Image();if(!url.startsWith("data:")&&!url.startsWith("../"))im.crossOrigin="anonymous";im.onload=()=>r(im);im.onerror=()=>r(null);im.src=url;});images.set(url,p);return p;}
  async function paletteImage(id){const d=BY_ID.get(id);if(!d)return null;let u=d.url;if(d.local)u=localStorage.getItem(dotartKey);return image(u);}

  function townKind(x,y){const path=(y===4&&x>=2&&x<=17)||(y===5&&x>=2&&x<=17)||(x===3&&y>=3&&y<=12)||(x===13&&y>=3&&y<=11)||(x===16&&y>=4&&y<=10)||(y===10&&x>=8&&x<=16)||(y===11&&x>=3&&x<=13);if(y===0||y===13||x===0||x===19)return"tree";if(x>=6&&x<=9&&y>=1&&y<=3)return"water";if(x>=1&&x<=5&&y>=1&&y<=3)return y===1?"roof":x===3&&y===3?"door":"building";if(x>=1&&x<=4&&y>=6&&y<=8)return y===6?"roof":x===2&&y===8?"door":"building";if(x>=11&&x<=15&&y>=1&&y<=3)return y===1?"roof":x===13&&y===3?"door":"building";return path?"path":((x+y)%9===0?"flower":"grass");}
  const C={tree:"#347840",water:"#278fc0",roof:"#5b7193",door:"#65452e",building:"#d8c9ae",path:"#c6b17d",flower:"#87bd65",grass:"#77b85c",wall:"#745f73",floor:"#d7c2a5",desk:"#9b734f",books:"#79513d"};
  function simple(target,id){target.fillStyle="#222733";target.fillRect(0,0,W*TILE,H*TILE);for(let y=0;y<Math.min(H,MAPS[id].h);y++)for(let x=0;x<Math.min(W,MAPS[id].w);x++){let k="floor";if(id==="town")k=townKind(x,y);else if(id==="school")k=(y===0||x===0||x===15||y===11)?"wall":((y===3||y===6)&&([2,3,4,6,7,8,10,11,12].includes(x))?"desk":"floor");else k=(y===0||x===0||x===15||y===11)?"wall":(((y===2||y===3||y===7||y===8)&&(x<=5||x>=10))?"books":"floor");target.fillStyle=C[k]||"#888";target.fillRect(x*TILE,y*TILE,TILE,TILE);}}
  function laMer(target){const ZW=36,ZH=26;target.fillStyle="#416f48";target.fillRect(0,0,W*TILE,H*TILE);const r=(x,y,w,h,c)=>{target.fillStyle=c;target.fillRect(x*TILE,y*TILE,w*TILE,h*TILE);};r(ZW*2,0,ZW,ZH,"#315e38");r(ZW*2,ZH,ZW,ZH,"#6f8760");r(0,ZH*2,ZW,ZH,"#71935e");r(ZW,ZH*2,ZW,ZH,"#b6ad91");r(ZW*2,ZH*2,ZW,ZH,"#859b70");r(ZW*3,ZH*2,ZW,ZH,"#71935e");r(0,ZH*3,ZW,ZH,"#d4bd77");r(ZW,ZH*3,ZW,ZH,"#748992");r(ZW*2,ZH*3,ZW,ZH,"#748992");r(ZW*3,ZH*3,ZW,ZH,"#1686bb");target.fillStyle="#55545b";target.fillRect(0,(ZH*2+12)*TILE,W*TILE,4*TILE);target.fillRect((ZW*2+23)*TILE,ZH*2*TILE,2*TILE,ZH*2*TILE);}
  async function baseline(t){t.clearRect(0,0,W*TILE,H*TILE);const c=MAPS[mapId];if(c.image){t.fillStyle="#222733";t.fillRect(0,0,W*TILE,H*TILE);const im=await image(c.image);if(im)t.drawImage(im,0,0,Math.min(W,c.w)*TILE,Math.min(H,c.h)*TILE);return;}mapId==="la_mer_city"?laMer(t):simple(t,mapId);}
  async function tileRef(t,r,dx,dy){if(!r?.p)return;const d=BY_ID.get(r.p),im=await paletteImage(r.p);if(!d||!im)return;const o=d.region||{x:0,y:0},sx=(o.x+r.x)*TILE,sy=(o.y+r.y)*TILE;if(sx>=im.naturalWidth||sy>=im.naturalHeight)return;t.drawImage(im,sx,sy,TILE,TILE,dx,dy,TILE,TILE);}
  async function edits(t){for(const l of["base","object","upper"]){const a=state.layers[l];for(let i=0;i<a.length;i++)if(a[i])await tileRef(t,a[i],(i%W)*TILE,Math.floor(i/W)*TILE);}}
  function marker(t,p,txt,col){if(!p||p.x<0||p.y<0||p.x>=W||p.y>=H)return;const x=p.x*TILE,y=p.y*TILE;t.fillStyle=col;t.fillRect(x+5,y+5,22,22);t.fillStyle="#111";t.font="bold 14px monospace";t.textAlign="center";t.textBaseline="middle";t.fillText(txt,x+16,y+16);}
  async function draw(){const n=++drawSerial;await baseline(ctx);if(n!==drawSerial)return;await edits(ctx);if(n!==drawSerial)return;if(layer==="collision")state.collision.forEach((v,i)=>{if(v){ctx.fillStyle="rgba(216,68,85,.34)";ctx.fillRect((i%W)*TILE,Math.floor(i/W)*TILE,TILE,TILE);}});ctx.strokeStyle="rgba(255,255,255,.18)";ctx.lineWidth=1;for(let x=0;x<=W*TILE;x+=TILE){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,H*TILE);ctx.stroke();}for(let y=0;y<=H*TILE;y+=TILE){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(W*TILE,y+.5);ctx.stroke();}if(mapId==="house2")for(const[k,v]of Object.entries(EVENTS))marker(ctx,events[k],v.mark,v.color);}
  async function rendered(){const c=document.createElement("canvas");c.width=W*TILE;c.height=H*TILE;const x=c.getContext("2d");await baseline(x);await edits(x);return c.toDataURL("image/png");}

  async function renderPalette(){const d=BY_ID.get(activePaletteId),im=await paletteImage(activePaletteId);$("#paletteName").textContent=d?`${d.set} / ${d.type} / ${d.variant}`:"";if(!im){pal.width=256;pal.height=32;stage.style.width="256px";stage.style.minHeight="32px";pctx.fillStyle="#10131b";pctx.fillRect(0,0,256,32);pctx.fillStyle="#c9cfe0";pctx.font="11px monospace";pctx.fillText("ローカル素材を読み込んでください",8,20);$("#tilesetInfo").textContent=d?.local?"未読込":"読込失敗";selection={x:0,y:0,w:1,h:1};selOverlay();return;}
    const rg=d.region||{x:0,y:0,w:Math.floor(im.naturalWidth/TILE),h:Math.floor(im.naturalHeight/TILE)},w=rg.w*TILE,h=rg.h*TILE;pal.width=Math.max(TILE,w);pal.height=Math.max(TILE,h);stage.style.width=`${pal.width}px`;stage.style.minHeight=`${pal.height}px`;pctx.clearRect(0,0,pal.width,pal.height);pctx.drawImage(im,rg.x*TILE,rg.y*TILE,w,h,0,0,w,h);pctx.strokeStyle="rgba(255,255,255,.16)";for(let x=0;x<=w;x+=TILE){pctx.beginPath();pctx.moveTo(x+.5,0);pctx.lineTo(x+.5,h);pctx.stroke();}for(let y=0;y<=h;y+=TILE){pctx.beginPath();pctx.moveTo(0,y+.5);pctx.lineTo(w,y+.5);pctx.stroke();}$("#tilesetInfo").textContent=`${rg.w}×${rg.h}チップ`;const s=d.stamp;selection=s?{x:0,y:0,w:s.w,h:s.h}:{x:clamp(selection.x,0,rg.w-1),y:clamp(selection.y,0,rg.h-1),w:1,h:1};selOverlay();}
  function selOverlay(){cursor.style.display="block";cursor.style.left=`${selection.x*TILE}px`;cursor.style.top=`${selection.y*TILE}px`;cursor.style.width=`${selection.w*TILE}px`;cursor.style.height=`${selection.h*TILE}px`;$("#stampSize").textContent=`${selection.w}×${selection.h}`;}
  function palettesUI(){const S=$("#paletteSet"),T=$("#paletteType"),V=$("#paletteVariant");const sets=[...new Set(PALETTES.map(p=>p.set))];S.replaceChildren(...sets.map(x=>new Option(x,x)));function types(pref){const a=[...new Set(PALETTES.filter(p=>p.set===S.value).map(p=>p.type))];T.replaceChildren(...a.map(x=>new Option(x,x)));if(pref&&a.includes(pref))T.value=pref;vars();}function vars(pref){const a=PALETTES.filter(p=>p.set===S.value&&p.type===T.value);V.replaceChildren(...a.map(p=>new Option(p.variant,p.id)));if(pref&&a.some(p=>p.id===pref))V.value=pref;activePaletteId=V.value||a[0]?.id;selection={x:0,y:0,w:1,h:1};renderPalette();}S.onchange=()=>types();T.onchange=()=>vars();V.onchange=()=>{activePaletteId=V.value;renderPalette();};window.__spellSelectPalette=id=>{const d=BY_ID.get(id);if(!d)return;S.value=d.set;types(d.type);T.value=d.type;vars(d.id);};const d=BY_ID.get(activePaletteId)||PALETTES[0];S.value=d.set;types(d.type);T.value=d.type;vars(d.id);}

  function mapCell(e){const r=canvas.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*canvas.width/r.width/TILE),y=Math.floor((e.clientY-r.top)*canvas.height/r.height/TILE);return x>=0&&y>=0&&x<W&&y<H?{x,y,i:y*W+x}:null;}
  function palCell(e){const r=pal.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)*pal.width/r.width/TILE),y=Math.floor((e.clientY-r.top)*pal.height/r.height/TILE);return x>=0&&y>=0&&x<pal.width/TILE&&y<pal.height/TILE?{x,y}:null;}
  function norm(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x)+1,h:Math.abs(a.y-b.y)+1};}
  function stamp(x,y,erase=false){if(layer==="collision"){if(x<0||y<0||x>=W||y>=H)return false;const i=y*W+x,n=erase?0:(state.collision[i]?0:1);if(state.collision[i]===n)return false;state.collision[i]=n;return true;}const a=state.layers[layer];let any=false;for(let dy=0;dy<selection.h;dy++)for(let dx=0;dx<selection.w;dx++){const tx=x+dx,ty=y+dy;if(tx<0||ty<0||tx>=W||ty>=H)continue;const i=ty*W+tx,n=erase?null:{p:activePaletteId,x:selection.x+dx,y:selection.y+dy};if(JSON.stringify(a[i])!==JSON.stringify(n)){a[i]=n;any=true;}}return any;}
  function eye(c){if(layer==="collision")return;const r=state.layers[layer][c.i];if(!r?.p||!BY_ID.has(r.p))return;window.__spellSelectPalette(r.p);selection={x:r.x,y:r.y,w:1,h:1};selOverlay();}
  function snap(){return{W,H,state:deep(state),events:deep(events)};}function hist(){history=history.slice(0,historyIndex+1);history.push(snap());if(history.length>80)history.shift();historyIndex=history.length-1;undoState();}function undoState(){$("#undo").disabled=historyIndex<=0;$("#redo").disabled=historyIndex>=history.length-1;}function restore(i){if(i<0||i>=history.length)return;historyIndex=i;const s=history[i];W=s.W;H=s.H;state=deep(s.state);events=deep(s.events);sizeCanvas();eventsUI();draw();undoState();}
  function save(show=true){localStorage.setItem(draftKey(mapId),JSON.stringify({version:9,W,H,state,events}));if(show)status("編集状態を保存しました");}
  async function loadMap(id){if(state)save(false);mapId=id;eventMode=null;$("#mapSelect").value=id;let raw=null;try{raw=JSON.parse(localStorage.getItem(draftKey(id)));}catch{}if(!migrate(id,raw)){if(id==="house2")try{const r=await fetch("../assets/maps/house2-layout.json?v=2",{cache:"no-store"});if(r.ok)migrate(id,await r.json());}catch{}if(!state||W!==MAPS[id].w||H!==MAPS[id].h)defaults(id);}seedLaMer();sizeCanvas();history=[];historyIndex=-1;hist();eventsUI();await draw();status(`${MAPS[id].name} を編集中`);}
  function resize(nw,nh){nw=validDim(nw,W,160);nh=validDim(nh,H,120);if(nw===W&&nh===H)return;const ow=W,oh=H,o=deep(state);W=nw;H=nh;const n=blank();for(let y=0;y<Math.min(oh,H);y++)for(let x=0;x<Math.min(ow,W);x++){const oi=y*ow+x,ni=y*W+x;for(const l of["base","object","upper"])n.layers[l][ni]=o.layers[l][oi];n.collision[ni]=o.collision[oi];}state=n;for(const e of Object.values(events)){e.x=clamp(e.x,0,W-1);e.y=clamp(e.y,0,H-1);}sizeCanvas();draw();hist();}
  function eventsUI(){const box=$("#eventButtons"),help=$("#eventHelp");box.innerHTML="";if(mapId!=="house2"){help.textContent="タイル・サイズ・当たり判定を編集できます。";$("#cancelEvent").disabled=true;return;}help.textContent="イベントを押してから移動先のマスをクリック。";$("#cancelEvent").disabled=false;for(const[k,v]of Object.entries(EVENTS)){const b=document.createElement("button"),p=events[k]||v.fallback;b.className="event-btn"+(eventMode===k?" active":"");b.textContent=`${v.label} (${p.x},${p.y})`;b.onclick=()=>{eventMode=k;$("#modeText").textContent=`${v.label} の移動先をクリック`;eventsUI();};box.appendChild(b);}}
  function placeEvent(c){if(!eventMode)return false;events[eventMode]={...(events[eventMode]||{}),x:c.x,y:c.y};state.collision[c.i]=0;eventMode=null;$("#modeText").textContent="";eventsUI();draw();hist();return true;}
  async function pack(){return{version:9,mapId,name:MAPS[mapId].name,width:W,height:H,tileSize:TILE,source:{editor:"Spell Operator Map Editor",palettes:[...new Set(["base","object","upper"].flatMap(l=>state.layers[l].filter(Boolean).map(r=>r.p)))]},renderedMap:await rendered(),layers:deep(state.layers),collision:deep(state.collision),events:deep(events),fixedEvents:deep(events),updatedAt:new Date().toISOString()};}

  for(const[id,c]of Object.entries(MAPS)){const o=new Option(c.name,id);$("#mapSelect").appendChild(o);}palettesUI();
  $("#mapSelect").onchange=e=>loadMap(e.target.value);$("#resizeMap").onclick=()=>resize(+$("#mapWidth").value,+$("#mapHeight").value);
  $("#layerButtons").onclick=e=>{const b=e.target.closest("[data-layer]");if(!b)return;layer=b.dataset.layer;eventMode=null;document.querySelectorAll("#layerButtons button").forEach(x=>x.classList.toggle("active",x===b));eventsUI();draw();};
  pal.oncontextmenu=e=>e.preventDefault();pal.onpointerdown=e=>{if(e.button!==0)return;const c=palCell(e);if(!c)return;palDrag=true;palStart=c;selection={x:c.x,y:c.y,w:1,h:1};selOverlay();};pal.onpointermove=e=>{if(!palDrag)return;const c=palCell(e);if(c)selection=norm(palStart,c),selOverlay();};pal.onpointerup=e=>{if(!palDrag)return;const c=palCell(e);if(c)selection=norm(palStart,c);palDrag=false;palStart=null;selOverlay();status(`${selection.w}×${selection.h} チップを選択`);};
  canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{const c=mapCell(e);if(!c)return;if(placeEvent(c))return;if(e.shiftKey){eye(c);return;}mapDrag=true;mapErase=e.button===2;lastCell=`${c.x},${c.y}`;changed=stamp(c.x,c.y,mapErase);if(changed)draw();};canvas.onpointermove=e=>{const c=mapCell(e);$("#cellPos").textContent=c?`${c.x},${c.y}`:"—";if(!mapDrag||!c)return;const k=`${c.x},${c.y}`;if(k===lastCell)return;lastCell=k;if(stamp(c.x,c.y,mapErase)){changed=true;draw();}};window.addEventListener("pointerup",()=>{if(mapDrag&&changed)hist();mapDrag=false;lastCell="";changed=false;});
  $("#tilesetFile").onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{localStorage.setItem(dotartKey,r.result);window.__spellSelectPalette("dotart-room");status("女の子の部屋タイルセットを読み込みました");};r.readAsDataURL(f);};
  $("#undo").onclick=()=>restore(historyIndex-1);$("#redo").onclick=()=>restore(historyIndex+1);$("#clearLayer").onclick=()=>{layer==="collision"?state.collision=empty(0):state.layers[layer]=empty(null);draw();hist();};$("#cancelEvent").onclick=()=>{eventMode=null;eventsUI();};$("#saveDraft").onclick=()=>save(true);
  $("#applyGame").onclick=async()=>{status("プレビュー用マップを生成中…");try{localStorage.setItem(gameKey(mapId),JSON.stringify(await pack()));save(false);status(`${MAPS[mapId].name} をプレビューへ反映しました`);}catch(e){console.error(e);status("プレビュー生成に失敗");}};$("#openGame").onclick=()=>window.open("../?mapedit=1&v=113","_blank");$("#removeOverride").onclick=()=>{localStorage.removeItem(gameKey(mapId));status("プレビュー反映を解除しました");};
  $("#exportJson").onclick=async()=>{const d=await pack(),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"}));a.download=`${mapId}-layout.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};$("#importJson").onchange=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=async()=>{try{const d=JSON.parse(r.result),id=MAPS[d.mapId]?d.mapId:mapId;mapId=id;$("#mapSelect").value=id;migrate(id,d);sizeCanvas();history=[];historyIndex=-1;hist();eventsUI();await draw();}catch{alert("JSONを読み込めませんでした");}};r.readAsText(f);};$("#resetMap").onclick=()=>{localStorage.removeItem(draftKey(mapId));state=null;loadMap(mapId);};
  window.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();restore(e.shiftKey?historyIndex+1:historyIndex-1);}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();restore(historyIndex+1);}});
  loadMap("house2");
})();
