(() => {
  "use strict";

  const FADE_MS=220;
  let transitioning=false;
  let bypass=false;

  const $=s=>document.querySelector(s);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const same=(a,b)=>Boolean(a&&b&&a.x===b.x&&a.y===b.y);
  const DIRS={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  const TRANSITION_TILES={
    town:[{x:3,y:3},{x:13,y:3}],
    school:[{x:7,y:11}],
    library:[{x:7,y:11}]
  };

  function fieldActive(){return Boolean($("#screen-field")?.classList.contains("active"));}
  function currentMap(){return window.SpellField?.currentMap?.()||"town";}
  function playerPosition(){
    const el=$("#field-player");
    if(!el)return null;
    const x=Number(el.style.getPropertyValue("--x"));
    const y=Number(el.style.getPropertyValue("--y"));
    return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
  }
  function playerFacing(){return $("#field-player")?.dataset.facing||"down";}
  function nextPosition(direction){
    const p=playerPosition(),d=DIRS[direction];
    return p&&d?{x:p.x+d.x,y:p.y+d.y}:null;
  }
  function isTransitionAhead(direction){
    const next=nextPosition(direction),targets=TRANSITION_TILES[currentMap()]||[];
    return targets.some(target=>same(next,target));
  }
  function dialogOpen(){const d=$("#field-dialog");return Boolean(d&&!d.classList.contains("hidden"));}
  function storyOverlayOpen(){return Boolean(window.SpellStory?.isOverlayOpen?.());}
  function menuOpen(){return Boolean(window.SpellMenu?.isOpen?.());}

  function ensureFade(){
    let fade=$("#field-transition-fade");
    if(fade)return fade;
    const fieldWindow=$("#screen-field .field-window");
    if(!fieldWindow)return null;
    fade=document.createElement("div");
    fade.id="field-transition-fade";
    fade.className="field-transition-fade";
    fade.setAttribute("aria-hidden","true");
    fieldWindow.appendChild(fade);
    return fade;
  }

  function dispatchMove(direction){
    const data={
      up:{key:"ArrowUp",code:"ArrowUp"},
      down:{key:"ArrowDown",code:"ArrowDown"},
      left:{key:"ArrowLeft",code:"ArrowLeft"},
      right:{key:"ArrowRight",code:"ArrowRight"}
    }[direction];
    if(!data)return;
    bypass=true;
    try{document.dispatchEvent(new KeyboardEvent("keydown",{...data,bubbles:true,cancelable:true}));}
    finally{bypass=false;}
  }

  function dispatchInteract(){
    bypass=true;
    try{$("#field-action")?.click();}
    finally{bypass=false;}
  }

  function closeAutomaticMoveMessage(){
    const dialog=$("#field-dialog"),text=$("#field-dialog-text")?.textContent?.trim()||"";
    if(dialog&&!dialog.classList.contains("hidden")&&/へ移動した。$/.test(text))dispatchInteract();
  }

  async function performTransition(kind,direction){
    if(transitioning)return;
    const fade=ensureFade();
    if(!fade)return;
    transitioning=true;
    document.documentElement.classList.add("field-transitioning");
    fade.classList.add("active");
    try{
      await wait(FADE_MS);
      if(kind==="move")dispatchMove(direction);else dispatchInteract();
      await nextPaint();
      closeAutomaticMoveMessage();
      await wait(40);
      fade.classList.remove("active");
      await wait(FADE_MS);
    }finally{
      fade.classList.remove("active");
      document.documentElement.classList.remove("field-transitioning");
      transitioning=false;
    }
  }

  function directionFromKey(event){
    return ({ArrowUp:"up",w:"up",W:"up",ArrowDown:"down",s:"down",S:"down",ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"})[event.key]||null;
  }
  function isZ(event){return event.code==="KeyZ"||event.key==="z"||event.key==="Z";}
  function canStartTransition(){return fieldActive()&&!dialogOpen()&&!storyOverlayOpen()&&!menuOpen();}

  document.addEventListener("keydown",event=>{
    if(bypass||!fieldActive())return;
    if(transitioning){event.preventDefault();event.stopImmediatePropagation();return;}
    if(!canStartTransition())return;
    const direction=directionFromKey(event);
    if(direction&&isTransitionAhead(direction)){
      event.preventDefault();event.stopImmediatePropagation();performTransition("move",direction);return;
    }
    if(isZ(event)&&isTransitionAhead(playerFacing())){
      event.preventDefault();event.stopImmediatePropagation();performTransition("interact",playerFacing());
    }
  },true);

  document.addEventListener("click",event=>{
    if(bypass||!fieldActive())return;
    if(transitioning){event.preventDefault();event.stopImmediatePropagation();return;}
    if(!canStartTransition())return;
    const dirButton=event.target.closest?.("[data-dir]");
    if(dirButton&&isTransitionAhead(dirButton.dataset.dir)){
      event.preventDefault();event.stopImmediatePropagation();performTransition("move",dirButton.dataset.dir);return;
    }
    if(event.target.closest?.("#field-action")&&isTransitionAhead(playerFacing())){
      event.preventDefault();event.stopImmediatePropagation();performTransition("interact",playerFacing());
    }
  },true);

  ensureFade();
  window.SpellMapTransition={isActive:()=>transitioning};
})();
