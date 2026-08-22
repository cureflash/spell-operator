# Spell Operator — ChatGPT Project 引き継ぎ資料

Updated: 2026-08-22

この資料は、Spell Operator を新しい ChatGPT Project / 新しいチャットへ移したときに、古い会話履歴へ依存せず、現在の仕様・実装・未解決事項から作業を再開するための引き継ぎ資料です。

## 0. 最重要ルール

仕様の優先順位は必ず次の順です。

1. 現在の会話でユーザーが明示的に決めた内容
2. Notion の正本データベース
3. GitHub の Markdown 仕様書
4. 現在の実装コード
5. 過去チャットは調査用。仕様の権威にはしない

古いチャットと Notion / Git 仕様が衝突する場合、古いチャットを採用しないでください。

未決定事項を推測で確定しないこと。依頼範囲外の仕様を勝手に変更しないこと。

## 1. 新しいチャット開始時に必ず読むもの

Spell Operator の回答・設計・実装を始める前に、次を実際に読み込むこと。

### Notion

1. `Spell Operator 攻略・仕様Wiki`
   - https://app.notion.com/p/3bf19583748e81b9a285c1e1686db1e2
2. `AI参照・仕様同期ルール`
   - https://app.notion.com/p/3bf19583748e8138aefdfce2079758a3
3. 依頼に関係する Notion データベース / レコード

### GitHub

Repository: `cureflash/spell-operator`

実装を扱う場合は、次の順で確認する。

1. `AGENTS.md`
2. `docs/SPEC_INDEX.md`
3. `docs/PROJECT_HANDOFF.md`
4. `docs/GAME_SPEC.md`
5. `docs/RUNTIME_ARCHITECTURE.md`
6. 対象章・マップ等の仕様書
7. 現在の実装コード

Notion が正本、Git Markdown が実装向けミラー、コードは仕様の実装です。

## 2. 現在のゲーム像

- 2D見下ろし型の冒険RPG。
- フィールド探索、謎解き、実際のPythonプログラミング、コマンド式戦闘を一つのゲーム進行に統合する。
- プログラミングは教材モードではなく、世界内の情報解析・術式構築・攻略手段。
- 魔導書はソースコードではなく **要求仕様**。
- ソフィーが実際に Python コードを書く。
- ルミエルは魔法知識と魔法行使を担当する。
- 戦闘中にコードは書かない。事前に書いてテスト・登録した術式を戦闘で使う。

基本フロー:

```text
ソフィーがPCを開く
↓
魔導書の要求仕様を読む
↓
Pythonを書く
↓
テスト / デバッグ
↓
術式登録
↓
ルミエルが探索・戦闘で実行
```

## 3. ソフィー / ルミエル

### ソフィー

- プレイヤー操作キャラクター。
- 実際に Python を書く担当。
- 情報処理・論理・術式構築を担当。
- 戦闘では物理寄りの前衛。

### ルミエル

- ソフィーの同行者。
- 魔法知識と魔法行使を担当。
- アンドロイドだが、人間の魂がインストールされているため魔法を使える。
- 魔法は身体ではなく魂に反応する。
- ソフィーが構築した術式をルミエル側で実行する。

未決定のまま維持するもの:

- ルミエルに入っている魂が誰のものか
- 誰が、なぜ魂をインストールしたか
- 魂インストールの法的・社会的扱い
- 現在のルミエル人格と元の魂の関係
- 魔法ネットワーク / レイヤーの最終用語

## 4. Python 実行環境

現在は **本物の Python** を使用する。

- `js/python-runner.js`
- `js/python-worker.mjs`
- Pyodide `v0.28.3`
- Web Worker 上で実行
- stdin / stdout 形式でテスト
- 抽象計算コストから消費MPを算出
- `eval`, `exec`, `compile`, `__import__`, `js`, `pyodide`, `micropip` 等は制限

旧 custom mini-language / Skulpt へ戻さないこと。

