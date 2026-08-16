(() => {
  "use strict";
  const Model=window.SpellFieldModel?.FollowFieldModel;
  if(!Model)return;
  const proto=Model.prototype;
  if(proto.__houseCorridorPatched)return;
  const original=proto.canMoveTo;
  proto.canMoveTo=function(x,y){
    /* House 2F is the only 12x9 map. Keep the stair landing at x=10 open so
       entering the floor never traps the player against the wardrobe/wall. */
    if(this.width===12&&this.height===9&&x===10&&(y===4||y===5))return this.inBounds(x,y);
    return original.call(this,x,y);
  };
  proto.__houseCorridorPatched=true;
})();