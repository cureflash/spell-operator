(() => {
  "use strict";

  const FieldModel = window.SpellFieldModel;
  const Field = window.SpellField;
  if (!FieldModel?.FollowFieldModel || !Field?.activateMap) return;

  const ZONE_W = 36;
  const ZONE_H = 26;
  const WIDTH = ZONE_W * 4;
  const HEIGHT = ZONE_H * 4;
  const VIEW_W = 32;
  const VIEW_H = 24;
  const SAFE_X = 6;
  const SAFE_Y = 5;
  const key = FieldModel.key;
  let expandingLaMer = false;
  let renderedWindow = null;
  let renderQueued = false;

  const inRect = (x,y,x1,y1,x2,y2) => x>=x1&&x<=x2&&y>=y1&&y<=y2;
  const mountain = () => "tree la-mer-mountain";
  const road = () => "path la-mer-road";
  const pavement = () => "path la-mer-pavement";
  const stone = () => "path la-mer-stone";
  const harbor = () => "path la-mer-harbor";
  const pier = () => "path la-mer-pier";
  const sand = () => "path la-mer-sand";
  const grass = () => "grass";
  const water = () => "water";
  const building = (kind="la-mer-shop") => `building ${kind}`;
  const roof = (kind="la-mer-shop") => `roof ${kind}`;
  const door = (kind="la-mer-shop") => `door ${kind}`;

  const virtualStyle=document.createElement("style");
  virtualStyle.textContent=`
    #field-world[data-map="la_mer_city"] .la-mer-virtual-tile{
      position:absolute!important;
      left:calc(var(--tile-x) * var(--tile-size));
      top:calc(var(--tile-y) * var(--tile-size));
    }
  `;
  document.head.appendChild(virtualStyle);

  function rokkoTile(x,y){
    if(y>=5&&y<=8&&x>=9&&x<=26)return road();
    if(y>=9&&y<=24&&x>=17&&x<=18)return road();
    if(y===25&&x>=17&&x<=19)return road();
    return mountain();
  }

  function settlementTile(x,y){
    if(y===0&&x>=17&&x<=19)return stone();
    if((y===1||y===2)&&x>=17&&x<=19)return stone();
    if(y===25&&x>=17&&x<=24)return stone();
    if(y===1||y===2)return mountain();
    if(inRect(x,y,3,3,8,7))return y===3?roof("la-mer-foreign"):building("la-mer-foreign");
    if(inRect(x,y,12,3,15,7))return y===3?roof("la-mer-foreign"):building("la-mer-foreign");
    if(inRect(x,y,23,3,28,7))return y===3?roof("la-mer-foreign"):building("la-mer-foreign");
    if(inRect(x,y,4,10,10,16))return y===10?roof("la-mer-foreign"):building("la-mer-foreign");
    if(inRect(x,y,24,10,30,16))return y===10?roof("la-mer-foreign"):building("la-mer-foreign");
    if(inRect(x,y,6,19,12,22))return y===19?roof("la-mer-foreign"):building("la-mer-foreign");
    if((y===8||y===9||y===17||y===18)&&x>=2&&x<=33)return stone();
    if(((y>=3&&y<=7)||(y>=10&&y<=22))&&x>=17&&x<=19)return stone();
    return grass();
  }

  function westRoadTile(x,y){
    if(y>=11&&y<=14)return road();
    if(y>=15&&x>=17&&x<=18)return road();
    return grass();
  }

  function eastRoadTile(x,y){
    if(y<=7)return mountain();
    if(y>=11&&y<=14)return road();
    return grass();
  }

  function motomachiTile(x,y){
    const shops=[[3,8],[10,15],[17,22],[24,29]];
    for(let i=0;i<shops.length;i++){
      const [x1,x2]=shops[i];
      if(inRect(x,y,x1,4,x2,10)){
        const doorX=x1+2;
        if(y===4)return roof();
        if(y===10&&(x===doorX||x===doorX+1))return door();
        return building();
      }
    }
    if(y>=11&&y<=15)return pavement();
    if(inRect(x,y,4,18,12,23)||inRect(x,y,22,18,31,23))return y===18?roof():building();
    return pavement();
  }

  function sannomiyaTile(x,y){
    if(y===0&&x>=17&&x<=24)return road();
    if(y===25&&x>=23&&x<=24)return road();
    if(y>=15&&y<=16)return road();
    if(x>=23&&x<=24)return road();
    if(inRect(x,y,2,3,9,9)||inRect(x,y,27,3,33,10))return y===3?roof():building();
    if(inRect(x,y,2,18,10,23)||inRect(x,y,28,18,33,23))return y===18?roof():building();
    if(inRect(x,y,12,8,21,16)){
      if(inRect(x,y,15,10,20,14)){
        if(y===10)return roof("la-mer-center");
        if(y===14&&(x===17||x===18))return door("la-mer-center");
        return building("la-mer-center");
      }
      return "path la-mer-plaza";
    }
    return grass();
  }

  function portTile(x,y){
    if(y<=3){if(x>=17&&x<=18)return road();return pavement();}
    if(y>=4&&y<=7){if(x>=17&&x<=18)return road();return harbor();}
    const onPier1=x>=5&&x<=7&&y>=13&&y<=19;
    const onPier2=x>=17&&x<=19&&y>=13&&y<=22;
    const onPier3=x>=29&&x<=31&&y>=13&&y<=19;
    if(onPier1||onPier2||onPier3)return pier();
    if(y>=15)return water();
    if(inRect(x,y,3,8,8,14)||inRect(x,y,26,8,32,14))return y===8?roof():building();
    if(inRect(x,y,14,8,21,14))return y===8?roof("la-mer-center"):building("la-mer-center");
    return pavement();
  }

  function coastTile(x,y){
    if(x>=17&&x<=18&&y<=11)return road();
    if(y<=7)return mountain();
    if(y===8&&x<=8)return mountain();
    if(y>=9&&y<=11)return road();
    if(inRect(x,y,15,12,19,14))return "path la-mer-plaza";
    if(y>=15&&y<=18)return sand();
    if(y>=19)return water();
    return grass();
  }

  function tileAt(x,y){
    const col=Math.floor(x/ZONE_W),row=Math.floor(y/ZONE_H),lx=x%ZONE_W,ly=y%ZONE_H;
    if(row===0&&col===2)return rokkoTile(lx,ly);
    if(row===1&&col===2)return settlementTile(lx,ly);
    if(row===2&&col===0)return westRoadTile(lx,ly);
    if(row===2&&col===1)return motomachiTile(lx,ly);
    if(row===2&&col===2)return sannomiyaTile(lx,ly);
    if(row===2&&col===3)return eastRoadTile(lx,ly);
    if(row===3&&col===0)return coastTile(lx,ly);
    if(row===3&&col===1)return portTile(lx,ly);
    if(row===3&&col===2)return portTile(lx,ly);
    if(row===3&&col===3)return water();
    return mountain();
  }

  function seamBlocked(x,y){
    const row=Math.floor(y/ZONE_H),col=Math.floor(x/ZONE_W),lx=x%ZONE_W,ly=y%ZONE_H;
    const verticalEdge=lx===0||lx===ZONE_W-1;
    const horizontalEdge=ly===0||ly===ZONE_H-1;
    if(row===2&&verticalEdge){
      if((col===0&&lx===ZONE_W-1)||(col===1&&lx===0))return !(ly>=12&&ly<=14);
      if((col===1&&lx===ZONE_W-1)||(col===2&&lx===0))return !(ly>=13&&ly<=16);
      if((col===2&&lx===ZONE_W-1)||(col===3&&lx===0))return !(ly>=12&&ly<=16);
    }
    if(row===3&&verticalEdge){
      if((col===0&&lx===ZONE_W-1)||(col===1&&lx===0))return !(ly>=9&&ly<=14);
      if((col===1&&lx===ZONE_W-1)||(col===2&&lx===0))return !(ly>=13&&ly<=14);
      if((col===2&&lx===ZONE_W-1)||(col===3&&lx===0))return true;
    }
    if(col===2&&horizontalEdge){
      if((row===0&&ly===ZONE_H-1)||(row===1&&ly===0))return !(lx>=17&&lx<=19);
      if((row===1&&ly===ZONE_H-1)||(row===2&&ly===0))return !(lx>=17&&lx<=24);
      if((row===2&&ly===ZONE_H-1)||(row===3&&ly===0))return !(lx>=23&&lx<=24);
    }
    if(horizontalEdge&&((row===2&&ly===ZONE_H-1)||(row===3&&ly===0))){
      if(col===0)return !(lx>=17&&lx<=18);
      if(col===1)return !(lx>=17&&lx<=18);
      if(col===3)return true;
    }
    return false;
  }

  function buildBlocked(){
    const blocked=new Set();
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
      const tile=tileAt(x,y);
      const solid=tile.includes("tree")||tile.includes("water")||tile.includes("building")||tile.includes("roof")||tile.includes("door");
      if(solid||seamBlocked(x,y))blocked.add(key(x,y));
    }
    return blocked;
  }

  const blocked=buildBlocked();
  const spawn={
    player:{x:ZONE_W*2+23,y:ZONE_H*2+18,facing:"down"},
    follower:{x:ZONE_W*2+23,y:ZONE_H*2+17,facing:"down"}
  };

  function addLabel(world,text,x,y,w=8){
    const el=document.createElement("div");
    el.className="field-map-label interior-label la-mer-static-label";
    el.textContent=text;
    el.style.setProperty("--x",x);
    el.style.setProperty("--y",y);
    el.style.setProperty("--w",w);
    world.appendChild(el);
  }

  function entityCoord(name,fallback){
    const el=document.getElementById(name);
    if(!el)return fallback;
    const value=Number.parseFloat(el.style.getPropertyValue(name==="field-player"?"--x":"--y"));
    return Number.isFinite(value)?value:fallback;
  }
  function playerPosition(){
    const player=document.getElementById("field-player");
    if(!player)return spawn.player;
    const x=Number.parseFloat(player.style.getPropertyValue("--x"));
    const y=Number.parseFloat(player.style.getPropertyValue("--y"));
    return {x:Number.isFinite(x)?x:spawn.player.x,y:Number.isFinite(y)?y:spawn.player.y};
  }
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function windowFor(x,y){
    const x1=clamp(Math.floor(x-VIEW_W/2),0,WIDTH-VIEW_W);
    const y1=clamp(Math.floor(y-VIEW_H/2),0,HEIGHT-VIEW_H);
    return{x1,y1,x2:x1+VIEW_W-1,y2:y1+VIEW_H-1};
  }
  function isSafeInRendered(x,y){
    if(!renderedWindow)return false;
    const {x1,y1,x2,y2}=renderedWindow;
    return x>=x1+SAFE_X&&x<=x2-SAFE_X&&y>=y1+SAFE_Y&&y<=y2-SAFE_Y;
  }
  function renderVisibleTiles(force=false){
    const world=document.getElementById("field-world");
    if(!world||world.dataset.map!=="la_mer_city")return;
    const p=playerPosition();
    if(!force&&isSafeInRendered(p.x,p.y))return;
    const next=windowFor(p.x,p.y);
    renderedWindow=next;
    world.querySelectorAll(".la-mer-virtual-tile").forEach(el=>el.remove());
    const frag=document.createDocumentFragment();
    for(let y=next.y1;y<=next.y2;y++)for(let x=next.x1;x<=next.x2;x++){
      const tile=document.createElement("div");
      tile.className=`field-tile la-mer-virtual-tile ${tileAt(x,y)}`;
      tile.dataset.x=x;
      tile.dataset.y=y;
      tile.style.setProperty("--tile-x",x);
      tile.style.setProperty("--tile-y",y);
      frag.appendChild(tile);
    }
    world.insertBefore(frag,world.firstChild);
  }
  function scheduleVisibleTiles(force=false){
    if(renderQueued&&!force)return;
    renderQueued=true;
    requestAnimationFrame(()=>{renderQueued=false;renderVisibleTiles(force);});
  }

  function rebuildWorld(){
    const world=document.getElementById("field-world");
    if(!world||world.dataset.map!=="la_mer_city")return;
    world.querySelectorAll(".field-tile,.field-map-label").forEach(el=>el.remove());
    world.style.gridTemplateColumns=`repeat(${WIDTH},var(--tile-size))`;
    world.style.gridTemplateRows=`repeat(${HEIGHT},var(--tile-size))`;
    world.style.width=`calc(${WIDTH} * var(--tile-size))`;
    world.style.height=`calc(${HEIGHT} * var(--tile-size))`;
    world.style.position="relative";
    world.style.willChange="transform";
    renderedWindow=null;
    renderVisibleTiles(true);

    addLabel(world,"六甲山（ダンジョン）",ZONE_W*2+11,5,14);
    addLabel(world,"外国人居留地",ZONE_W*2+12,ZONE_H+8,12);
    addLabel(world,"西道路",8,ZONE_H*2+11,10);
    addLabel(world,"元町商店街",ZONE_W+12,ZONE_H*2+12,12);
    addLabel(world,"三宮",ZONE_W*2+14,ZONE_H*2+17,8);
    addLabel(world,"中心施設",ZONE_W*2+14,ZONE_H*2+9,10);
    addLabel(world,"東道路",ZONE_W*3+10,ZONE_H*2+11,10);
    addLabel(world,"須磨〜明石 海岸",8,ZONE_H*3+12,14);
    addLabel(world,"港1",ZONE_W+13,ZONE_H*3+5,8);
    addLabel(world,"港2",ZONE_W*2+13,ZONE_H*3+5,8);
  }

  const originalRestore=FieldModel.FollowFieldModel.prototype.restore;
  FieldModel.FollowFieldModel.prototype.restore=function(snapshot){
    const worldIsLaMer=document.getElementById("field-world")?.dataset.map==="la_mer_city";
    if(!expandingLaMer&&!worldIsLaMer)return originalRestore.call(this,snapshot);
    this.width=WIDTH;
    this.height=HEIGHT;
    this.blocked=new Set(blocked);
    const p=snapshot?.player;
    const looksExpanded=p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.x>=ZONE_W||p.y>=ZONE_H);
    return originalRestore.call(this,looksExpanded?snapshot:spawn);
  };

  const originalActivate=Field.activateMap.bind(Field);
  Field.activateMap=function(id,options={}){
    if(id!=="la_mer_city")return originalActivate(id,options);
    expandingLaMer=true;
    try{
      const result=originalActivate(id,options);
      rebuildWorld();
      requestAnimationFrame(()=>window.SpellBgm?.sync?.());
      return result;
    }finally{
      expandingLaMer=false;
    }
  };

  const world=document.getElementById("field-world");
  if(world){
    const observer=new MutationObserver(()=>{if(world.dataset.map==="la_mer_city")queueMicrotask(rebuildWorld);});
    observer.observe(world,{attributes:true,attributeFilter:["data-map"]});
  }
  const player=document.getElementById("field-player");
  if(player){
    const observer=new MutationObserver(()=>{
      if(document.getElementById("field-world")?.dataset.map==="la_mer_city")scheduleVisibleTiles(false);
    });
    observer.observe(player,{attributes:true,attributeFilter:["style"]});
  }
  document.getElementById("field-load")?.addEventListener("click",()=>queueMicrotask(()=>{if(Field.currentMap?.()==="la_mer_city")rebuildWorld();}));

  window.SpellLaMerExpanded={
    width:WIDTH,height:HEIGHT,tileAt,rebuildWorld,spawn,blockedCount:blocked.size,
    renderedTileBudget:VIEW_W*VIEW_H,renderVisibleTiles
  };
})();
