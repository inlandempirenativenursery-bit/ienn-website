// Count tool (Inventory v4): Code.gs server + Index.html client helpers. Run: node tests/inventory-count.test.js
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { makeSheet } = require('./gas-harness.js');
let pass = 0; const t = (n, f) => { f(); pass++; console.log('ok -', n); };
const J = x => JSON.parse(JSON.stringify(x));
function load(catalog) {
  const ss = { sheets: {}, getSheetByName(n) { return this.sheets[n] || null; } };
  ss.sheets.Submissions = makeSheet('Submissions', [['week', 'person', 'at', 'counts'],
    ['2026-W43', 'eric', 1, JSON.stringify({ apiana: { four: 3, gal1: 2, fourReady: 1, gal1Ready: 2 } })]], 1, ss);
  ss.sheets.Catalog = makeSheet('Catalog', catalog, 2, ss);
  ss.sheets.Settings = makeSheet('Settings', [['key', 'value'], ['emails', '{}']], 3, ss);
  const ctx = { SpreadsheetApp: { openById: () => ss, create: () => { throw new Error('must not create'); } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'DB', setProperty() {} }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'u' }) }, Utilities: { formatDate: () => '2026-10-21' },
    HtmlService: {}, JSON, Math, Date, Object, String, Number, Array };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script-inventory', 'Code.gs'), 'utf8'), ctx);
  return { ctx, ss };
}
const LIVE_CAT = [['ID', 'Name', 'Photo URL', 'Pin', 'Badge'], ['apiana', 'White sage (Salvia apiana)', 'https://x/a.jpg', '', 'Staff pick'], ['deergrass', 'Deergrass (Muhlenbergia rigens)', '', '1', '']];
const OLD_CAT = [['id', 'common', 'latin', 'band'], ['apiana', 'White sage', 'Salvia apiana', 'active']];

t('catalog by header: ID | Name "Common (Botanical)" | Photo | Pin | Badge, and the original id|common|latin|band', () => {
  assert.deepStrictEqual(J(load(LIVE_CAT).ctx.catalog_()), [{ id: 'apiana', common: 'White sage', latin: 'Salvia apiana', band: 'popular' }, { id: 'deergrass', common: 'Deergrass', latin: 'Muhlenbergia rigens', band: 'popular' }]);
  assert.deepStrictEqual(J(load(OLD_CAT).ctx.catalog_()), [{ id: 'apiana', common: 'White sage', latin: 'Salvia apiana', band: 'active' }]);
});
t('new Catalog row shows up in the board with all four sizes (+ready) at 0', () => {
  const h = load(LIVE_CAT.concat([['newbie', 'Bush mallow (Malacothamnus fasciculatus)', '', '', '']])), b = h.ctx.getBoard();
  assert.ok(b.plants.some(p => p.id === 'newbie' && p.common === 'Bush mallow'));
  assert.deepStrictEqual(J(b.compiled.newbie), { two: 0, twoReady: 0, four: 0, fourReady: 0, tree: 0, treeReady: 0, gal1: 0, gal1Ready: 0 });
});
t('old submissions without two/tree read as 0; new keys are stored and compiled; history sums them', () => {
  const h = load(LIVE_CAT); let b = h.ctx.getBoard();
  assert.deepStrictEqual(J(b.compiled.apiana), { two: 0, twoReady: 0, four: 3, fourReady: 1, tree: 0, treeReady: 0, gal1: 2, gal1Ready: 2 });
  b = h.ctx.submitCount({ person: 'keith', counts: { apiana: { four: 1, gal1: 0, fourReady: 1, gal1Ready: 0, two: 12, twoReady: 5, tree: 2, treeReady: 2 } } });
  assert.deepStrictEqual(JSON.parse(h.ss.sheets.Submissions.rows.slice(-1)[0][3]).apiana.two, 12);
  const wk = b.history.find(r => r.week === b.week); assert.strictEqual(wk.two, 12); assert.strictEqual(wk.treeReady, 2);
});
t('addPlant writes ID + "Name (Botanical)" into the header-matched columns', () => {
  const h = load(LIVE_CAT); h.ctx.addPlant({ common: 'Bush mallow', latin: 'Malacothamnus fasciculatus' });
  const row = h.ss.sheets.Catalog.rows.slice(-1)[0]; assert.match(row[0], /^p\d+$/); assert.strictEqual(row[1], 'Bush mallow (Malacothamnus fasciculatus)'); assert.strictEqual(row.length, 5);
  const o = load(OLD_CAT); o.ctx.addPlant({ common: 'Yarrow', latin: 'Achillea millefolium' }); assert.deepStrictEqual(J(o.ss.sheets.Catalog.rows.slice(-1)[0].slice(1)), ['Yarrow', 'Achillea millefolium', 'back']);
});
t('Index.html: four size columns per plant; 2"/Tree keys only sent when non-zero', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'apps-script-inventory', 'Index.html'), 'utf8');
  const js = html.match(/<script>([\s\S]*?)<\/script>/g).pop().replace(/<\/?script>/g, '');
  const helpers = js.slice(js.indexOf('var SIZES'), js.indexOf('function toast'));
  const c = {}; vm.createContext(c); vm.runInContext(helpers + ';this.out={SIZES,blankCounts,cleanCounts};', c);
  assert.deepStrictEqual(J(c.out.SIZES.map(z => z.key)), ['two', 'four', 'tree', 'gal1']);
  assert.deepStrictEqual(J(c.out.cleanCounts({ a: Object.assign(c.out.blankCounts(), { four: 2, fourReady: 2 }), b: Object.assign(c.out.blankCounts(), { two: 4, twoReady: 1 }) })),
    { a: { four: 2, gal1: 0, fourReady: 2, gal1Ready: 0 }, b: { four: 0, gal1: 0, fourReady: 0, gal1Ready: 0, two: 4, twoReady: 1 } });
  assert.ok(/SIZES\.map\(function \(z\) \{ return sizeCol\(/.test(js)); assert.ok(/submitCount\(\{ person: who, counts: cleanCounts\(draft\) \}\)/.test(js));
});
console.log('\n' + pass + ' total tests passed');
