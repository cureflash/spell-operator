# Spell Operator

Browser RPG prototype for **Spell Operator**.

## Prototype 0.2

The current vertical slice verifies this loop:

1. Develop multiple spells in a restricted Python-like language.
2. Run and debug each spell before registration.
3. Execution steps determine MP cost.
4. Register Fire and Heal into a spellbook.
5. Use the registered spells in a JRPG-style turn battle.
6. Clear two consecutive encounters while HP/MP carry over.

The battle presentation intentionally mixes a **Pokémon-like face-off layout** with a **Dragon Quest-like party command flow**.

### Fire

Teaches loop count and computational cost.

```text
spell fire
for i in range(5):
    print(5 - i)
cast("fire")
```

### Heal

Teaches variables and conditional execution.

```text
spell heal
hp = 12
if hp < 20:
    cast("heal")
```

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

Supported in 0.2:

- `spell <name>`
- numeric variable assignment
- `for <name> in range(<integer expression>):`
- `if <comparison>:`
- `print(<expression>)`
- `cast("<spell>")`
- arithmetic and comparisons (`<`, `<=`, `>`, `>=`, `==`, `!=`)

The interpreter has a step limit. Exceeding it stops execution as `OVERHEAT`.

## Publishing

The project is plain static HTML/CSS/JavaScript and is deployed with GitHub Pages.
