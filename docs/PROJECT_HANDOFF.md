# Spell Operator — New ChatGPT Project Handoff

Updated: 2026-08-17

This document is the clean handoff for moving Spell Operator into a new ChatGPT Project without inheriting conflicting old project-chat context.

## 0. Migration rule

The old ChatGPT Project chat history is **not** a specification source after migration.

Use this priority order:

1. Explicit decision by the user in the current conversation
2. Notion database records
3. Git Markdown specifications / this handoff
4. Current implementation code
5. Old chat history only as archaeology, never as authority

If an old chat conflicts with Notion, Git specifications, or a newer explicit user decision, ignore the old chat.

## 1. Mandatory startup protocol

Before answering, designing, or implementing Spell Operator:

1. Read Notion: `Spell Operator 攻略・仕様Wiki`
   - https://app.notion.com/p/3bf19583748e81b9a285c1e1686db1e2
2. Read Notion: `AI参照・仕様同期ルール`
   - https://app.notion.com/p/3bf19583748e8138aefdfce2079758a3
3. Read only the Notion databases relevant to the task.
4. If implementation is involved, read Git in this order:
   - `AGENTS.md`
   - `docs/SPEC_INDEX.md`
   - `docs/PROJECT_HANDOFF.md`
   - relevant specification file if one exists
   - actual current code

Do not assume old Project memory is available or correct.

## 2. Source of truth

- Notion databases are the canonical source for decided game/story specifications.
- Git Markdown is the implementation-facing mirror.
- Code is an implementation, not a specification by itself.
- If code contains behavior that is not confirmed in Notion/Git specs, treat it as provisional implementation.
- When the user confirms a new specification, update Notion and the relevant Git specification.
- Never fill unresolved details by guessing.
- Never change unrelated behavior.

## 3. Notion records populated during migration

The Notion database containers were mostly empty before this migration. The following current story/design records were added so the new Project does not need old chat history.

### Chapter

- `第1章 最初の暗号`

### Characters / NPCs

- `ソフィー`
- `ルミエル`
- `友達（クラスメイト）`
- `ピジブル`
- `パーツ屋の店主`

### Areas / maps

- `はじまりの町`
- `学校`
- `ピジブルの図書館`
- `ソフィーの家`

### Puzzles

- `友達のシーザー暗号`
- `旧式端末の暗号解読`

### Events

- `友達のシーザー暗号`
- `Unicode対応表を探す`
- `パーツ屋の旧式端末`

### Dialogue

- `Chapter 1：友達のシーザー暗号 会話`

### World setting

- `ルミエルの魂と魔法`

These records are the canonical starting point for story-related work.

## 4. Current game identity

- Top-down 2D adventure RPG.
- Field exploration, puzzles, actual Python programming, and command-based combat are integrated into one game progression.
- Programming is a world-interaction / analysis / spell-construction tool, not a detached worksheet mode.
- Sophie is the character who actually writes programs.
- Lumiere handles magical knowledge and actual magic execution.
- The player does not write code during battle.
- Spellbooks are **requirements/specifications**, not source-code repositories.

Intended spell workflow:

```text
Sophie opens her PC
↓
reads a spellbook specification
↓
writes Python satisfying the requirements
↓
runs tests / debugs
↓
registers the spell
↓
Lumiere executes it during exploration or battle
```

## 5. Sophie / Lumiere architecture

### Sophie

- Player-controlled protagonist.
- Actually writes Python.
- Handles logic, information processing, and spell-formula construction.
- Physical/front-line role in battle.
- 15 years old in the current character material.

### Lumiere

- Sophie's companion.
- Handles magic knowledge and actual spellcasting.
- Android with a human soul installed.
- Magic reacts to souls rather than bodies, allowing Lumiere to cast magic.
- Sophie's formula is executed through Lumiere's soul/magic connection.
- Lumiere cannot independently rewrite her own magic execution system; Sophie acts as the external operator.

Unresolved lore must remain unresolved:

- whose soul is inside Lumiere
- who installed it and why
- legal/social status of soul installation
- relationship between Lumiere's current personality/memories and the original soul
- whether `マナレイヤ` is the final terminology

## 6. Current Python implementation

Older chats discussed Python-like interpreters and Skulpt, but the current repository has moved further.

The current implementation runs **real Python through Pyodide**:

- `js/python-runner.js`
- `js/python-worker.mjs`
- Pyodide `v0.28.3` loaded in a Web Worker
- user source is parsed/executed as Python
- tests compare stdin/stdout
- an abstract computational-cost system is calculated
- dangerous/runtime-specific calls such as `eval`, `exec`, `compile`, `__import__`, `js`, `pyodide`, and `micropip` are restricted

