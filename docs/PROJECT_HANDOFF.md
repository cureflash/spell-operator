# Spell Operator — ChatGPT Project Handoff

This document is the handoff material for the ChatGPT Project dedicated to **Spell Operator**.
It exists so a new chat can recover the same working rules, source order, current design, and implementation context without relying on old chat history alone.

## 1. Mandatory startup protocol

Before answering, designing, or implementing anything related to Spell Operator:

1. Read Notion: `Spell Operator 攻略・仕様Wiki`
   - https://app.notion.com/p/3bf19583748e81b9a285c1e1686db1e2
2. Read Notion: `AI参照・仕様同期ルール`
   - https://app.notion.com/p/3bf19583748e8138aefdfce2079758a3
3. Read the Notion database records relevant to the current task.
4. If GitHub implementation is involved, read:
   - `AGENTS.md`
   - `docs/SPEC_INDEX.md`
   - the relevant Git specification file, if it exists
   - the current implementation code

Do not read every Notion database on every task. Read the wiki first, then only the databases relevant to the work.

## 2. Source of truth

- **Notion databases are the canonical source of game design and decided specifications.**
- Git Markdown files are the versioned, implementation-facing mirror.
- Code implements the specification. An accidental code behavior is not a specification.
- If Notion and Git disagree, use Notion unless the user explicitly changes the specification in the current conversation.
- When a new specification is confirmed, update both Notion and the relevant Git specification before or together with implementation.
- Never invent unresolved specifications.
- Never change unrelated behavior without instruction.

## 3. Notion structure

The parent page is `Spell Operator 攻略・仕様Wiki`.
The following database containers currently exist:

- 章
- 攻略チャート
- エリア・マップ
- イベント
- フラグ
- 謎解き
- キャラクター・NPC
- 敵・バトル
- 魔法・術式
- アイテム・装備
- ゲームシステム
- 実装管理
- クエスト
- 会話・台詞
- ヒント
- ショップ・販売
- 技・アクション
- 属性・タイプ
- UI・画面
- セーブデータ
- アセット・素材
- 世界設定・用語
- テストケース
- 状態変化
- プログラミング知識
- 報酬
- 演出・カットシーン
- BGM・SE
- 操作・入力
- 成長・経験値

The intended workflow is:

```text
Discuss and decide specification
↓
Record it in the appropriate Notion database
↓
Mirror the confirmed specification in Git Markdown
↓
Implement code
```

## 4. Current game identity

- Top-down 2D adventure RPG.
- Field exploration, puzzles, Python programming, and command-based combat are integrated into one progression loop.
- Programming is not a detached worksheet mode; it is a general tool for analysis, spell-formula construction, and world interaction.
- The language being designed around is Python.
- The player does not write code during battle.
- Intended spell workflow:

```text
Write Python on Sophie's PC
↓
Test / debug
↓
Register executable spell formula
↓
Use it during exploration or battle
```

- A spellbook is a **specification**, not a source-code repository. The player writes code that satisfies the spellbook's requirements.

## 5. Sophie / Lumiere architecture

### Sophie

- Player-controlled protagonist.
- Actually writes the programs.
- Handles logic, information processing, and construction/editing of spell formulae.
- Physical/front-line role in battle.

### Lumiere

- Handles magical knowledge and actual magic execution.
- An android with a human soul installed.
- Magic reacts to souls rather than bodies, which is why Lumiere can cast magic.
- Lumiere's soul connects to mana and executes formulae created by Sophie.
- Lumiere cannot rewrite her own spell execution system due to a self-formula rewrite prohibition; Sophie is needed as the external operator.

Core execution model:

```text
Sophie writes Python
↓
spell formula is built/debugged
↓
executable formula is registered
↓
Lumiere's soul connects to mana
↓
mana passes through the formula
↓
magic activates
```

## 6. Chapter 1 — current design direction

Working title: `最初の暗号`

The current direction is to build toward solving a Caesar cipher in Python from numeric string data.

Expected learning sequence:

1. Caesar cipher concept
2. Key / shift amount
3. Strings
4. `split()`
5. `int()`
6. Numeric addition/subtraction
7. Loops
8. Unicode number-to-character correspondence
9. Number-to-character conversion
10. String concatenation / joining

### Friend Caesar tutorial — current exact specification

