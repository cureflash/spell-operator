(() => {
  "use strict";
  const actors=[document.getElementById("field-player"),document.getElementById("field-follower")].filter(Boolean);
  const timers=new WeakMap();

  function readPosition(el){return{x:Number(el.style.getPropertyValue("--x")||0),y:Number(el.style.getPropertyValue("--y")||0)}}
  function animateWalk(el){
    const old=timers.get(el);if(old)clearInterval(old.interval);
    let frame=1;
    el.dataset.frame="1";
    const interval=setInterval(()=>{frame++;if(frame>7){clearInterval(interval);el.dataset.frame="0";timers.delete(el);return}el.dataset.frame=String(frame)},16);
    timers.set(el,{interval});
  }

  actors.forEach(el=>{
    let previous=readPosition(el);
    el.dataset.frame="0";
    if(!el.dataset.facing)el.dataset.facing="down";
    const observer=new MutationObserver(()=>{const current=readPosition(el);if(current.x!==previous.x||current.y!==previous.y){animateWalk(el);previous=current}});
    observer.observe(el,{attributes:true,attributeFilter:["style"]});
  });
})();