Therefore:

- Canonical direction: Python
- Current runtime: Pyodide
- Do **not** revert to the old custom mini-language or assume Skulpt is required merely because an older chat mentioned it.

`README.md` still contains some Prototype 0.3 descriptions of the older restricted Python-like language and should not be treated as fully current when it conflicts with the active code.

## 7. Field / controls / party

Current direction and implementation:

- Sophie is player-controlled.
- Lumiere follows through Sophie's previous tile path rather than simply sharing the same movement vector.
- The pair are normally shown together in the field.
- Current field menu:
  - ステータス
  - リュック
  - パソコン
  - セーブ
  - とじる
- Current main keyboard behavior:
  - movement: Arrow keys / WASD
  - `Z`: interact / confirm / back behavior where defined
  - `Enter`: field menu / close menu
- Dialogue and story overlays stop normal field actions while active.

The exact current behavior is defined by `js/game03-menu.js`, `js/game03-field.js`, `js/friend-conversation.js`, and related active modules, not by older README control text.

## 8. Current locations

Current field code contains:

- `town` — はじまりの町
- `school` — 学校
- `library` — ピジブルの図書館
- `house1` — ソフィーの家 1F
- `house2` — ソフィーとルミエルの部屋

The earlier `魔導工房` concept has been replaced by **ソフィーの家** as the home/base context. The PC is in Sophie and Lumiere's room.

## 9. Chapter 1 — canonical story direction

Current title:

`第1章 最初の暗号`

Current story flow:

```text
学校で友達に話しかける
↓
友達がシーザー暗号を説明
↓
FDW / 鍵3 の問題
↓
CAT に復号
↓
ピジブルの図書館へ
↓
Unicode対応表を入手
↓
文字には番号が対応していることを学ぶ
↓
旧式端末の暗号解読へ
↓
Pythonで数値文字列を処理する方向
```

### Friend character

- Sophie's schoolmate.
- Good at programming.
- Introduces the Caesar-cipher tutorial.

### Confirmed friend dialogue flow

The current canonical dialogue is stored in Notion under:

`Chapter 1：友達のシーザー暗号 会話`

It ends with Sophie saying:

`面白そう！　解いてみる！`

and then the puzzle starts.

## 10. Caesar tutorial — exact specification

- Plaintext: `CAT`
- Ciphertext: `FDW`
- Key: `3`
- `CAT` is encrypted by shifting each uppercase letter three positions forward.
- Uppercase A-Z wraps around.
- The puzzle has `↑` / `↓` controls beside the ciphertext.
- `↑`: one click moves the whole text **one letter forward**.
- `↓`: one click moves the whole text **one letter backward**.
- The key value `3` and the per-click movement value `1` are different concepts.

Expected sequence:

```text
FDW
↓
ECV
↓
DBU
↓
CAT
```

Incorrect implementation:

```text
FDW → CAT in one click
```

The purpose is to let the player physically understand the Caesar shift before writing Python.

## 11. Chapter 1 Python-learning direction

The intended later puzzle teaches a chain like:

```text
numeric string
↓
split()
↓
int()
↓
apply key / numeric shift
↓
convert Unicode number to character
↓
join / concatenate characters
```

Relevant concepts:

1. Caesar cipher
2. key / shift amount
3. strings
4. `split()`
5. `int()`
6. numeric addition/subtraction
7. loops
8. Unicode code points
9. numeric-to-character conversion
10. string concatenation / joining

The `Unicode対応表` is an in-game item used as the bridge from Caesar cipher to numeric character encoding.

## 12. Important provisional code that is NOT canonical story specification

`js/game03-story.js` currently contains concrete values for the later terminal puzzle:

- encrypted string: `080B07FE080907FA0802080B07F0`
- subtraction offset: `1977`
- password: `REPAIR7`
- reward: `200G`
- `Repair` spellbook reward

These values currently exist in code, but during this migration they were intentionally **not promoted to canonical Notion story specification**.

Treat them as provisional implementation until the user explicitly confirms them.

The canonical Notion records instead mark the final terminal ciphertext, password, complete route, and reward as unresolved.

## 13. Current story implementation files

Main files:

- `js/game03-story.js`
- `js/friend-conversation.js`
- `js/game03-field.js`
- `js/game03-menu.js`
- `js/game03-items.js`
- `css/story.css`
- `css/friend-conversation.css`

