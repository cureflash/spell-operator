const assert = require('assert');
const { SpellInterpreter, SpellError, OverheatError } = require('../js/interpreter.js');

const runtime = new SpellInterpreter({ stepLimit: 1000 });

const goodFire = `spell fire\nfor i in range(5):\n    print(5 - i)\ncast("fire")`;
const fireResult = runtime.run(goodFire);
assert.deepStrictEqual(fireResult.output, ['5','4','3','2','1']);
assert.deepStrictEqual(fireResult.casts, ['fire']);
assert.strictEqual(fireResult.spell, 'fire');
assert.strictEqual(fireResult.features.loops, 1);
assert.strictEqual(runtime.validateFire(fireResult).ok, true);

const wrongFire = runtime.run(`spell fire\nprint(1)\ncast("fire")`);
assert.strictEqual(runtime.validateFire(wrongFire).ok, false);

const goodHeal = `spell heal\nhp = 12\nif hp < 20:\n    cast("heal")`;
const healResult = runtime.run(goodHeal);
assert.deepStrictEqual(healResult.casts, ['heal']);
assert.strictEqual(healResult.spell, 'heal');
assert.strictEqual(healResult.features.assignments, 1);
assert.strictEqual(healResult.features.conditionals, 1);
assert.strictEqual(runtime.validateHeal(healResult).ok, true);

const wrongHeal = runtime.run(`spell heal\nhp = 12\nif hp < 5:\n    cast("heal")`);
assert.deepStrictEqual(wrongHeal.casts, []);
assert.strictEqual(runtime.validateHeal(wrongHeal).ok, false);

assert.throws(() => runtime.run(`spell fire\nprint(x)`), SpellError);

const overheatRuntime = new SpellInterpreter({ stepLimit: 10 });
assert.throws(() => overheatRuntime.run(`spell fire\nfor i in range(100):\n    print(i)\ncast("fire")`), OverheatError);

console.log('interpreter tests: OK');
