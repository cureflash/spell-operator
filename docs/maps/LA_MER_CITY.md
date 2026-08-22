# ラメールシティ — implementation-facing map specification

Canonical source: Notion `エリア・マップ` → `ラメールシティ`.

## Map identity

- Display name: `ラメールシティ`
- Internal map ID: `la_mer_city`
- Field size: `36 x 28` tiles
- The city is implemented as one continuous field map, not as separate Sannomiya / Motomachi / port / settlement submaps.

## Layout

The current integrated layout follows the Google Sheet `Spell Operator マップ編集用` → `ラメールシティ` tab.

```text
                 六甲山（ダンジョン）

山      山       外国人居留地      山

道路    元町        三宮         東道路

海岸    港1         港2           海
```

Game-space interpretation:

- North: 六甲山. It is visually represented as a dungeon region, but the dungeon interior transition is not implemented yet.
- North-central: 外国人居留地. Sloped / stone-paved streets and foreign-style buildings.
- Center: 三宮. Main city hub and the central recovery/service facility.
- West: 元町商店街. Arcade-style shopping street with four shop fronts.
- South-west / south-central: 港1 and 港2, representing Kobe Port.
- Far west / south-west: 須磨〜明石をモデルにした海岸. Mountain, coastal road, sandy beach, and sea are adjacent.
- East: road leading out of the city. The actual city-entry event on this edge is intentionally not implemented yet.

## Temporary access

Until the external city entrance is implemented, the field menu has a temporary `移動` command.

- `移動 → フルール村` warps to map ID `town`.
- `移動 → ラメールシティ` warps to map ID `la_mer_city`.
- This is a temporary development/access route; it does not establish a world-travel lore mechanic.

## Current interaction scope

- Walking/collision on the integrated field is implemented.
- The central facility, shop fronts, port buildings, foreign-style buildings, and 六甲山 are currently map geometry / landmarks only unless separately specified later.
- No east-edge entrance transition is added in this implementation.
- No 六甲山 dungeon interior transition is added in this implementation.

## BGM

`la_mer_city` uses PeriTune `Resort5`, as already registered in `docs/GAME_SPEC.md` and `js/game-bgm.js`.
