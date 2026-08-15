(() => {
  "use strict";

  const NPCS=[
    {id:"field-npc",facing:"left"},
    {id:"field-librarian",facing:"down"},
    {id:"field-parts-owner",facing:"left"},
    {id:"field-traveler",facing:"down"}
  ];

  const opposite={up:"down",down:"up",left:"right",right:"left"};

  function readPos(el){
    if(!el)return null;
    const x=Number(el.style.getPropertyValue("--x"));
    const y=Number(el.style.getPropertyValue("--y"));
    return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
  }

  function setDefaults(){
    for(const npc of NPCS){
      const el=document.getElementById(npc.id);
      if(el&&!el.dataset.facing)el.dataset.facing=npc.facing;
    }
  }

  function faceAdjacentNpc(){
    const player=document.getElementById("field-player");
    const p=readPos(player);
    const dir=player?.dataset.facing||"down";
    if(!player||!p)return;

    const delta={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[dir]||[0,1];
    const tx=p.x+delta[0],ty=p.y+delta[1];

    for(const npc of NPCS){
      const el=document.getElementById(npc.id);
      const n=readPos(el);
      if(n&&n.x===tx&&n.y===ty){
        el.dataset.facing=opposite[dir]||"down";
        return;
      }
    }
  }

  setDefaults();
  document.addEventListener("keydown",event=>{
    if(event.code==="KeyZ"||event.key==="z"||event.key==="Z")faceAdjacentNpc();
  },true);
  document.getElementById("field-action")?.addEventListener("click",faceAdjacentNpc,true);
})();