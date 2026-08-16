(() => {
  "use strict";
  const MOVE_MS=95;
  const fieldMap=document.getElementById("field-map");
  const world=document.getElementById("field-world");
  const player=document.getElementById("field-player");
  const follower=document.getElementById("field-follower");
  if(!fieldMap||!world||!player||!follower)return;

  const style=document.createElement("style");
  style.textContent=`
    /* Scrolling maps: Sophie is camera-centred and Lumiere is drawn relative to her. */
    #field-map > #field-follower.party-lockstep{
      left:calc(50% + var(--party-offset-x,-40px))!important;
      top:calc(50% + var(--party-offset-y,0px))!important;
      transform:translate(-50%,-50%)!important;
      transition-property:left,top!important;
      transition-duration:${MOVE_MS}ms,${MOVE_MS}ms!important;
      transition-timing-function:linear,linear!important;
      transition-delay:0ms,0ms!important;
      will-change:left,top!important;
    }

    /* Compact house maps: the room is fixed, so both characters use real tile positions. */
    #field-world[data-map="house1"] > #field-player.room-grid-position,
    #field-world[data-map="house2"] > #field-player.room-grid-position,
    #field-world[data-map="house1"] > #field-follower.room-grid-position,
    #field-world[data-map="house2"] > #field-follower.room-grid-position{
      left:calc(var(--x) * var(--tile-size))!important;
      top:calc(var(--y) * var(--tile-size))!important;
      transform:none!important;
      transition:left ${MOVE_MS}ms linear,top ${MOVE_MS}ms linear!important;
      will-change:left,top!important;
    }

    html.field-transitioning #field-follower.party-lockstep,
    html.field-transitioning #field-player.room-grid-position,
    html.field-transitioning #field-follower.room-grid-position{
      transition:none!important;
    }
  `;
  document.head.appendChild(style);
  follower.classList.add("party-lockstep");

  function read(el,name){
    const value=Number(el.style.getPropertyValue(name));
    return Number.isFinite(value)?value:0;
  }
  function tileSize(){
    return parseFloat(getComputedStyle(fieldMap).getPropertyValue("--tile-size"))||40;
  }
  function isCompactRoom(){
    return world.dataset.map==="house1"||world.dataset.map==="house2";
  }
  function forceNoTransition(elements,callback){
    for(const el of elements)el.style.setProperty("transition","none","important");
    callback();
    void fieldMap.offsetWidth;
    for(const el of elements)el.style.removeProperty("transition");
  }

  function syncScrollingVisual({instant=false}={}){
    const work=()=>{
      if(player.parentElement!==fieldMap)fieldMap.appendChild(player);
      if(follower.parentElement!==fieldMap)fieldMap.appendChild(follower);
      player.classList.remove("room-grid-position");
      follower.classList.remove("room-grid-position");
      follower.classList.add("party-lockstep");
      const tile=tileSize();
      const dx=read(follower,"--x")-read(player,"--x");
      const dy=read(follower,"--y")-read(player,"--y");
      follower.style.setProperty("--party-offset-x",`${dx*tile}px`);
      follower.style.setProperty("--party-offset-y",`${dy*tile}px`);
    };
    if(instant)forceNoTransition([player,follower],work);else work();
  }

  function syncRoomVisual({instant=false}={}){
    const work=()=>{
      player.classList.add("room-grid-position");
      follower.classList.add("room-grid-position");
      follower.classList.remove("party-lockstep");
      if(player.parentElement!==world)world.appendChild(player);
      if(follower.parentElement!==world)world.appendChild(follower);
    };
    if(instant)forceNoTransition([player,follower],work);else work();
  }

  function syncVisual({instant=false}={}){
    if(isCompactRoom())syncRoomVisual({instant});
    else syncScrollingVisual({instant});
  }

  let queued=false;
  function queueSync(){
    if(queued)return;
    queued=true;
    queueMicrotask(()=>{
      queued=false;
      syncVisual();
    });
  }
  const positionObserver=new MutationObserver(queueSync);
  positionObserver.observe(player,{attributes:true,attributeFilter:["style"]});
  positionObserver.observe(follower,{attributes:true,attributeFilter:["style"]});

  const mapObserver=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==="attributes"&&m.attributeName==="data-map")){
      syncVisual({instant:true});
    }
  });
  mapObserver.observe(world,{attributes:true,attributeFilter:["data-map"]});

  const parentObserver=new MutationObserver(()=>{
    if(isCompactRoom()){
      if(player.parentElement!==world||follower.parentElement!==world)syncRoomVisual({instant:true});
    }else if(player.parentElement!==fieldMap||follower.parentElement!==fieldMap){
      syncScrollingVisual({instant:true});
    }
  });
  parentObserver.observe(fieldMap,{childList:true,subtree:true});

  window.addEventListener("resize",()=>syncVisual({instant:true}));
  syncVisual({instant:true});
  window.SpellPartyLockstep={sync:syncVisual,isCompactRoom};
})();