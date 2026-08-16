(() => {
  "use strict";
  const IDLE_FRAME=1;
  const WALK_FRAMES=[0,2];
  const player=document.getElementById("field-player");
  const follower=document.getElementById("field-follower");
  const actors=[player,follower].filter(Boolean);
  if(!player||!actors.length)return;

  let walkIndex=0;
  let frame=IDLE_FRAME;
  let idleTimer=null;
  let lastPlayer=readPosition(player);

  function readPosition(el){
    return{x:Number(el.style.getPropertyValue("--x")||0),y:Number(el.style.getPropertyValue("--y")||0)};
  }

  function applyFrame(next){
    frame=next;
    for(const el of actors)el.dataset.frame=String(frame);
  }

  function setIdle(){applyFrame(IDLE_FRAME);}

  function animateSharedStep(){
    applyFrame(WALK_FRAMES[walkIndex]);
    walkIndex=(walkIndex+1)%WALK_FRAMES.length;
    clearTimeout(idleTimer);
    idleTimer=setTimeout(setIdle,135);
  }

  for(const el of actors){
    el.dataset.frame=String(IDLE_FRAME);
    if(!el.dataset.facing)el.dataset.facing="down";
  }

  const observer=new MutationObserver(()=>{
    const current=readPosition(player);
    if(current.x===lastPlayer.x&&current.y===lastPlayer.y)return;
    lastPlayer=current;
    animateSharedStep();
  });
  observer.observe(player,{attributes:true,attributeFilter:["style"]});

  window.SpellSpriteSync={syncFrame:()=>applyFrame(frame),setIdle};
})();
