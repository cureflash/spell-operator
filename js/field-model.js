(function (root) {
  "use strict";
  const DIRS = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  const key = (x,y) => `${x},${y}`;
  class FollowFieldModel {
    constructor({ width, height, blocked = [], player, follower }) { this.width=width; this.height=height; this.blocked=new Set(blocked); this.player={...player}; this.follower={...follower}; }
    inBounds(x,y){ return x>=0&&y>=0&&x<this.width&&y<this.height; }
    front(entity=this.player){ const d=DIRS[entity.facing]||DIRS.down; return {x:entity.x+d.x,y:entity.y+d.y}; }
    canMoveTo(x,y){ return this.inBounds(x,y)&&!this.blocked.has(key(x,y)); }
    tryMove(direction){
      const d=DIRS[direction];
      if(!d)return {moved:false,reason:"direction"};
      this.player.facing=direction;
      this.follower.facing=direction;
      const next={x:this.player.x+d.x,y:this.player.y+d.y};
      if(!this.canMoveTo(next.x,next.y))return {moved:false,reason:"blocked",next};
      const previous={...this.player};
      const followerPrevious={...this.follower};
      this.player.x=next.x;
      this.player.y=next.y;
      /* Party formation: Lumiere moves on the same input tick as Sophie. */
      this.follower.x+=d.x;
      this.follower.y+=d.y;
      return {moved:true,previous,followerPrevious,next:{...this.player},follower:{...this.follower}};
    }
    snapshot(){ return {player:{...this.player},follower:{...this.follower}}; }
    restore(snapshot){ if(snapshot?.player)Object.assign(this.player,snapshot.player); if(snapshot?.follower)Object.assign(this.follower,snapshot.follower); }
  }
  root.SpellFieldModel={FollowFieldModel,DIRS,key}; if(typeof module!=="undefined"&&module.exports)module.exports=root.SpellFieldModel;
})(typeof window!=="undefined"?window:globalThis);
