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

  function build1F(layer){
    piece(layer,"house-shell from-room-set",1,1,18,13);
    piece(layer,"house-top-wall from-room-set",1.34,1.34,17.32,1.78);

    /* Kitchen: normal room set structure, cute set accents. */
    piece(layer,"kitchen-zone from-room-set",1.34,3.12,7.25,3.55);
    piece(layer,"kitchen-counter from-room-set",2,2,5,2);
    piece(layer,"fridge from-room-set",5.88,2.05,1.02,1.9);
    piece(layer,"flower-pot from-cute-set",8.85,3.2,.72,.72);

    /* Dining: wooden furniture with pink/fancy textile accents. */
    piece(layer,"dining-rug from-cute-set",3.18,6.42,6.65,3.55);
    piece(layer,"dining-table from-room-set",4,7,5,2);

    /* Living area: classic furniture plus cute upholstery. */
    piece(layer,"living-rug from-room-set",10.35,5.28,6.45,3.65);
    piece(layer,"sofa from-cute-set",11,6,5,2);
    piece(layer,"cabinet from-room-set",15,4,4,2);

    piece(layer,"stairs from-room-set",17,2,1,2);
    piece(layer,"entry-mat from-room-set",8.0,12.35,3,1.05);

    /* Light visual zoning without blocking additional walkable cells. */
    piece(layer,"room-divider",9.72,3.1,.16,3.55);
  }

  function build2F(layer){
    piece(layer,"house-shell from-cute-set",1,1,18,13);
    piece(layer,"house-top-wall from-cute-set",1.34,1.34,17.32,1.78);

    /* Two clearly separate sleeping spaces. */
    piece(layer,"bed sophie-bed from-cute-set",2,2,4,3);
    piece(layer,"name-plaque",2.45,4.18,3.1,.62,"SOPHIE");
    piece(layer,"bed lumiere-bed from-cute-set",7,2,4,3);
    piece(layer,"name-plaque",7.35,4.18,3.3,.62,"LUMIERE");

    /* Normal room-set wood furniture keeps the room from becoming uniformly pink. */
    piece(layer,"study-desk from-room-set",13,2,5,2);
    piece(layer,"bookcase from-room-set",11.25,1.42,1.45,1.45);
    piece(layer,"dresser from-cute-set",2,8,3,2);
    piece(layer,"wardrobe from-room-set",15,7,3,3);

    /* Walkable cute center area. */
    piece(layer,"cute-rug from-cute-set",6,7,7,4);
    piece(layer,"wall-picture from-cute-set",5.45,1.47,1.05,1.05);
    piece(layer,"curtain from-cute-set",9.0,1.4,1.65,1.35);

    /* Stairs are kept exactly on the transition position. */
    piece(layer,"stairs from-room-set",17,12.05,1,1.95);
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

  /* buildMap() clears selected map children, so also re-render when a new tile grid arrives. */
  const childObserver=new MutationObserver(()=>{
    const map=world.dataset.map;
    if((map==="house1"||map==="house2")&&!world.querySelector(".house-room-layer"))requestAnimationFrame(render);
  });
  childObserver.observe(world,{childList:true});

  render();
})();