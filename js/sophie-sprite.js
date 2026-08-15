(() => {
  "use strict";
  const IDLE_FRAME=3;
  const actors=[document.getElementById("field-player"),document.getElementById("field-follower")].filter(Boolean);
  const state=new WeakMap();

  function readPosition(el){
    return{x:Number(el.style.getPropertyValue("--x")||0),y:Number(el.style.getPropertyValue("--y")||0)};
  }

  function setIdle(el,s){
    s.frame=IDLE_FRAME;
    el.dataset.frame=String(IDLE_FRAME);
  }

  function animateStep(el){
    const s=state.get(el);if(!s)return;
    s.frame=(s.frame+1)%8;
    el.dataset.frame=String(s.frame);
    clearTimeout(s.idleTimer);
    s.idleTimer=setTimeout(()=>setIdle(el,s),135);
  }

  actors.forEach(el=>{
    const s={...readPosition(el),frame:IDLE_FRAME,idleTimer:null};
    state.set(el,s);
    el.dataset.frame=String(IDLE_FRAME);
    if(!el.dataset.facing)el.dataset.facing="down";

    const observer=new MutationObserver(()=>{
      const p=readPosition(el);
      if(p.x!==s.x||p.y!==s.y){
        animateStep(el);
        s.x=p.x;s.y=p.y;
      }
    });
    observer.observe(el,{attributes:true,attributeFilter:["style"]});
  });
})();