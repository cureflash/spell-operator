(() => {
  "use strict";
  const world=document.getElementById("field-world");
  if(!world)return;

  function piece(parent,className,x,y,w,h,text=""){
    const el=document.createElement("div");
    el.className=`house-piece ${className}`;
    el.style.setProperty("--x",x);
    el.style.setProperty("--y",y);
    el.style.setProperty("--w",w);
    el.style.setProperty("--h",h);
    if(text)el.textContent=text;
    parent.appendChild(el);
    return el;
  }

  // 11x9: intentionally close to Pokémon Ruby/Sapphire's 11x9 player-house 1F.
  function build1F(layer){
    piece(layer,"house-shell from-room-set",0,0,11,9);
    piece(layer,"house-top-wall from-room-set",.34,.34,10.32,1.28);

    piece(layer,"kitchen-zone from-room-set",.55,1.28,4.55,2.05);
    piece(layer,"kitchen-counter from-room-set",1,1,4,2);
    piece(layer,"fridge from-room-set",4.15,1.02,.82,1.78);

    piece(layer,"dining-rug from-cute-set",1.25,3.35,4.5,3.1);
    piece(layer,"dining-table from-room-set",2,4,3,2);

    piece(layer,"living-rug from-room-set",5.65,2.65,3.7,2.25);
    piece(layer,"sofa from-cute-set",6,3,3,1.35);
    piece(layer,"cabinet from-room-set",8,1,2,1.2);
    piece(layer,"flower-pot from-cute-set",9.12,2.15,.58,.58);

    piece(layer,"stairs from-room-set",9,1.72,1,1.3);
    piece(layer,"entry-mat from-room-set",4.05,7.12,2.9,.72);
  }

  // 12x9: FRLG-style bedroom footprint, widened only enough for two occupants.
  function build2F(layer){
    piece(layer,"house-shell from-cute-set",0,0,12,9);
    piece(layer,"house-top-wall from-cute-set",.34,.34,11.32,1.28);

    piece(layer,"bed sophie-bed from-cute-set",1,1,3,3);
    piece(layer,"bed lumiere-bed from-cute-set",4,1,3,3);

    piece(layer,"study-desk from-room-set",8,1,3,2);
    piece(layer,"bookcase from-room-set",7.05,1.02,.82,1.72);

    piece(layer,"dresser from-cute-set",1,5,2,1.25);
    piece(layer,"wardrobe from-room-set",9,4,2,2);
    piece(layer,"cute-rug from-cute-set",4,4,4,2.65);
    piece(layer,"plushie from-cute-set",7.45,5.65,.72,.72,"★");
    piece(layer,"wall-picture from-cute-set",6.95,.82,.8,.8);

    piece(layer,"stairs from-room-set",10,6.7,1,1.3);
  }

  function render(){
    world.querySelector(".house-room-layer")?.remove();
    const map=world.dataset.map;
    if(map!=="house1"&&map!=="house2")return;
    const layer=document.createElement("div");
    layer.className=`house-room-layer ${map==="house1"?"house1-layer":"house2-layer"}`;
    if(map==="house1")build1F(layer);else build2F(layer);
    world.insertBefore(layer,world.firstChild);
  }

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==="attributes"&&m.attributeName==="data-map"))requestAnimationFrame(render);
  });
  observer.observe(world,{attributes:true,attributeFilter:["data-map"]});

  const childObserver=new MutationObserver(()=>{
    const map=world.dataset.map;
    if((map==="house1"||map==="house2")&&!world.querySelector(".house-room-layer"))requestAnimationFrame(render);
  });
  childObserver.observe(world,{childList:true});

  render();
})();
