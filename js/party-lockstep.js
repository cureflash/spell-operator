(() => {
  "use strict";
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
      transition:none!important;
      will-change:auto!important;
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
  function syncVisual(){
    keepOnPartyLayer();
    const tile=tileSize();
    const dx=read(follower,"--x")-read(player,"--x");
    const dy=read(follower,"--y")-read(player,"--y");
    const x=`${dx*tile}px`,y=`${dy*tile}px`;
    if(follower.style.getPropertyValue("--party-offset-x")!==x)follower.style.setProperty("--party-offset-x",x);
    if(follower.style.getPropertyValue("--party-offset-y")!==y)follower.style.setProperty("--party-offset-y",y);
  }

  const positionObserver=new MutationObserver(syncVisual);
  positionObserver.observe(player,{attributes:true,attributeFilter:["style"]});
  positionObserver.observe(follower,{attributes:true,attributeFilter:["style"]});

  const parentObserver=new MutationObserver(()=>{
    if(follower.parentElement!==fieldMap){keepOnPartyLayer();syncVisual();}
  });
  parentObserver.observe(fieldMap,{childList:true,subtree:true});

  window.addEventListener("resize",syncVisual);
  keepOnPartyLayer();
  syncVisual();
  window.SpellPartyLockstep={sync:syncVisual};
})();
