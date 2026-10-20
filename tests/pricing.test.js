// node tests/pricing.test.js — sizes/prices/tax (web + Apps Script), Submissions aggregation, Sold ledger, stock check, print list
const assert = require('assert');
const L = require('../apps-script/ienn-stock-ledger.gs');
global.IENN_SIZES = L.IENN_SIZES; global.IENN_SIZE_PRICES = L.IENN_SIZE_PRICES; global.IENN_TAX_PCT = L.IENN_TAX_PCT; global.ienNormSize = L.ienNormSize;
const PL = require('../apps-script/ienn-printlist.gs');
const W = require('../inventory.js');

const cases = { '4"': '4"', '4in': '4"', '4-inch': '4"', 'four': '4"', '1 gal': '1 gal', '1-gallon': '1 gal', 'gal1': '1 gal', '1 Gallon': '1 gal',
  '2"': '2"', '2-inch': '2"', 'quarter': 'Tree pot', '1/4 tree': 'Tree pot', 'Tree pot': 'Tree pot', '5 gal': null, '': null };
for (const [k, v] of Object.entries(cases)) { assert.strictEqual(L.ienNormSize(k), v, 'gs ' + k); assert.strictEqual(W.ienNormSize(k), v, 'web ' + k); }
for (const f of [L.ienPrice, W.ienPrice]) assert.deepStrictEqual(['2"', '4in', 'tree pot', '1 gal'].map(f), [3, 6, 10, 15]);
assert.deepStrictEqual(L.ienTax(21.75), { subtotal: 20, tax: 1.75, total: 21.75 }); assert.deepStrictEqual(W.ienTax(21.75), L.ienTax(21.75));

// Submissions: two people, re-submission replaces, older week ignored
const subs = [['Timestamp', 'Person', 'Counts'],
  ['2026-10-05T10:00:00', 'Andrew', JSON.stringify({ ws: { four: 50, gal1: 50 } })],          // previous week
  ['2026-10-12T09:00:00', 'Andrew', JSON.stringify({ ws: { four: 4, gal1: 6 }, mf: { gal1: 2 } })],
  ['2026-10-12T11:00:00', 'Keith', JSON.stringify({ ws: { four: 1 } })],
  ['2026-10-13T08:00:00', 'Andrew', JSON.stringify({ ws: { four: 5, gal1: 6 }, mf: { gal1: 3 } })]];  // Andrew re-submits same week
const agg = L.ienAggregateSubmissions(subs);
assert.strictEqual(agg.week, '2026-W42');
assert.deepStrictEqual(agg.counts, { ws: { four: 6, gal1: 6 }, mf: { gal1: 3 } });
const cat = L.ienCatalog([['Id', 'Name', 'Botanical'], ['ws', 'White Sage', 'Salvia apiana'], ['mf', 'Sticky Monkeyflower (Diplacus aurantiacus)', '']]);
const raw = L.ienCountsByName(agg, cat);
assert.deepStrictEqual(raw, { 'White Sage': { '4"': 6, '1 gal': 6 }, 'Sticky Monkeyflower (Diplacus aurantiacus)': { '1 gal': 3 } });

// Sold ledger: only same-week rows subtract; new week resets baseline
const sold = [['Order ID', 'Timestamp', 'Week', 'Plant ID', 'Plant', 'Size key', 'Qty', 'Source', 'Customer'],
  ['INV-1', '', '2026-W41', 'ws', 'White Sage (Salvia apiana)', 'four', 40, 'invoice', ''],
  ['INV-2', '', '2026-W42', 'ws', 'White Sage (Salvia apiana)', 'four', 2, 'website', ''],
  ['INV-3', '', '2026-W42', 'mf', 'Sticky Monkeyflower', 'gal1', 3, 'invoice', '']];
const avail = L.ienSubtractSold(raw, sold, agg.week);
assert.deepStrictEqual(avail, { 'White Sage': { '4"': 4, '1 gal': 6 }, 'Sticky Monkeyflower (Diplacus aurantiacus)': { '1 gal': 0 } });
assert.deepStrictEqual(L.ienSubtractSold(raw, sold, '2026-W43')['White Sage'], { '4"': 6, '1 gal': 6 }, 'new week resets');

// Stock check (cumulative across lines)
assert.ok(L.ienCheckLines(avail, [{ plant: 'White Sage (Salvia apiana)', size: '4"', qty: '4' }]).ok);
assert.ok(!L.ienCheckLines(avail, [{ plant: 'White Sage', size: '4"', qty: '3' }, { plant: 'White Sage', size: '4in', qty: '2' }]).ok);
assert.ok(!L.ienCheckLines(avail, [{ plant: 'Sticky Monkeyflower', size: '1 gal', qty: '1' }]).ok, 'sold out');
assert.ok(!L.ienCheckLines(avail, [{ plant: 'Toyon', size: '1 gal', qty: '1' }]).ok, 'unknown');

// Print list
const rows = PL.ienPlantListRows(avail, L.ienCatalogBotanical([['Id', 'Name', 'Botanical'], ['ws', 'White Sage', 'Salvia apiana']]));
assert.deepStrictEqual(rows.map(r => [r.name, r.botanical, r.sizes.map(s => s.size + ':' + s.qty + ':$' + s.price).join()]), [['White Sage', 'Salvia apiana', '4":4:$6,1 gal:6:$15']]);
assert.ok(/Plant,Botanical,Size,Qty,Price\n"White Sage","Salvia apiana","4""",4,6/.test(PL.ienPlantListCsv(rows)));

// Web parse of the new feed shape
const list = W.IENN.parse({ plants: ['White Sage (Salvia apiana)'], defaultPrices: { '4"': 99 }, stock: { 'White Sage (Salvia apiana)': { '4"': 3, '1 gal': 9 } } });
assert.deepStrictEqual(list[0].sizes.map(s => [s.size, s.price, s.status]), [['4"', 6, 'low'], ['1 gal', 15, 'in']]);
console.log('all tests passed');
if (process.argv[2]) require('fs').writeFileSync(process.argv[2], PL.ienPrintHtml(PL.ienPlantListRows({
  'White Sage (Salvia apiana)': { '4"': 4, '1 gal': 6 }, 'Sticky Monkeyflower (Diplacus aurantiacus)': { '1 gal': 12 },
  'California Buckwheat (Eriogonum fasciculatum)': { '4"': 7 }, 'Toyon (Heteromeles arbutifolia)': { '1 gal': 0, 'Tree pot': 4 }, 'Yarrow': { '4"': 0 } }, {}),
  { date: 'Oct 20, 2026 — MOCK DATA', week: '2026-W42', logo: '../images/ienn-logo-sage.png', csvUrl: '#' }));