## 5. 画面スクロール方針

ゲーム中は原則としてブラウザ / ページスクロールを要求しない。

- 通常ゲーム画面は現在の viewport 内に必要情報と主要操作を収める。
- 収まらない場合は密度調整、タブ、ページ切替等で解決する。
- 魔導書 / エディタ画面もこの方針に従う。

## 6. プログラミング画面の今後のUI方針

現在の実装は textarea ベースだが、最終的には VS Code / Cursor に近い構成へ寄せる。

希望レイアウト:

```text
左     : エディタ / ファイル・プラグイン系
中央   : Pythonコード編集領域
右     : 魔導書（過去のコード） / ルミエル支援
右下等 : 実行ボタン / 結果表示
```

ユーザーがペインサイズを変更できるようにする方向。

ルミエルのセリフ欄が実質的にコンソール / ガイダンス役になるため、エラー専用コンソールを別に増やす必要は低い。

この VS Code / Cursor 風UIはまだ本実装されていない。

## 7. プラグイン — 現在の確定仕様

Notion のゲームシステム `プラグイン` が正本。

通常フィールドで `X`:

1. ソフィーがフィールド会話で正確に
   `プラグイン！ルミエル.EXE トランスミッション！`
   と言う。
2. 台詞は通常の文字送り。
3. 文字送り途中の `Z` は全文表示のみ。
4. 全文表示後の次の `Z` でプラグイン確定。
5. 専用SE `可愛く輝く1` を再生。
6. フィールドBGMを停止。
7. ゲーム画面を完全に隠す不透明な全画面演出へ切り替える。
8. `kirayuki1` のキラ雪演出を1回再生。
9. 画像失敗時は発光演出だけでも必ず表示。
10. 演出終了後、最初の利用可能な Python 課題を自動選択してエディタへ直接入る。

メニューの `パソコン` は別ルート。

- プラグイン台詞なし
- キラ雪なし
- 直接魔導書一覧へ入る

プラグイン / PC 用 BGM `Dreambyte` は新しいPCセッションに入るたび 0:00 から再生する。
同一セッション内の魔導書一覧 ↔ エディタでは再スタートしない。

## 8. 2026-08-22 Runtime リファクタリング後の構造

PR #28 `Refactor runtime controllers and audio architecture` を main にマージ済み。

現在の公開キャッシュ番号:

```text
field-model.js?v=4
game.js?v=88
```

公開URL:

`https://cureflash.github.io/spell-operator/?v=88`

### Runtime bootstrap

`js/game.js`

- runtime module manifest を持つ。
- GAME START は全モジュール読み込み完了まで disabled。
- 重要SEの preload 完了も待つ。
- 成功後 `window.SpellRuntimeBoot.ready === true`。

### Audio

`js/audio-manager.js` がブラウザ音声の実再生を一元管理する。

- BGM
- 会話SE `dialog-pop`
- プラグインSE `plugin-sparkle`
- 共通SE音量
- 共通AudioContext
- HTMLAudioによる同一音源fallback

音声機能ごとに別 AudioContext を作らない。

診断:

```js
SpellAudio.status()
SpellAudio.sfxStatus("dialog-pop")
SpellAudio.sfxStatus("plugin-sparkle")
```

### Plug-in

`js/plugin-controller.js` が通常フィールドのプラグイン導線を単独で所有する。

担当:

- X入力
- 台詞
- Z文字送り
- 確定Z
- SE
- BGM停止
- 全画面Kirayuki演出
- 入力ロック
- PC起動
- 最初のPython課題を開く

旧 `plugin-se.js`, `plugin-transition.js`, `plugin-editor-entry.js` は削除済み。

診断:

```js
SpellPlugin.status()
SpellPlugin.testSound()
```

### Field input

`js/field-input-controller.js`

- 移動入力のレート制限
- 1入力バッファ
- 会話 / メニュー / 演出中の移動遮断

