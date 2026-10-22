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
assert.strictEqual(S.hasBaseline({ countDate: null }, plants), false, 'countDate null => unknown (current live feed)');
assert.strictEqual(S.hasBaseline({ countDate: '2026-10-18' }, [plants[0]]), true, 'dated count => baseline, even if all 0');
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
// ---- new contract: extra / canRequest ----
const r = (key, qty, extra) => ({ key, qty, extra, canRequest: extra > 0 });
const np = [
  { id: 'x', sizes: [...ask(), r('4"', 0, 0), r('1 gal', 0, null)] },   // nothing ready, nothing extra -> hidden
  { id: 'y', sizes: [...ask(), r('4"', 0, 6), r('1 gal', 0, 0)] },      // 4" by request only
  { id: 'w', sizes: [...ask(), r('4"', 10, 0), r('1 gal', null, null)] }];
const nv = S.view(np, S.hasBaseline({ countDate: '2026-10-20' }, np));
assert.deepStrictEqual(nv.map(p => p.id), ['y', 'w'], 'qty 0 && !canRequest hidden; plant w/o sizes hidden');
assert.deepStrictEqual(nv[0].sizes.map(s => s.key), ['2"', 'Tree pot', '4"']);
assert.deepStrictEqual(nv[1].sizes.map(s => s.key), ['2"', 'Tree pot', '4"', '1 gal'], 'qty null stays (untracked/unknown)');
assert.strictEqual(S.hasBaseline({}, [np[1]]), true, 'no date field, canRequest stock => counted');
assert.strictEqual(S.sizeState(r('4"', 0, 6), 1), 'ask', 'qty 0 + canRequest => Ask us');
assert.strictEqual(S.available(r('4"', 0, 6)), true); assert.strictEqual(S.available(r('4"', 0, 0)), false);
assert.strictEqual(S.sizeState(r('4"', 0, 0), 1), 'out');
assert.strictEqual(S.sizeState(r('4"', 8, 3), 9), 'ask', 'want > qty => Ask us');
assert.strictEqual(S.isRequest(r('4"', 8, 3), 9), false, 'requests retired'); assert.strictEqual(S.isRequest(r('4"', 8, 3), 8), false);
assert.strictEqual(S.isRequest(z('4"', 8), 9), false, 'old feed: no canRequest => not a request');
assert.strictEqual(S.maxQty(r('4"', 3, 2)), 3, 'hard cap at ready qty even with extra');
assert.strictEqual(S.lowStock(z('1 gal', 5)), true); assert.strictEqual(S.lowStock(z('1 gal', 6)), false); assert.strictEqual(S.lowStock(z('1 gal', 0)), false); assert.strictEqual(S.lowStock(z('1 gal', null)), false);
assert.strictEqual(S.maxQty(r('4"', 3, 0)), 3, 'no extra => cap at qty');
assert.strictEqual(S.canReq({ key: '4"', qty: 0, extra: 4 }), true, 'extra > 0 without canRequest field');
assert.strictEqual(S.canReq({ key: '4"', qty: 0, extra: 4, canRequest: false }), false, 'explicit canRequest wins');
// no baseline: new feed with nulls shows everything as unknown
assert.ok(S.view(np, false).every(p => p.sizes.every(s => S.isAsk(s) || s.qty === null)));
// ---- POST notices / stock rejection ----
const ok = { ok: true, orderId: 'A1', notices: [{ plant: 'Yarrow', sizeKey: '4"', requested: 5, ready: 3, extra: 4, message: 'We have 3 ready now. <b>Andrew</b> will reach out about the extra.' }, { message: '  ' }], total: 30, taxIncluded: true, items: [] };
assert.deepStrictEqual(S.notices(ok), ['We have 3 ready now. <b>Andrew</b> will reach out about the extra.'], 'notice text kept raw (rendered as text), blanks dropped');
assert.deepStrictEqual(S.notices({ ok: true }), [], 'old success shape: no notices');
const rej = { ok: false, error: 'stock', message: 'Some plants are not available.', problems: [{ plant: 'Toyon', sizeKey: '1 gal', requested: 2, available: 0, ready: 0, extra: 0, message: 'Toyon 1-gallon is not available.' }, { plant: 'Yarrow', message: 'Only 2 Yarrow 4-inch available.' }] };
assert.deepStrictEqual(S.problems(rej), ['Toyon 1-gallon is not available.', 'Only 2 Yarrow 4-inch available.']);
assert.deepStrictEqual(S.problems({ ok: false, error: 'stock', problems: [{ plant: 'x' }] }), []);
console.log('stock-view: all passed');
