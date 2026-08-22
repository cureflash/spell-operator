(function (root) {
  "use strict";

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const key = (x, y) => `${x},${y}`;
  const opposite = { up: "down", down: "up", left: "right", right: "left" };

  const directionFromDelta = (dx, dy, fallback = "down") => {
    if (dx === 0 && dy === 0) return fallback;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  };

  class FollowFieldModel {
    constructor({ width, height, blocked = [], player, follower }) {
      this.width = width;
      this.height = height;
      this.blocked = new Set(blocked);
      this.player = { ...player };
      this.follower = { ...follower };
    }

    inBounds(x, y) {
      return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }

    front(entity = this.player) {
      const direction = DIRS[entity.facing] || DIRS.down;
      return { x: entity.x + direction.x, y: entity.y + direction.y };
    }

    isPassableOverride(x, y) {
      return this.width === 12 && this.height === 9 && x === 10 && (y === 4 || y === 5);
    }

    canMoveTo(x, y) {
      if (!this.inBounds(x, y)) return false;
      return this.isPassableOverride(x, y) || !this.blocked.has(key(x, y));
    }

    tryMove(direction) {
      const vector = DIRS[direction];
      if (!vector) return { moved: false, reason: "direction" };

      this.player.facing = direction;
      const next = { x: this.player.x + vector.x, y: this.player.y + vector.y };
      if (!this.canMoveTo(next.x, next.y)) return { moved: false, reason: "blocked", next };

      const previous = { ...this.player };
      const followerPrevious = { ...this.follower };
      const followerDx = previous.x - followerPrevious.x;
      const followerDy = previous.y - followerPrevious.y;

      this.player.x = next.x;
      this.player.y = next.y;
      this.follower.x = previous.x;
      this.follower.y = previous.y;
      this.follower.facing = directionFromDelta(followerDx, followerDy, followerPrevious.facing || direction);

      return {
        moved: true,
        previous,
        followerPrevious,
        next: { ...this.player },
        follower: { ...this.follower }
      };
    }

    isPassable(x, y) {
      return this.inBounds(x, y) && this.canMoveTo(x, y);
    }

    normalizeFollower() {
      const player = this.player;
      const follower = this.follower;
      if (!player || !follower) return;

      const distance = Math.abs(player.x - follower.x) + Math.abs(player.y - follower.y);
      if (distance === 1 && this.isPassable(follower.x, follower.y)) return;

      const behind = opposite[player.facing] || "left";
      const order = [behind, "left", "right", "up", "down"].filter((direction, index, all) => all.indexOf(direction) === index);
      for (const direction of order) {
        const vector = DIRS[direction];
        const x = player.x + vector.x;
        const y = player.y + vector.y;
        if (!this.isPassable(x, y)) continue;
        follower.x = x;
        follower.y = y;
        follower.facing = player.facing || "down";
        return;
      }

      follower.x = player.x;
      follower.y = player.y;
      follower.facing = player.facing || "down";
    }

    snapshot() {
      return { player: { ...this.player }, follower: { ...this.follower } };
    }

    restore(snapshot) {
      if (snapshot?.player) Object.assign(this.player, snapshot.player);
      if (snapshot?.follower) Object.assign(this.follower, snapshot.follower);
      this.normalizeFollower();
    }
  }

  root.SpellFieldModel = { FollowFieldModel, DIRS, key };
  if (typeof module !== "undefined" && module.exports) module.exports = root.SpellFieldModel;
})(typeof window !== "undefined" ? window : globalThis);
