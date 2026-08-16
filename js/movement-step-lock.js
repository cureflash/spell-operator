(() => {
  "use strict";

  // Camera/follower interpolation is 95 ms. Do not allow a second logical
  // tile move to overwrite the first interpolation before it has finished.
  const STEP_MS=105;
  let lockUntil=0;
  let queued=null;
  let timer=0;
  let bypass=false;

  const $=s=>document.querySelector(s);
  const directionFromKey=event=>({
    ArrowUp:"up",w:"up",W:"up",
    ArrowDown:"down",s:"down",S:"down",
    ArrowLeft:"left",a:"left",A:"left",
    ArrowRight:"right",d:"right",D:"right"
  })[event.key]||null;

  function fieldActive(){return Boolean($("#screen-field")?.classList.contains("active"));}
  function blockedByUi(){
    const dialog=$("#field-dialog");
    return Boolean(
      window.SpellMapTransition?.isActive?.() ||
      window.SpellStory?.isOverlayOpen?.() ||
      window.SpellMenu?.isOpen?.() ||
      (dialog&&!dialog.classList.contains("hidden"))
    );
  }

  function scheduleFlush(){
    clearTimeout(timer);
    const wait=Math.max(0,lockUntil-performance.now());
    timer=setTimeout(flush,wait+1);
  }

  function dispatchQueued(item){
    bypass=true;
    try{
      if(item.kind==="key"){
        const data={
          up:{key:"ArrowUp",code:"ArrowUp"},
          down:{key:"ArrowDown",code:"ArrowDown"},
          left:{key:"ArrowLeft",code:"ArrowLeft"},
          right:{key:"ArrowRight",code:"ArrowRight"}
        }[item.direction];
        if(data)document.dispatchEvent(new KeyboardEvent("keydown",{...data,bubbles:true,cancelable:true}));
      }else{
        document.querySelector(`[data-dir="${item.direction}"]`)?.click();
      }
    }finally{
      bypass=false;
    }
  }

  function flush(){
    timer=0;
    if(!queued)return;
    if(!fieldActive()){queued=null;return;}
    if(blockedByUi()){
      timer=setTimeout(flush,25);
      return;
    }
    const item=queued;
    queued=null;
    lockUntil=performance.now()+STEP_MS;
    dispatchQueued(item);
    scheduleFlush();
  }

  function acceptOrQueue(item,event){
    if(bypass||!fieldActive())return;
    const now=performance.now();
    if(now>=lockUntil){
      lockUntil=now+STEP_MS;
      scheduleFlush();
      return; // let the original event reach the field controller
    }
    queued=item; // one-input buffer: newest direction wins
    event.preventDefault();
    event.stopImmediatePropagation();
    scheduleFlush();
  }

  document.addEventListener("keydown",event=>{
    const direction=directionFromKey(event);
    if(!direction)return;
    acceptOrQueue({kind:"key",direction},event);
  },true);

  document.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-dir]");
    if(!button)return;
    acceptOrQueue({kind:"click",direction:button.dataset.dir},event);
  },true);

  window.SpellMovementStepLock={
    isLocked:()=>performance.now()<lockUntil,
    clear:()=>{queued=null;lockUntil=0;clearTimeout(timer);timer=0;}
  };
})();