- Plaintext: `CAT`
- Ciphertext: `FDW`
- Key: `3`
- `CAT` was encrypted by shifting each letter three positions forward.
- The puzzle UI places `↑` and `↓` buttons beside the displayed ciphertext.
- `↑`: move the entire displayed text **one letter forward per click**.
- `↓`: move the entire displayed text **one letter backward per click**.
- Uppercase A-Z wraps around.
- **Key = 3 does not mean the button moves three letters.** These are separate concepts.

Expected behavior:

```text
FDW
↓ 1 click
ECV
↓ 2 clicks
DBU
↓ 3 clicks
CAT
```

Incorrect behavior:

```text
FDW → CAT
```

The purpose of the UI is to let the player physically discover the idea of a Caesar shift before having to implement it in Python.

## 7. Chapter 1 final cipher model under consideration

Example numeric string:

```text
"86 83 72 79 79"
```

Processing model:

```text
string
↓
split()
↓
int()
↓
apply key / shift
↓
convert Unicode numbers to characters
↓
join
```

Example:

```text
86 83 72 79 79
↓ subtract 3
83 80 69 76 76
↓ Unicode mapping
S P E L L
↓ join
SPELL
```

A Unicode correspondence table is intended to exist as an in-game item.

The exact final ciphertext, final Chapter 1 reward, and complete Chapter 1 route are not yet fully decided. Do not invent them.

## 8. Current repository / implementation context

Repository:

```text
cureflash/spell-operator
```

Deployment:

- Static HTML/CSS/JavaScript.
- Published with GitHub Pages.

Files currently relevant to the friend Caesar event include:

- `js/game03-story.js`
- `js/friend-conversation.js`
- `css/story.css`
- `js/game.js`

Important deployment note:

- GitHub Pages has previously failed builds and left an older public version active.
- If repository code is correct but the public game still behaves like an older version, inspect Pages build status and cache-version parameters before changing logic again.

Current Caesar-button implementation must remain **one click = one letter**.

## 9. Git specification state

Currently present:

- `AGENTS.md`
- `docs/SPEC_INDEX.md`
- `docs/PROJECT_HANDOFF.md`

`docs/SPEC_INDEX.md` refers to future implementation-facing specification files:

- `docs/GAME_SPEC.md`
- `docs/chapters/CHAPTER_01.md`

At the time this handoff was created, those two files do **not** yet exist. Do not assume they are available until they are actually created.

## 10. Treat these as unresolved

Do not decide these without the user:

- Whose human soul is installed in Lumiere.
- Who installed it and why.
- Whether soul installation is legal, common, rare, or taboo.
- The relationship between Lumiere's memories/personality and the original soul.
- Whether `マナレイヤ` is the final term for the magical layer.
- The social/professional status or qualification system of Spell Operators.
- How Sophie and Lumiere first met.
- The long-term antagonist and final story objective.
- Final Chapter 1 ciphertext.
- Final Chapter 1 reward.
- Complete Chapter 1 walkthrough route.
- Final combat damage formula and elemental multipliers.

## 11. Implementation procedure

For each implementation request:

1. Identify the exact requested scope.
2. Read the Notion wiki.
3. Read relevant Notion database records.
4. Read `AGENTS.md` and `docs/SPEC_INDEX.md`.
5. Read relevant Git spec files if they exist.
6. Read the actual current code.
7. Compare Notion, Git specs, and code.
8. Do not fill unresolved gaps by guessing.
9. Change only the requested behavior.
10. If a new specification becomes confirmed, sync Notion and Git.
11. If the change affects the published game, verify GitHub Pages deployment state after implementation.

## 12. Text to place in ChatGPT Project Instructions

```text
This Project is dedicated to the game Spell Operator.

Before answering, designing, or implementing anything about Spell Operator, first read the Notion pages “Spell Operator 攻略・仕様Wiki” and “AI参照・仕様同期ルール”. Then read the Notion database records relevant to the current request.

When GitHub implementation is involved, read cureflash/spell-operator in this order: AGENTS.md → docs/SPEC_INDEX.md → the relevant specification file → the current implementation code.

Notion is the canonical source of specification. Git Markdown files are the implementation-facing mirror. Code implements the specification and must not silently redefine it.

A specification explicitly decided by the user in the current conversation takes priority. When a new specification is confirmed, update both Notion and the corresponding Git specification.

Do not invent unresolved details. Do not change behavior outside the requested scope. Before implementation, inspect the relevant specifications; after implementation, run appropriate checks and, when applicable, verify GitHub Pages deployment state.
```
