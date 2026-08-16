(() => {
  "use strict";
  const fieldMap=document.getElementById("field-map");
  const world=document.getElementById("field-world");
  const player=document.getElementById("field-player");
  const follower=document.getElementById("field-follower");
  if(!fieldMap||!world||!player||!follower)return;

  /*
   * One rendering model on every map:
   * - Sophie and Lumiere always live in field-world.
   * - --x/--y are their real tile coordinates.
   * - scrolling maps centre Sophie by moving field-world (the camera), never by
   *   moving the actor to a separate viewport layer.
   * - compact house maps keep the world centred, so both actors visibly walk.
   *
   * Keeping a single parent/coordinate system prevents the old race where
   * field-map and field-world alternately owned the two actors.
   */
  function attach(){
    player.classList.remove("room-grid-position");
    follower.classList.remove("room-grid-position","party-lockstep");
    if(player.parentElement!==world)world.appendChild(player);
    if(follower.parentElement!==world)world.appendChild(follower);
  }

  attach();

  const observer=new MutationObserver(()=>{
    if(player.parentElement!==world||follower.parentElement!==world)attach();
  });
  observer.observe(fieldMap,{childList:true,subtree:true});

  window.addEventListener("resize",attach);
  window.SpellPartyLockstep={
    sync:attach,
    isCompactRoom:()=>world.dataset.map==="house1"||world.dataset.map==="house2"
  };
})();