### Field scene

`js/field-scene-controller.js`

- ソフィー
- ルミエル
- 敵
- 看板

のDOM配置を `#field-world` に統一する。

### Field model

`js/field-model.js`

- ソフィーの論理移動
- ルミエルの前タイル追従
- 旧セーブデータの追従位置補正
- House 2F の階段通路例外

を所有する。

旧 `house-movement-fix.js`, `follower-normalize.js` 等で monkey patch しない。

### Menu / イードウ

`js/game03-menu.js` が以下を所有。

- メインメニュー
- ステータス
- 設定
- BGM / SE 音量変更
- イードウの目的地選択
- `○○に移動するの？`
- はい / いいえ
- `イードウ！`
- fade
- 補助画面の戻る処理

旧 `ido-confirm-dialog-fix.js` / `z-escape.js` は削除済み。

## 9. 削除済みの後付け patch

PR #28 で以下を廃止した。

- `movement-step-lock.js`
- `house-movement-fix.js`
- `follower-normalize.js`
- `party-lockstep.js`
- `map-scroll-fix.js`
- `ido-confirm-dialog-fix.js`
- `z-escape.js`
- `plugin-se.js`
- `plugin-transition.js`
- `plugin-editor-entry.js`
- `game02-core.js`
- `game02-battle.js`

今後、同じ挙動を直すためだけの `*-fix.js` を安易に追加しない。
担当controller / modelへ修正を入れる。

詳細は `docs/RUNTIME_ARCHITECTURE.md`。

## 10. プラグインSEの現在の注意点

リポジトリに保存されている

`assets/audio/sfx/plugin-sparkle.base64`

は、元データが末尾3 Base64文字欠損している。

現在の `audio-manager.js` は、この特定アセットにだけ既知の `VVV` tail repair を行ってから復元する。

これは「別音を鳴らすfallback」ではない。
元の `可愛く輝く1` を復元するためのアセット固有互換処理。

長期的には、この壊れたBase64を正常なバイナリ音声アセットへ置き換え、repairコードを削除するのが望ましい。

### 現在の最重要未確認点

PR #28 / v88 後、Safari 実機で `可愛く輝く1` が正常に鳴るかはユーザー側の最終確認待ち。

鳴らない場合は追加の推測パッチを入れず、まず:

```js
SpellPlugin.status()
SpellAudio.sfxStatus("plugin-sparkle")
```

の結果を確認する。

## 11. BGM / SE

共通音量設定:

- BGM default `0.5`
- SE default `0.5`
- localStorage に永続化

主なBGM:

- フルール村: PeriTune `Village_Fete`
- PC / 魔導書 / エディタ: PeriTune `Dreambyte`
- ラメールシティ: `Resort5`
- 通常戦闘: `Ancient Gust`
- ボス戦: `Swift_Strike`
- キョウトシティ予約: `Awayuki`

会話文字送りSE:

- `assets/audio/sfx/dialog-pop.wav`
- 文字送りの各可視ステップでポッ音

## 12. フィールド / マップの現在方針

ゲーム全体の世界地図は近畿地方 + 三重をモデルにする。

- フルール村 = 奈良県南部相当
- 他都市は現実の地名を使用可能
- Johto地方のタウンマップのような「都市 + 道路 + 地形」のつながりを参考にする

世界地図から削除済み候補:

- 舞鶴
- 姫路
- 大津
- 串本
- 高野山
- 大台ケ原
- 松坂
- 津
- 志摩

### ラメールシティ

神戸モデル。

1枚の大マップとしての基本配置:

```text
　　　　　　六甲山（ダンジョン）
山　　山　　居留地　山
道路　元町　三宮　　道路（東側から侵入）
海岸　港１　港２　　海
```

- 六甲山 = ダンジョン
- 三宮 = 中心
- 元町 = 西
- 外国人居留地 = 北
- 神戸港 = 南
- さらに西側に須磨～明石をモデルにした海岸
- 東側道路から町へ入る

