const assert = require('assert');
const { FollowFieldModel } = require('../js/field-model.js');
const m = new FollowFieldModel({width:6,height:6,blocked:['4,3'],player:{x:2,y:3,facing:'right'},follower:{x:1,y:3,facing:'right'}});
let r=m.tryMove('right'); assert.equal(r.moved,true); assert.deepEqual([m.player.x,m.player.y],[3,3]); assert.deepEqual([m.follower.x,m.follower.y],[2,3]);
r=m.tryMove('up'); assert.equal(r.moved,true); assert.deepEqual([m.player.x,m.player.y],[3,2]); assert.deepEqual([m.follower.x,m.follower.y],[3,3]);
r=m.tryMove('down'); assert.equal(r.moved,true); assert.deepEqual([m.player.x,m.player.y],[3,3]); assert.deepEqual([m.follower.x,m.follower.y],[3,2]);
r=m.tryMove('right'); assert.equal(r.moved,false); assert.deepEqual([m.player.x,m.player.y],[3,3]); assert.deepEqual([m.follower.x,m.follower.y],[3,2]);
console.log('field-model tests passed');
