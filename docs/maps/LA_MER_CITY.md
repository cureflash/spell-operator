# ラメールシティ — implementation-facing map specification

Canonical source: Notion `エリア・マップ` → `ラメールシティ`.

## Map identity

- Display name: `ラメールシティ`
- Internal map ID: `la_mer_city`
- Field size: `144 x 104` tiles
- The city is implemented as one continuous field map.
- The former `36 x 26` district maps keep approximately their original scale and are stitched into one large field instead of being compressed into a small 36×28 map.

## Layout

Each logical block below is approximately one former 36×26 map sector.

```text
                         六甲山（ダンジョン）

山            山         外国人居留地          山

西道路        元町       三宮                  東道路

海岸          港1        港2                   海
```

Game-space interpretation:

- North: 六甲山. The former 六甲山 sector scale is retained. Dungeon interior transition is not implemented yet.
- North-central: 外国人居留地. The former sector scale is retained, including high ground, stone-paved streets, slopes, and foreign-style buildings.
- Center: 三宮. The former central-city sector scale is retained, including the central recovery/service facility.
- West: 元町商店街. The former arcade sector scale is retained with four shop fronts.
- South-west / south-central: 港1 and 港2. Each occupies approximately one former 36×26 port-map sector.
- Far west / south-west: 須磨〜明石をモデルにした海岸. The former sector scale is retained with mountain, coastal road, sandy beach, and sea adjacent.
- West of 元町: 西道路 sector.
- East of 三宮: 東道路 sector. The actual city-entry event on the east edge is intentionally not implemented yet.
- Background sectors that are not playable districts are represented as mountain or sea.

The seams between sectors are adjusted only enough to make the intended routes continuously walkable. The district layouts are not scaled down to fit the combined map.

## Road / ground tiles

The La Mer road network uses the AI-derived white-stone ground pattern in `assets/tiles/la_mer/ground.svg`.

- General roads: AI white-stone pattern
- Urban pavement / Motomachi: same 3×3 pattern with offset origin
- Foreign settlement stone paving: same pattern with offset origin
- Harbor pavement: same pattern with a slightly darker treatment
- Plazas: same pattern with another offset origin

`css/la-mer-map.css` owns these surfaces. Pipoya road chips are not used for the La Mer road surface.

The logical route geometry and collision in `js/la-mer-expanded.js` are retained. Sea is rendered separately as a blue base plus wave/highlight effect.

## Rendering

- The logical map remains `144 x 104` tiles for movement and collision.
- The browser must not create one DOM node for every logical tile at once.
- Runtime rendering keeps only a player-centered visible buffer in the DOM. The current budget is `32 x 24 = 768` tile nodes, plus a small set of labels/entities.
- The visible buffer is refreshed only when the player approaches its safe margin, rather than rebuilding on every single step.
- This rendering optimization must not change map coordinates, collision, save data, or the continuous one-map design.

## AI加工タイル素材・仮配置

AI生成の港町素材案を32pxグリッドへ再構成した仮素材を登録している。

- アトラス: `assets/tiles/la_mer_ai_pack.svg`
- 地面3×3: `assets/tiles/la_mer/ground.svg`
- 噴水: `assets/tiles/la_mer/fountain.svg`
- ベンチ: `assets/tiles/la_mer/bench.svg`
- 花壇: `assets/tiles/la_mer/flowerbed.svg`
- 街灯: `assets/tiles/la_mer/lamp.svg`
- エディタ素材セット名: `ラメールシティ AI加工素材`
- 大型素材は複数マスの矩形スタンプとして扱う。
- 海面は画像タイルを全面敷き詰めるのではなく、青色ベース + 波・反射エフェクトで表現する。

通常ゲームでは `js/la-mer-ai-preview.js` が外観検討用の仮配置を重ねる。

仮配置対象:
- 三宮: 青屋根建物A/B
- 港1: 市場、ボート、石橋、街灯
- 港2: 市場、ランドマーク建物、ボート、街灯
- 外国人居留地: 噴水、ベンチ、花壇、街灯
- 道路 / 石畳 / 港舗装 / 広場: AI白石畳3×3
- 海: 青色ベース + 水面エフェクト

この仮配置は既存の `144 x 104` 論理座標・既存の移動経路・セクター構造を変更しない。最終配置ではなく、マップエディタで調整するための叩き台である。

## Temporary access

Until the external city entrance is implemented, the field menu has the temporary `イードウ` command.

- `イードウ → フルール村` targets map ID `town`.
- `イードウ → ラメールシティ` targets map ID `la_mer_city`.
- Destination choice uses the normal Lumiere confirmation/casting/fade sequence defined in `docs/GAME_SPEC.md`.
- This is currently a development/access route and does not define the eventual east-edge entrance event.

## Current interaction scope

- Walking/collision on the integrated field is implemented.
- 三宮・元町・外国人居留地・六甲山・港1・港2・海岸・東道路・西道路 are connected continuously on foot.
- The central facility, shop fronts, port buildings, foreign-style buildings, and 六甲山 are currently geometry / landmarks unless separately specified later.
- No east-edge entrance transition is added in this implementation.
- No 六甲山 dungeon interior transition is added in this implementation.

## BGM

`la_mer_city` uses PeriTune `Resort5`, as registered in `docs/GAME_SPEC.md` and `js/game-bgm.js`.
