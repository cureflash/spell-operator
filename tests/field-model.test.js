const assert = require('assert');
const { FollowFieldModel } = require('../js/field-model.js');

{
  const model = new FollowFieldModel({
    width: 6,
    height: 6,
    blocked: ['4,3'],
    player: { x: 2, y: 3, facing: 'right' },
    follower: { x: 1, y: 3, facing: 'right' }
  });

  let result = model.tryMove('right');
  assert.equal(result.moved, true);
  assert.deepEqual([model.player.x, model.player.y], [3, 3]);
  assert.deepEqual([model.follower.x, model.follower.y], [2, 3]);

  result = model.tryMove('up');
  assert.equal(result.moved, true);
  assert.deepEqual([model.player.x, model.player.y], [3, 2]);
  assert.deepEqual([model.follower.x, model.follower.y], [3, 3]);

  result = model.tryMove('down');
  assert.equal(result.moved, true);
  assert.deepEqual([model.player.x, model.player.y], [3, 3]);
  assert.deepEqual([model.follower.x, model.follower.y], [3, 2]);

  result = model.tryMove('right');
  assert.equal(result.moved, false);
  assert.deepEqual([model.player.x, model.player.y], [3, 3]);
  assert.deepEqual([model.follower.x, model.follower.y], [3, 2]);
}

{
  const house = new FollowFieldModel({
    width: 12,
    height: 9,
    blocked: ['10,4', '10,5'],
    player: { x: 10, y: 6, facing: 'up' },
    follower: { x: 10, y: 7, facing: 'up' }
  });
  assert.equal(house.canMoveTo(10, 5), true, 'house 2F stair corridor y=5 stays passable');
  assert.equal(house.canMoveTo(10, 4), true, 'house 2F stair corridor y=4 stays passable');
}

{
  const model = new FollowFieldModel({
    width: 8,
    height: 8,
    blocked: [],
    player: { x: 4, y: 4, facing: 'right' },
    follower: { x: 3, y: 4, facing: 'right' }
  });
  model.restore({
    player: { x: 4, y: 4, facing: 'right' },
    follower: { x: 0, y: 0, facing: 'down' }
  });
  const distance = Math.abs(model.player.x - model.follower.x) + Math.abs(model.player.y - model.follower.y);
  assert.equal(distance, 1, 'legacy follower snapshots are normalized adjacent to Sophie');
  assert.deepEqual([model.follower.x, model.follower.y], [3, 4], 'follower prefers the tile behind Sophie');
}

console.log('field-model tests passed');
