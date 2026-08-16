(() => {
  "use strict";
  const fieldMap=document.getElementById("field-map");
  const world=document.getElementById("field-world");
  const player=document.getElementById("field-player");
  const follower=document.getElementById("field-follower");
  if(!fieldMap||!world||!player||!follower)return;

  /*
   * One coordinate system for every map.
   * Sophie and Lumiere always live inside field-world and their --x/--y values
   * are their real tile positions. Large maps keep Sophie visually centred by
   * moving field-world with the camera; compact rooms keep field-world centred,
   * so the characters themselves visibly walk across the room.
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
  window.SpellPartyLockstep={sync:attach,isCompactRoom:()=>world.dataset.map==="house1"||world.dataset.map==="house2"};
})();
