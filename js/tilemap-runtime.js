(() => {
  "use strict";

  const STORAGE_PREFIX="spell-operator-tilemap:";
  const FALLBACKS={house2:"assets/maps/house2-layout.json?v=2"};
  const layouts=Object.create(null);
  let activeModel=null;

  const baseModel=window.SpellFieldModel?.FollowFieldModel;
  if(baseModel&&!baseModel.__spellTilemapCaptured){
    class CapturedFollowFieldModel extends baseModel{
      constructor(options){super(options);activeModel=this;window.SpellTilemapActiveModel=this;}
    }
    CapturedFollowFieldModel.__spellTilemapCaptured=true;
    window.SpellFieldModel.FollowFieldModel=CapturedFollowFieldModel;
  }

  const safeParse=raw=>{try{return raw?JSON.parse(raw):null}catch{return null}};
  const localLayout=mapId=>safeParse(localStorage.getItem(STORAGE_PREFIX+mapId));
  async function loadFallback(mapId){
    const url=FALLBACKS[mapId];if(!url)return null;
    try{const r=await fetch(url,{cache:"no-store"});return r.ok?await r.json():null}catch{return null}
  }
  function get(mapId){return localLayout(mapId)||layouts[mapId]||null;}
  function dims(layout){
    const width=Number(layout?.width),height=Number(layout?.height);
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>180||height>140)return null;
    return{width,height};
  }
  function collisionSet(layout,width){
    if(!Array.isArray(layout?.collision))return null;
    const s=new Set();layout.collision.forEach((v,i)=>{if(v)s.add(`${i%width},${Math.floor(i/width)}`)});return s;
  }
  function spec(mapId,base){
    const layout=get(mapId),d=dims(layout);if(!d)return base;
    const blocked=collisionSet(layout,d.width);
    return{...base,...d,blocked:blocked||base.blocked};
  }
  function event(mapId,key,fallback=null){
    const layout=get(mapId),events=layout?.events||layout?.fixedEvents||{};
    const value=events?.[key];
    if(!value||!Number.isFinite(value.x)||!Number.isFinite(value.y))return fallback;
    return{...fallback,...value};
  }
  function rebuildGrid(mapId,width,height){
    const world=document.getElementById("field-world");if(!world||world.dataset.map!==mapId)return;
    world.style.gridTemplateColumns=`repeat(${width},var(--tile-size))`;
    world.style.gridTemplateRows=`repeat(${height},var(--tile-size))`;
    world.style.width=`calc(${width} * var(--tile-size))`;
    world.style.height=`calc(${height} * var(--tile-size))`;
    world.querySelectorAll(":scope > .field-tile").forEach(el=>el.remove());
    const frag=document.createDocumentFragment();
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const t=document.createElement("div");t.className="field-tile custom-map-floor";t.dataset.x=x;t.dataset.y=y;
      t.style.background="transparent";t.style.border="0";t.style.boxShadow="none";frag.appendChild(t);
    }
    world.insertBefore(frag,world.firstChild);
  }
  function syncEntity(selector,entity){
    const el=document.querySelector(selector);if(!el||!entity)return;
    el.style.setProperty("--x",entity.x);el.style.setProperty("--y",entity.y);if(entity.facing)el.dataset.facing=entity.facing;
  }
  function restoreEntity(entity,snap,width,height){
    if(!entity||!snap||!Number.isFinite(snap.x)||!Number.isFinite(snap.y)||snap.x<0||snap.y<0||snap.x>=width||snap.y>=height)return false;
    Object.assign(entity,snap);return true;
  }
  function applyModel(mapId,layout,snapshot=null){
    const d=dims(layout);if(!d||!activeModel)return;
    activeModel.width=d.width;activeModel.height=d.height;activeModel.blocked=collisionSet(layout,d.width)||new Set();
    if(snapshot){restoreEntity(activeModel.player,snapshot.player,d.width,d.height);restoreEntity(activeModel.follower,snapshot.follower,d.width,d.height);}
    if(!activeModel.inBounds(activeModel.player.x,activeModel.player.y))restoreEntity(activeModel.player,event(mapId,"playerStart"),d.width,d.height);
    if(!activeModel.inBounds(activeModel.follower.x,activeModel.follower.y))restoreEntity(activeModel.follower,event(mapId,"followerStart"),d.width,d.height);
    rebuildGrid(mapId,d.width,d.height);syncEntity("#field-player",activeModel.player);syncEntity("#field-follower",activeModel.follower);
    requestAnimationFrame(()=>window.dispatchEvent(new Event("resize")));
  }
  function applyVisual(mapId,layout){
    if(!layout?.renderedMap)return;
    const doApply=()=>{
      const world=document.getElementById("field-world");if(!world||world.dataset.map!==mapId)return false;
      let layer=world.querySelector(":scope > .custom-tilemap-layer");
      if(!layer){layer=document.createElement("div");layer.className="custom-tilemap-layer";Object.assign(layer.style,{position:"absolute",inset:"0",zIndex:"0",pointerEvents:"none",imageRendering:"pixelated",backgroundRepeat:"no-repeat",backgroundPosition:"0 0",backgroundSize:"100% 100%"});world.insertBefore(layer,world.firstChild);}
      layer.style.backgroundImage=`url(${JSON.stringify(layout.renderedMap)})`;layer.dataset.mapId=mapId;
      world.querySelectorAll(":scope > .field-tile").forEach(t=>{t.style.background="transparent";t.style.border="0";t.style.boxShadow="none"});
      return true;
    };
    if(doApply())return;let n=0;const timer=setInterval(()=>{n++;if(doApply()||n>60)clearInterval(timer)},16);
  }
  function apply(mapId,snapshot=null){const layout=get(mapId);if(!layout)return;applyModel(mapId,layout,snapshot);applyVisual(mapId,layout);}
  function installFieldPatch(){
    const field=window.SpellField;if(!field?.activateMap||field.activateMap.__spellTilemapPatched)return false;
    const original=field.activateMap.bind(field);
    const patched=(mapId,options={})=>{const result=original(mapId,options);apply(mapId,options?.snapshot||null);return result;};
    patched.__spellTilemapPatched=true;field.activateMap=patched;apply(field.currentMap?.());return true;
  }

  const ready=Promise.all(Object.keys(FALLBACKS).map(async id=>{layouts[id]=await loadFallback(id)})).then(()=>layouts);
  const timer=setInterval(()=>{if(installFieldPatch())clearInterval(timer)},20);setTimeout(()=>clearInterval(timer),10000);
  window.addEventListener("storage",e=>{if(!e.key?.startsWith(STORAGE_PREFIX))return;const id=e.key.slice(STORAGE_PREFIX.length);if(window.SpellField?.currentMap?.()===id)apply(id)});

  window.SpellTilemapRuntime={ready,storageKey:id=>STORAGE_PREFIX+id,get,spec,event,apply,clearLocal(id){localStorage.removeItem(STORAGE_PREFIX+id);return true;}};
})();