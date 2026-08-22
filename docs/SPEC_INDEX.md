# Spell Operator Specification Index

This directory is the implementation-facing mirror of the canonical Notion specifications.

## Canonical Notion sources

- Spell Operator 攻略・仕様Wiki
  - https://app.notion.com/p/3bf19583748e81b9a285c1e1686db1e2
- AI参照・仕様同期ルール
  - https://app.notion.com/p/3bf19583748e8138aefdfce2079758a3
- Spell Operator — ChatGPT Project 引き継ぎ資料
  - https://app.notion.com/p/3bf19583748e81c98ae5cffd5ea87497

The Notion wiki contains the structured databases for chapters, walkthrough steps, maps, events, flags, puzzles, NPCs, battles, magic, items, systems, implementation, dialogue, hints, programming knowledge, tests, and related data.

## Git specification files

- `PROJECT_HANDOFF.md` — ChatGPT Project startup rules, current design context, and handoff material.
- `GAME_SPEC.md` — game-wide implementation rules and stable global specifications.
- `RUNTIME_ARCHITECTURE.md` — current browser-runtime ownership boundaries, bootstrap, audio, plug-in, field input/scene controllers, and refactoring rules.
- `PLUGIN_WORKSPACE.md` — plug-in menu, editor/grimoire layout, shared Lumiere/output pane, and resizable workspace rules.
- `UI_TUNING.md` — developer UI tuning tools and machine-readable adjustment payload formats.
- `BATTLE_UI.md` — battle message history, Dragon Quest-style command prompts, and the `▶` current-command marker.
- `chapters/CHAPTER_01.md` — Chapter 1 implementation-facing specification when created.
- `maps/FLEUR_VILLAGE.md` — フルール村の新規ゲーム開始地点と施設スプライト登録。
- `maps/LA_MER_CITY.md` — ラメールシティ integrated field layout and its temporary warp access route.
- Future chapters use the same pattern: `chapters/CHAPTER_02.md`, etc.

## Synchronization rule

1. Read the relevant Notion database records first.
2. Compare them with the corresponding Git specification.
3. If they differ, Notion is canonical unless the user explicitly changes the specification in the current conversation.
4. Reflect newly confirmed decisions in Notion and Git before or together with implementation.
5. Never treat an implementation accident as a new specification.
6. Runtime implementation ownership is documented in `RUNTIME_ARCHITECTURE.md`; behavioral rules remain in `GAME_SPEC.md` and the canonical Notion records.

## Status

The Notion database structure has been created and is populated as specifications are decided.

`GAME_SPEC.md` exists and contains current game-wide confirmed specifications. Chapter-specific specification files are added as chapter specifications are formalized.
