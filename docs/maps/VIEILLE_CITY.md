# ビエイユシティ — implementation-facing map specification

Canonical source: Notion `エリア・マップ` → `ビエイユシティ`.

## Map identity

- Display name: `ビエイユシティ`
- Internal map ID: `kyoto_city`
- Model: 京都市
- Field size: `144 x 104` tiles
- The city is implemented as one continuous field map, following the large-field approach used by ラメールシティ.

## Current implementation scope

This first implementation contains roads only.

- Roads are laid out as a regular orthogonal grid.
- No buildings are placed.
- No flowers, trees, street furniture, labels, or other decorative objects are placed.
- Non-road blocks remain plain placeholder ground.
- Only road tiles are walkable in this initial version.

## Road tile

- Source asset: `assets/tiles/vieille/road.png`
- Asset size: `96 x 96`
- The tile contains only the stone road surface. It does not contain grass, flowers, or roadside decoration.
- Runtime styling is injected by `js/vieille-city.js`.

## Runtime

- `js/vieille-city.js` owns the `144 x 104` logical road layout and collision for `kyoto_city`.
- The map uses the same visible-buffer approach as ラメールシティ rather than keeping every logical tile in the DOM.
- Visible tile budget: `32 x 24 = 768` tiles.
- Map coordinates and collision remain logical 144×104 coordinates.

## Temporary access

No permanent city entrance, buildings, events, or destination connections are defined by this initial road-only implementation.
