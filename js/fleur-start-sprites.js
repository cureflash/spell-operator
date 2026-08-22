(() => {
  "use strict";

  const field=window.SpellField;
  if(!field)return;

  const definitions={
    school:{
      key:"school",
      name:"学校",
      mapId:"town",
      classes:["school-roof","school-building","school-door"],
      source:"Pipoya FREE RPG Tileset 32x32",
      stylesheet:"css/pipoya-map.css"
    },
    library:{
      key:"library",
      name:"ピジブルの図書館",
      mapId:"town",
      classes:["library-roof","library-building","library-door"],
      source:"Pipoya FREE RPG Tileset 32x32",
      stylesheet:"css/pipoya-map.css"
    },
    sophie_home:{
      key:"sophie_home",
      name:"ソフィーの家",
      mapId:"town",
      classes:["workshop-roof","workshop-building","workshop-door"],
      source:"Pipoya FREE RPG Tileset 32x32",
      stylesheet:"css/pipoya-map.css",
      legacyClassPrefix:"workshop"
    },
    parts_shop:{
      key:"parts_shop",
      name:"パーツ屋",
      mapId:"town",
      classes:["parts-roof","parts-building","parts-door"],
      source:"Pipoya FREE RPG Tileset 32x32",
      stylesheet:"css/pipoya-map.css"
    },
    magic_shop:{
      key:"magic_shop",
      name:"魔導具店",
      mapId:"town",
      classes:["shop-roof","shop-building","shop-door"],
      source:"Pipoya FREE RPG Tileset 32x32",
      stylesheet:"css/pipoya-map.css"
    }
  };

  const registry=new Map(Object.entries(definitions).map(([key,value])=>[key,Object.freeze({...value,classes:Object.freeze([...value.classes])})]));
  window.SpellMapSprites={
    get:key=>registry.get(key)||null,
    has:key=>registry.has(key),
    all:()=>[...registry.values()],
    keys:()=>[...registry.keys()]
  };

  function decorateTownFacilitySprites(){
    if(field.currentMap?.()!=="town")return;
    for(const sprite of registry.values()){
      for(const className of sprite.classes){
        document.querySelectorAll(`#field-world .${className}`).forEach(tile=>{
          tile.dataset.facilitySprite=sprite.key;
          tile.dataset.facilityName=sprite.name;
        });
      }
    }
  }

  if(typeof field.activateMap==="function"){
    const originalActivateMap=field.activateMap.bind(field);
    field.activateMap=(id,options={})=>{
      const result=originalActivateMap(id,options);
      requestAnimationFrame(decorateTownFacilitySprites);
      return result;
    };
  }

  if(typeof field.startNewGame==="function"){
    const originalStartNewGame=field.startNewGame.bind(field);
    field.startNewGame=()=>{
      const result=originalStartNewGame();
      field.activateMap?.("house2",{from:"game-start",silent:true});
      requestAnimationFrame(()=>{
        window.SpellPlaces?.refresh?.();
        window.SpellBgm?.sync?.();
      });
      return result;
    };
  }

  decorateTownFacilitySprites();
})();
