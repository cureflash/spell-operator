(() => {
  "use strict";
  const world=document.getElementById("field-world");
  if(!world)return;

  function render(){
    world.querySelector(".house-room-layer")?.remove();
    const map=world.dataset.map;
    if(map!=="house1"&&map!=="house2")return;

    const layer=document.createElement("div");
    layer.className=`house-room-layer ${map==="house1"?"house1-layer":"house2-layer"}`;

    const tilemap=document.createElement("div");
    tilemap.className="house-tilemap";
    tilemap.setAttribute("aria-hidden","true");
    layer.appendChild(tilemap);

    world.insertBefore(layer,world.firstChild);
  }

  const mapObserver=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.type==="attributes"&&m.attributeName==="data-map")){
      requestAnimationFrame(render);
    }
  });
  mapObserver.observe(world,{attributes:true,attributeFilter:["data-map"]});

  const childObserver=new MutationObserver(()=>{
    const map=world.dataset.map;
    if((map==="house1"||map==="house2")&&!world.querySelector(".house-room-layer")){
      requestAnimationFrame(render);
    }
  });
  childObserver.observe(world,{childList:true});

  render();
})();