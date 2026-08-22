# フルール村 — 実装仕様

Canonical design source: Notion `エリア・マップ` / `アセット・素材`.

## 新規ゲーム開始地点

- `GAME START` で新規ゲームを開始した場合、最初に表示するフィールドはソフィーの家2階。
- 内部マップIDは `house2`。
- 既存の2階デフォルト配置を使用する。
- セーブデータのロード時は保存済みマップを優先し、この開始地点へ強制移動しない。

## フルール村の施設スプライト登録

フルール村の外観施設は、既存のPipoya系マップチップで構成する施設スプライトとして次を登録する。

| key | 施設 | 既存CSSクラス |
| --- | --- | --- |
| `school` | 学校 | `school-roof`, `school-building`, `school-door` |
| `library` | ピジブルの図書館 | `library-roof`, `library-building`, `library-door` |
| `sophie_home` | ソフィーの家 | `workshop-roof`, `workshop-building`, `workshop-door` |
| `parts_shop` | パーツ屋 | `parts-roof`, `parts-building`, `parts-door` |
| `magic_shop` | 魔導具店 | `shop-roof`, `shop-building`, `shop-door` |

- `workshop-*` は旧実装名として当面維持するが、ゲーム上の施設名はソフィーの家。
- 登録情報はランタイムの `SpellMapSprites` から参照できるようにする。
- 施設外観の大規模な描き直しはこの変更には含めない。
