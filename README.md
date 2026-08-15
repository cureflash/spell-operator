# Spell Operator

Browser RPG prototype for the **Spell Operator** concept.

## Prototype 0.1

The current vertical slice verifies this loop:

1. Write a spell in a restricted Python-like language.
2. Run it in the debug room.
3. The runtime measures execution steps and derives MP cost.
4. Register a spell only after its checks pass.
5. Use the registered spell from a JRPG-style turn command menu.

The battle presentation intentionally mixes a **Pokémon-like face-off layout** with a **Dragon Quest-like turn command flow**.

## Run locally

No build step and no dependencies are required.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Test

```bash
node tests/interpreter.test.js
```

## Prototype language

Supported in 0.1:

```text
spell fire
for i in range(5):
    print(5 - i)
cast("fire")
```

- `spell <name>`
- `for <name> in range(<integer expression>):`
- `print(<integer expression>)`
- `cast("<spell>")`
- integer arithmetic with loop variables

The interpreter has a step limit. Exceeding it stops execution as `OVERHEAT`.

## Publishing

The project is plain static HTML/CSS/JavaScript and is suitable for GitHub Pages without a build workflow.