## 13. Chapter 1 — 現在の正本方向

タイトル:

`第1章 最初の暗号`

流れ:

```text
学校で友達に話す
↓
シーザー暗号を教わる
↓
FDW / key 3
↓
CATへ復号
↓
図書館
↓
Unicode対応表
↓
文字と数値の対応を理解
↓
後半でPythonによる数値文字列暗号処理
```

### シーザー暗号チュートリアル

- 平文 `CAT`
- 暗号文 `FDW`
- 鍵 `3`
- ↑ / ↓ ボタンは **1クリック = 1文字分** 全文を動かす

正しい流れ:

```text
FDW
↓
ECV
↓
DBU
↓
CAT
```

一回で `FDW → CAT` にしてはいけない。

### 後半Pythonで教える方向

```text
numeric string
↓
split()
↓
int()
↓
数値シフト
↓
Unicode番号 → 文字
↓
join / 連結
```

学習要素:

- Caesar cipher
- key
- string
- split
- int
- arithmetic
- loop
- Unicode
- number → character
- string join

## 14. Chapter 1 の provisional 実装

`js/game03-story.js` には現在、後半端末について具体値が実装されているが、正本仕様には昇格していない。

例:

- encrypted string
- subtraction offset
- password
- reward
- Repair 関連

最終暗号、パスワード、報酬、完全攻略ルートはユーザー確認なしに確定しない。

## 15. Pythonエラーのルミエルガイド

実装済み。

- `data/python-error-dialogues.json`
- `js/lumiere-python-errors.js`

Python例外クラス名をキーにしてルミエルの説明へ変換する。

例:

- SyntaxError
- IndentationError
- NameError
- TypeError
- ZeroDivisionError
- RecursionError

生のPythonエラーも下に残す。
単なる出力不一致はPython例外扱いしない。

Notion:

`Pythonエラー・ルミエルナビゲーション`

## 16. 現在の実装テスト

`tests/field-model.test.js`

- 追従移動
- House 2F通行例外
- legacy follower normalization

を検証。

`tests/plugin-transition-smoke.md`

- X
- 台詞
- 文字送りZ
- 確定Z
- 元SE
- Kirayuki
- 直接エディタ
- メニューPCでは演出なし

を手動確認。

`tests/runtime-refactor-smoke.md`

- boot
- audio
- plug-in
- menu
- イードウ
- field movement

の総合スモーク確認。

## 17. GitHub / 公開版

Repository:

`https://github.com/cureflash/spell-operator`

GitHub Pages:

`https://cureflash.github.io/spell-operator/`

現在のキャッシュ確認用:

`https://cureflash.github.io/spell-operator/?v=88`

Pages / Safari キャッシュで古いコードが残ることがある。

「コード上は直っているのにゲームで変わらない」場合は、最初に公開HTMLの `game.js?v=...` を確認する。

ユーザーは実装結果について commit SHA より **PRや公開ページのリンク** を優先して提示されることを望んでいる。

## 18. 実装作業の運用

ユーザーが「やって」「実装して」と言った場合、可能な限り実際にGitHub / Notionを変更する。

推奨Gitフロー:

```text
main確認
↓
feature / fix branch
↓
変更
↓
差分確認
↓
PR
↓
squash merge
↓
公開URL確認
```

新しい確定仕様が入った場合:

```text
現在の会話で決定
↓
Notion更新
↓
Git仕様書更新
↓
実装
```

## 19. 現在の主な未完了 / 次候補

優先的に注意するもの:

1. v88 でプラグインSE `可愛く輝く1` のSafari実機再生確認
2. 壊れた `plugin-sparkle.base64` を正常バイナリ音源へ置換
3. Pythonエディタ画面を VS Code / Cursor 風へ刷新
4. 魔導書 / エディタ画面をページスクロール不要にする
5. ラメールシティの大マップ実装継続
6. 近畿モデルの全体ワールドマップ整理
7. Chapter 1後半の暗号・報酬等の未決定事項をユーザーと確定