Friend conversation is currently a multi-line dialogue event followed by the Caesar puzzle.

## 14. Current battle direction

- Command-based RPG battle.
- Visual direction combines a Pokémon-like opposing layout with Dragon Quest-like command progression.
- Sophie is the physical attacker.
- Lumiere uses registered magic.
- Code is written/tested before battle, not during battle.

Do not treat current numerical damage formulas or elemental multipliers as final unless separately confirmed in Notion.

## 15. Current assets / sprite state

### Sophie

The field currently uses:

`assets/characters/sophie_walk_3x4_hd.png`

with a Pipoya-style 3x4 layout:

- rows: DOWN / LEFT / RIGHT / UP
- columns: walk A / idle / walk B

### Lumiere

The repository contains a custom asset:

`assets/characters/lumiere_walk_4dir_8frames.png`

However, the active `css/sophie-sprite.css` currently still renders Lumiere using an external generic Pipoya character-chip URL.

This is an implementation discrepancy / pending asset integration. Do not assume the custom Lumiere asset is already wired into the live field.

### Map tiles

`css/pipoya-map.css` currently renders visible map cells from Pipoya map-chip PNGs and disables the older hand-drawn SVG map background.

Current map assets also include Sophie-house tilemap images under `assets/maps/`.

## 16. Old ideas that must NOT silently return

Old project chats contain concepts that are not current canonical specification. Do not reintroduce them without explicit confirmation, including examples such as:

- old long-term antagonist/family plot proposals
- old Chapter 0 / first-meeting proposals
- old stolen-grimoire tutorial variants
- old `feu` / countdown tutorial variants
- old village/snack-order details
- old custom mini-language as the final programming language
- old assumption that Lumiere writes the programs herself
- old `魔導工房` as Sophie's main base

If such an idea is useful later, present it as a new proposal rather than an existing fact.

## 17. Still unresolved

Do not decide these without the user:

- Sophie and Lumiere's first meeting / origin story
- long-term antagonist and final objective
- Lumiere's soul identity and origin
- social/legal status of soul-installed androids
- final terminology for the magical network/layer
- Spell Operator as a profession / qualification system
- final Chapter 1 terminal ciphertext
- final Chapter 1 password
- final Chapter 1 reward
- complete final Chapter 1 walkthrough
- final battle damage formula / elemental balance
- any major character backstory not entered in Notion

## 18. Repository / deployment

Repository:

`cureflash/spell-operator`

Current app:

- static HTML/CSS/JavaScript frontend
- Python runtime through Pyodide Web Worker
- GitHub Pages deployment

GitHub Pages has previously served an older version after deployment/build/cache issues. When repository code and public behavior differ, inspect deployment status and cache-version parameters before rewriting correct logic.

## 19. New Project Instructions — copy/paste

```text
This Project is dedicated to Spell Operator.

Do not use old ChatGPT Project conversations as specification authority. At the start of every Spell Operator task, first read Notion “Spell Operator 攻略・仕様Wiki” and “AI参照・仕様同期ルール”, then read only the Notion database records relevant to the task.

When GitHub implementation is involved, read cureflash/spell-operator in this order: AGENTS.md → docs/SPEC_INDEX.md → docs/PROJECT_HANDOFF.md → relevant specification file if present → current implementation code.

Priority is: explicit user decision in the current conversation → Notion database → Git specifications → current code → old chat history only as non-authoritative reference.

Notion is the canonical source for decided game/story specifications. Git Markdown is the implementation-facing mirror. Code does not silently redefine specification.

Never invent unresolved details. Never reintroduce an old discarded idea as if it were current. Change only the requested scope.

Sophie actually writes the Python programs. Lumiere handles magical knowledge and actual magic execution. Lumiere is an android with a human soul, which allows her to use magic.

The current programming direction is real Python. The current repository runtime uses Pyodide in a Web Worker. Do not revert to an old custom mini-language or assume Skulpt is required solely because an old chat mentioned it.

For Chapter 1, use the Notion records as canonical. The friend Caesar tutorial is FDW with key 3, answer CAT, and each arrow click moves only one letter. The later terminal ciphertext/password/reward are still unresolved even though provisional values exist in code.

When a new specification is explicitly confirmed, update the relevant Notion record and Git specification before or together with implementation.
```

## 20. First action in the new Project

After creating the new Project:

1. Paste the instructions above into Project Instructions.
2. Start a new chat.
3. Tell ChatGPT to read the Notion wiki and this Git handoff before doing any Spell Operator work.
4. Continue development from the canonical records rather than importing the old Project chat history.
