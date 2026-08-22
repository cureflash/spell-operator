(() => {
  "use strict";

  const DESTINATIONS=Object.freeze([
    Object.freeze({id:"la_mer_city",name:"ラメールシティ"})
  ]);

  function destinations(){
    return DESTINATIONS.map(item=>({...item}));
  }

  function destinationFor(id){
    return DESTINATIONS.find(item=>item.id===id)||null;
  }

  function warpTo(id){
    const destination=destinationFor(id);
    if(!destination||!window.SpellField?.activateMap)return false;

    window.SpellField.activateMap(destination.id,{from:"fast-travel"});

    requestAnimationFrame(()=>{
      window.SpellPlaces?.refresh?.();
      window.SpellBgm?.sync?.();
    });
    return true;
  }

  window.SpellTravel={
    destinations,
    destinationFor,
    warpTo
  };
})();
