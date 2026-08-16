(() => {
  "use strict";
  const Field=window.SpellFieldModel;
  const Model=Field?.FollowFieldModel;
  const key=Field?.key;
  if(!Model||!key||Model.prototype.__followerNormalizePatched)return;

  const originalRestore=Model.prototype.restore;
  const opposite={up:"down",down:"up",left:"right",right:"left"};
  const vectors={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};

  function isAdjacent(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;}
  function isPassable(model,x,y){return model.inBounds(x,y)&&!model.blocked.has(key(x,y));}

  function normalize(model){
    const p=model.player,f=model.follower;
    if(!p||!f)return;
    if(isAdjacent(p,f)&&isPassable(model,f.x,f.y))return;

    const behind=opposite[p.facing]||"left";
    const order=[behind,"left","right","up","down"].filter((d,i,a)=>a.indexOf(d)===i);
    for(const dir of order){
      const v=vectors[dir];
      const x=p.x+v.x,y=p.y+v.y;
      if(isPassable(model,x,y)){
        f.x=x;f.y=y;f.facing=p.facing||"down";
        return;
      }
    }

    /* Last resort: never leave a legacy follower several tiles away. */
    f.x=p.x;f.y=p.y;f.facing=p.facing||"down";
  }

  Model.prototype.restore=function(snapshot){
    originalRestore.call(this,snapshot);
    normalize(this);
  };
  Model.prototype.__followerNormalizePatched=true;
  window.SpellFollowerNormalize={normalize};
})();
