(() => {
  "use strict";
  const MOVE_MS=95;
  const fieldMap=document.getElementById("field-map");
  const player=document.getElementById("field-player");
  const follower=document.getElementById("field-follower");
  if(!fieldMap||!player||!follower)return;

  const style=document.createElement("style");
  style.textContent=`
    #field-follower.party-lockstep{
      left:calc(50% + var(--party-offset-x,-40px))!important;
      top:calc(50% + var(--party-offset-y,0px))!important;
      transform:translate(-50%,-50%)!important;
      transition-property:left,top!important;
      transition-duration:${MOVE_MS}ms,${MOVE_MS}ms!important;
      transition-timing-function:linear,linear!important;
      transition-delay:0ms,0ms!important;
      will-change:left,top!important;
    }
    html.field-transitioning #field-follower.party-lockstep{
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
  function keepOnPartyLayer(){
    if(follower.parentElement!==fieldMap)fieldMap.appendChild(follower);
  }
  function syncVisual({instant=false}={}){
    keepOnPartyLayer();
    const tile=tileSize();
    const dx=read(follower,"--x")-read(player,"--x");
    const dy=read(follower,"--y")-read(player,"--y");
    const x=`${dx*tile}px`,y=`${dy*tile}px`;
    if(follower.style.getPropertyValue("--party-offset-x")!==x)follower.style.setProperty("--party-offset-x",x);
    if(follower.style.getPropertyValue("--party-offset-y")!==y)follower.style.setProperty("--party-offset-y",y);
    if(instant){
      follower.style.setProperty("transition","none","important");
      void follower.offsetWidth;
      follower.style.removeProperty("transition");
    }
  }

  /*
   * Both logical positions are written in the same render call. MutationObserver
   * runs before the next paint, so Lumiere's 95 ms screen movement starts in the
   * exact same rendered frame as the 95 ms camera movement.
   */
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

  const parentObserver=new MutationObserver(()=>{
    if(follower.parentElement!==fieldMap){
      keepOnPartyLayer();
      syncVisual({instant:true});
    }
  });
  parentObserver.observe(fieldMap,{childList:true,subtree:true});

  window.addEventListener("resize",()=>syncVisual({instant:true}));
  keepOnPartyLayer();
  syncVisual({instant:true});
  window.SpellPartyLockstep={sync:syncVisual};
})();