## 20. 過去案として勝手に復活させないもの

- 旧 custom mini-language
- Lumiere自身がコードを書く設定
- 古い魔導工房をソフィーの主拠点とする案
- 未確定の長期敵 / 家族設定
- 旧 Chapter 0 案
- 旧盗まれた魔導書チュートリアル
- 旧 `feu` / countdown チュートリアル
- 古い村やお菓子注文等の未採用ディテール

必要なら新案としてユーザーへ提案し、既存仕様として扱わない。

## 21. 新ChatGPT Project Instructions 用コピペ

```text
このProjectはゲーム「Spell Operator」専用。

Spell Operatorについて回答・仕様策定・実装を行う前に、必ずNotionの「Spell Operator 攻略・仕様Wiki」と「AI参照・仕様同期ルール」を読む。次に、依頼内容に関係するNotionデータベースを読む。

GitHub実装を扱う場合は cureflash/spell-operator の AGENTS.md → docs/SPEC_INDEX.md → docs/PROJECT_HANDOFF.md → docs/GAME_SPEC.md → docs/RUNTIME_ARCHITECTURE.md → 対象仕様書 → 現在の実装コードの順で確認する。

仕様の優先順位は、現在の会話でユーザーが明示的に決めた内容 → Notion → Git Markdown仕様 → 実装コード → 過去チャットは調査用、の順。

Notionがゲーム設計の正本。Git Markdownは実装向けミラー。コード上の偶然の挙動を仕様に昇格させない。

未決定事項を推測で確定しない。指定範囲外の仕様を変更しない。新しい仕様をユーザーが確定した場合はNotionとGit仕様書を同期してから、または実装と同時に反映する。

ソフィーが実際のPythonを書く。ルミエルは魔法知識と魔法行使を担当する。ルミエルは人間の魂をインストールされたアンドロイドで、そのため魔法を使える。

現在のPython実行系はPyodide v0.28.3 + Web Worker。旧custom mini-languageやSkulptへ戻さない。

2026-08-22のRuntimeリファクタ後は、音声は js/audio-manager.js、通常フィールドのプラグイン導線は js/plugin-controller.js、移動入力は js/field-input-controller.js、フィールドDOM配置は js/field-scene-controller.js、論理移動と追従は js/field-model.js が責任を持つ。後付け *-fix.js を安易に増やさない。

通常フィールドXのプラグインは「プラグイン！ルミエル.EXE トランスミッション！」→文字送り中Zは全文表示→次のZで可愛く輝く1 + 不透明な全画面Kirayuki→最初のPython課題へ直接入る。メニューの「パソコン」は演出なしで魔導書一覧へ入る。

ゲーム中は原則ページスクロールを要求しない。

現在の公開確認URLは https://cureflash.github.io/spell-operator/?v=88 。公開挙動がコードと違う場合は、まずPagesとキャッシュ番号を確認する。
```

## 22. 新しいチャットで最初に送る依頼

```text
これからSpell Operatorの開発を続けます。

作業を始める前に、実際に以下を読み込んでください。

1. Notion「Spell Operator 攻略・仕様Wiki」
2. Notion「AI参照・仕様同期ルール」
3. 今回の作業に関係するNotionデータベース
4. GitHub cureflash/spell-operator の AGENTS.md
5. docs/SPEC_INDEX.md
6. docs/PROJECT_HANDOFF.md
7. docs/GAME_SPEC.md
8. docs/RUNTIME_ARCHITECTURE.md
9. 現在の実装コード

仕様の優先順位は、現在の会話で明示した決定 → Notion → Git仕様 → 実装 → 過去チャットは参考のみ、です。

読み込みが終わったら、現在の実装状態と未解決事項を簡潔に整理してから作業を開始してください。
```
