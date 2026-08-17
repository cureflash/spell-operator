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
- `chapters/CHAPTER_01.md` — Chapter 1 implementation-facing specification.
- Future chapters use the same pattern: `chapters/CHAPTER_02.md`, etc.

## Synchronization rule

1. Read the relevant Notion database records first.
2. Compare them with the corresponding Git specification.
3. If they differ, Notion is canonical unless the user explicitly changes the specification in the current conversation.
4. Reflect newly confirmed decisions in Notion and Git before or together with implementation.
5. Never treat an implementation accident as a new specification.

## Status

The Notion database structure has been created. Detailed records will be populated as specifications are decided.

`GAME_SPEC.md` and `chapters/CHAPTER_01.md` are planned but not yet created. Do not assume they exist until they are actually added.
