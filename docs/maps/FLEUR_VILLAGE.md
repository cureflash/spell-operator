# フルール村 — 実装仕様

Canonical design source: Notion `エリア・マップ` / `アセット・素材`.

## 新規ゲーム開始地点

- `GAME START` で新規ゲームを開始した場合、最初に表示するフィールドはソフィーの家2階。
- 内部マップIDは `house2`。
- 既存の2階デフォルト配置を使用する。
- セーブデータのロード時は保存済みマップを優先し、この開始地点へ強制移動しない。

## ソフィーの家2階 — タイルマップ編集

- 2階の見た目は32×32タイルを配置して編集できる専用Webツールを用意する。
- エディタ: `tools/tilemap-editor.html`。
- 現行 `house2` は12×9マス。
- 編集レイヤーは `床・壁` / `家具` / `上層` / `当たり判定`。
- エディタで完成した部屋は384×288の合成画像へフラット化し、元タイルセットそのものはゲームへコピーしない。
- `このブラウザのゲームへ反映` を実行すると、同一オリジンの localStorage `spell-operator-tilemap:house2` へ完成マップと当たり判定を保存する。
- ゲーム側 `js/tilemap-runtime.js` は localStorage の編集版を優先し、未設定時は `assets/maps/house2-layout.json` を読む。
- PC位置 `(9,2)`、階段 `(10,7)`、新規ゲーム開始時のソフィー `(10,6)` / ルミエル `(10,7)` は現行イベント実装との互換性のため固定する。
- JSONを書き出して `assets/maps/house2-layout.json` と置き換えることで、確定版を全ユーザー向けに反映できる。

### 女の子用部屋タイルセット

- 素材: ドット絵世界「女の子用の部屋」。
- 素材ページ: `https://yms.main.jp/dotartworld/page2/tile-rooms01.html`。
- 元画像は256×1120px、32×32タイルとして扱う。
- サイト利用規約ではゲーム・アプリへの利用と改変は可、素材そのものの二次配布は禁止。
- そのため元PNGは公開GitHubリポジトリへ格納しない。ユーザーが素材ページから保存したPNGをエディタへローカル読み込みする。
- 広く配布するゲームでは `ドット絵世界 / http://yms.main.jp` をクレジットする。

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
