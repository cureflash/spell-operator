(() => {
  "use strict";
  const entities=[document.getElementById("field-player"),document.getElementById("field-follower")].filter(Boolean);
  if(!entities.length)return;

  const state=new Map();
  for(const el of entities){
    state.set(el,{x:Number(el.style.getPropertyValue("--x")||0),y:Number(el.style.getPropertyValue("--y")||0),frame:0,timer:null});
    if(!el.dataset.facing)el.dataset.facing="down";
    el.dataset.frame="0";
    el.style.setProperty("--sprite-frame-x","0%");
  }

  function setFrame(el,frame){
    const f=((frame%8)+8)%8;
    el.dataset.frame=String(f);
    el.style.setProperty("--sprite-frame-x",`${(f*100/7).toFixed(6)}%`);
  }

  function readPosition(el){return{x:Number(el.style.getPropertyValue("--x")||0),y:Number(el.style.getPropertyValue("--y")||0)}}

  function animateMove(el,dx,dy){
    const s=state.get(el);if(!s)return;
    if(dx||dy){
      if(Math.abs(dx)>=Math.abs(dy))el.dataset.facing=dx<0?"left":"right";
      else el.dataset.facing=dy<0?"up":"down";
    }
    s.frame=(s.frame+1)%8;
    setFrame(el,s.frame);
    clearTimeout(s.timer);
    s.timer=setTimeout(()=>setFrame(el,0),150);
  }

  for(const el of entities){
    const observer=new MutationObserver(()=>{
      const s=state.get(el),p=readPosition(el),dx=p.x-s.x,dy=p.y-s.y;
      if(dx||dy){animateMove(el,dx,dy);s.x=p.x;s.y=p.y}
    });
    observer.observe(el,{attributes:true,attributeFilter:["style"]});
  }
})();
