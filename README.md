# Spell Operator

Browser RPG prototype for **Spell Operator**.

## Prototype 0.3

The current vertical slice now connects field exploration, spell development, and battle:

1. Control Sophie on a top-down tile field.
2. Lumiere follows one tile behind by moving through Sophie's previous positions.
3. Turn toward Lumiere and interact to talk to her.
4. Enter the spell workshop from the field.
5. Develop Fire and Heal in a restricted Python-like language.
6. Run and debug each spell before registration.
7. Execution steps determine MP cost.
8. Return to the field and touch an enemy to enter battle.
9. Fight in a Pokémon-like face-off layout with Dragon Quest-like party command flow.
10. Return to the same field after victory.

The field uses original placeholder CSS graphics rather than Pokémon assets or other copyrighted game assets.

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

## Field controls

- Move: Arrow keys / WASD
- Interact: Enter / Space
- Touch controls are shown on narrow screens
- SAVE / LOAD use browser local storage

## Run locally

No build step and no dependencies are required.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Tests

```bash
node tests/interpreter.test.js
node tests/field-model.test.js
```

## Prototype language

Supported in 0.3:

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
