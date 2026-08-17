# Spell Operator — AI Working Rules

Before changing Spell Operator, read the project specifications first.

## Required source order

1. Notion: `Spell Operator 攻略・仕様Wiki`
   - https://app.notion.com/p/3bf19583748e81b9a285c1e1686db1e2
2. Notion: `AI参照・仕様同期ルール`
   - https://app.notion.com/p/3bf19583748e8138aefdfce2079758a3
3. `docs/SPEC_INDEX.md`
4. The relevant Git specification file for the chapter/system being changed.
5. Existing implementation code.

## Source of truth

- Notion databases are the canonical source for game design and decided specifications.
- Git Markdown specifications are the versioned implementation-facing mirror of decided Notion specifications.
- Code implements the specifications; code does not silently redefine them.
- If Notion and Git specifications disagree, use Notion as canonical and update the Git specification before changing code.

## Change rules

- Do not invent unresolved specifications.
- Do not change unrelated behavior.
- When a new specification is decided, update both Notion and the relevant Git specification.
- When implementation changes a documented behavior, update the specification in the same work.
- Chapter-specific rules belong under `docs/chapters/`.
- Game-wide rules belong in `docs/GAME_SPEC.md`.
