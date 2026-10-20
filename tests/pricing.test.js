// node tests/pricing.test.js — size normalization, price table, inventory parse + order stock check
const assert = require('assert');
const gs = require('../apps-script/inventory-endpoint.gs');
const web = require('../inventory.js');
const cases = { '4"': '4-inch', '4in': '4-inch', '4-inch': '4-inch', '4 inch': '4-inch', '1 gal': '1-gallon', '1-gallon': '1-gallon',
  '1 Gallon': '1-gallon', '2"': '2-inch', '2-inch': '2-inch', 'quarter': 'Quarter tree', '1/4 tree': 'Quarter tree', 'Tree pot': 'Quarter tree',
  'Quarter tree': 'Quarter tree', '5 gal': null, '': null };
for (const [k, v] of Object.entries(cases)) { assert.strictEqual(gs.ienNormSize(k), v, 'gs ' + k); assert.strictEqual(web.ienNormSize(k), v, 'web ' + k); }
assert.deepStrictEqual([gs.ienPrice('2"'), gs.ienPrice('4in'), gs.ienPrice('quarter'), gs.ienPrice('1 gal')], [3, 6, 10, 15]);
assert.deepStrictEqual([web.ienPrice('2"'), web.ienPrice('4in'), web.ienPrice('quarter'), web.ienPrice('1 gal')], [3, 6, 10, 15]);

const rows = [['Plant', 'Botanical', '2"', '4 in', 'Quarter Tree', '1 gal', 'Priority'],
  ['White Sage (Salvia apiana)', '', '', 3, '', 9, 1], ['Toyon', 'Heteromeles arbutifolia', '', '', 2, 0, '']];
const inv = gs.ienParseInventory(rows);
assert.strictEqual(inv.plants[0].name, 'White Sage'); assert.strictEqual(inv.plants[0].botanical, 'Salvia apiana');
assert.deepStrictEqual(inv.plants[0].stock, { '4-inch': 3, '1-gallon': 9 }); assert.strictEqual(inv.plants[0].row, 2);
let r = gs.ienCheckOrder(inv, [{ id: 'white-sage', size: '1-gallon', qty: 2 }, { name: 'Toyon', size: 'quarter', qty: 2 }]);
assert.ok(r.ok); assert.strictEqual(r.total, 2 * 15 + 2 * 10);
r = gs.ienCheckOrder(inv, [{ id: 'white-sage', size: '4"', qty: 2 }, { id: 'white-sage', size: '4-inch', qty: 2 }]);
assert.ok(!r.ok && /only 3 left/.test(r.error), 'cumulative over-order rejected');
r = gs.ienCheckOrder(inv, [{ id: 'toyon', size: '1 gal', qty: 1 }]); assert.ok(!r.ok, 'zero stock rejected');
r = gs.ienCheckOrder(inv, [{ id: 'nope', size: '4"', qty: 1 }]); assert.ok(!r.ok, 'unknown plant rejected');

// web parse of feed in .gs output shape: prices from table, sizes normalized
const list = web.IENN.parse({ plants: ['White Sage (Salvia apiana)'], defaultPrices: { '4"': 99 }, stock: { 'White Sage (Salvia apiana)': { '4"': 3, '1 gal': 9 } } });
assert.deepStrictEqual(list[0].sizes.map(s => [s.size, s.price, s.status]), [['4-inch', 6, 'low'], ['1-gallon', 15, 'in']]);
console.log('all pricing/stock tests passed');
