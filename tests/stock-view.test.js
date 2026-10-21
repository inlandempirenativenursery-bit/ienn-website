// node tests/stock-view.test.js : chip/stock display rules (stock-view.js)
const assert = require('assert'), S = require('../stock-view.js');
const z = (key, qty) => ({ key, qty }), ask = () => [z('2"', null), z('Tree pot', null)];
const plants = [
  { id: 'a', sizes: [...ask(), z('4"', 0), z('1 gal', 0)] },   // all tracked 0 -> hidden once counted
  { id: 'b', sizes: [...ask(), z('4"', 0), z('1 gal', 3)] },   // 4" chip hidden
  { id: 'c', sizes: [...ask(), z('4"', 20)] }];
// baseline detection
assert.strictEqual(S.hasBaseline({ baseline: null }, plants), false, 'baseline null => unknown');
assert.strictEqual(S.hasBaseline({}, plants), true, 'no field but real stock => counted');
assert.strictEqual(S.hasBaseline({}, [plants[0]]), false, 'every tracked qty 0 => unknown');
assert.strictEqual(S.hasBaseline({ countDate: '2026-10-18' }, [plants[0]]), false, 'dated count but all 0 => still unknown (never blank the shop)');
// no baseline: nothing hidden, qty unknown
const u = S.view(plants, false);
assert.strictEqual(u.length, 3); assert.ok(u.every(p => p.sizes.every(s => S.isAsk(s) || s.qty === null)));
// baseline: zero-stock plant and chips hidden
const v = S.view(plants, true);
assert.deepStrictEqual(v.map(p => p.id), ['b', 'c']);
assert.deepStrictEqual(v[0].sizes.map(s => s.key), ['2"', 'Tree pot', '1 gal']);
// Ask-us threshold, never counts
assert.strictEqual(S.sizeState(z('1 gal', 3), 1), 'ask', 'below 5 => Ask us');
assert.strictEqual(S.sizeState(z('1 gal', 4), 1), 'ask');
assert.strictEqual(S.sizeState(z('1 gal', 5), 1), 'ok');
assert.strictEqual(S.sizeState(z('4"', 20), 21), 'ask', 'want > qty => Ask us');
assert.strictEqual(S.sizeState(z('4"', 20), 5), 'ok');
assert.strictEqual(S.sizeState(z('4"', null), 1), 'unknown');
assert.strictEqual(S.sizeState(z('2"', null), 1), 'request');
assert.strictEqual(S.maxQty(z('1 gal', 3)), 3); assert.strictEqual(S.maxQty(z('4"', null)), 99);
console.log('stock-view: all passed');
