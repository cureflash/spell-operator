const assert = require('assert');
const { SpellInterpreter, SpellError, OverheatError } = require('../js/interpreter.js');

const runtime = new SpellInterpreter({ stepLimit: 1000 });

const good = `spell fire\nfor i in range(5):\n    print(5 - i)\ncast("fire")`;
const result = runtime.run(good);
assert.deepStrictEqual(result.output, ['5','4','3','2','1']);
assert.deepStrictEqual(result.casts, ['fire']);
assert.strictEqual(result.spell, 'fire');
assert.ok(result.steps > 0);
assert.strictEqual(runtime.validateFire(result).ok, true);

const wrong = runtime.run(`spell fire\nprint(1)\ncast("fire")`);
assert.strictEqual(runtime.validateFire(wrong).ok, false);

assert.throws(() => runtime.run(`spell fire\nprint(x)`), SpellError);

const overheatRuntime = new SpellInterpreter({ stepLimit: 10 });
assert.throws(() => overheatRuntime.run(`spell fire\nfor i in range(100):\n    print(i)\ncast("fire")`), OverheatError);

console.log('interpreter tests: OK');
