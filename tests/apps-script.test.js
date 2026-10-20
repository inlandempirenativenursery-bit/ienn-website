// Run: node tests/apps-script.test.js   (no dependencies)
const assert = require('assert'), vm = require('vm'), { load } = require('./gas-harness');
const J = x => JSON.parse(JSON.stringify(x));
let pass = 0; const t = (name, fn) => { fn(); pass++; console.log('ok -', name); };
const order = (h, items, extra) => JSON.parse(h.ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ name: 'Ana Lopez', email: 'ana@example.com', phone: '9095550100', notes: 'Saturday 11am', items }, extra)) } }).getContent());

t('size matching is forgiving', () => {
  const { ctx } = load();
  ['4"', '4 inch', '4in', '4-inch pot', '4 IN', "4''", '4\u201d'].forEach(h => assert.strictEqual(ctx.iennSize_(h).key, '4"', h));
  ['1 gal', '1 Gallon', '1-gallon', '1gal'].forEach(h => assert.strictEqual(ctx.iennSize_(h).key, '1 gal', h));
  ['Tree pot', 'Quarter tree pot', 'Qtr Tree Pot'].forEach(h => assert.strictEqual(ctx.iennSize_(h).key, 'Tree pot', h));
  assert.strictEqual(ctx.iennSize_('2-inch pot').key, '2"'); assert.strictEqual(ctx.iennSize_('huge'), null);
});

t('inventory = latest week counts minus invoices since that week; untracked sizes null; prices by size', () => {
  const { ctx } = load();
  const inv = J(ctx.iennInventory());
  const ws = inv.plants.find(p => p.name === 'White Sage');
  // latest week 10-12: 4" 2+1=3, 1 gal 6+4=10; INV-091 (10-14) sold 2 x 1 gal; INV-090 (10-10) is before the baseline
  assert.deepStrictEqual(ws.sizes.map(s => [s.key, s.qty, s.price]), [['2"', null, 3], ['4"', 3, 6], ['Tree pot', null, 10], ['1 gal', 8, 15]]);
  assert.strictEqual(ws.fullName, 'White Sage (Salvia apiana)'); assert.strictEqual(ws.botanical, 'Salvia apiana');
  assert.strictEqual(inv.plants.find(p => p.name === 'Blue Pyramid Cypress').sizes[1].qty, 0, 'not counted -> 0 for tracked size');
  assert.strictEqual(inv.taxPct, 8.75); assert.strictEqual(inv.plants.length, 5);
  const jsonp = ctx.iennRoute_({ parameter: { view: 'inventory', callback: 'cb1' } }).getContent();
  assert.match(jsonp, /^cb1\(\{/); assert.strictEqual(ctx.iennRoute_({ parameter: { view: 'customer' } }), null);
  // Status columns were added to IENN Invoices (only change to existing sheets)
  assert.deepStrictEqual(J(ctx.SpreadsheetApp.getActive().getSheetByName('IENN Invoices').rows[0].slice(-3)), ['Status', 'Handled by', 'Our response']);
});

t('website order goes through existing submitInvoice, stock drops, one team email (existing tool)', () => {
  const h = load();
  const r = order(h, [{ plant: 'White Sage (Salvia apiana)', sizeKey: '4"', qty: 2 }, { plant: 'White Sage (Salvia apiana)', sizeKey: '4"', qty: 1 },
    { plant: 'Toyon (Heteromeles arbutifolia)', sizeKey: '1 gal', qty: 1 }, { plant: 'Blue Pyramid Cypress', sizeKey: 'Tree pot', qty: 2 }]);
  assert.strictEqual(r.ok, true, JSON.stringify(r)); assert.strictEqual(r.orderId, 'INV-101');
  assert.strictEqual(r.subtotal, 18 + 15 + 20); assert.strictEqual(r.tax, 4.64); assert.strictEqual(r.total, 57.64);
  const row = h.ss.sheets['IENN Invoices'].rows.slice(-1)[0];
  assert.strictEqual(row[0], 'INV-101'); assert.match(row[3], /^Website order — Ana Lopez · 9095550100\nSaturday 11am$/);
  assert.deepStrictEqual(JSON.parse(row[4]).map(l => [l.size, l.qty, l.amt]), [['4"', '2', '12.00'], ['4"', '1', '6.00'], ['1 gal', '1', '15.00'], ['Tree pot', '2', '20.00']]);
  const inv = J(h.ctx.iennInventory());
  assert.strictEqual(inv.plants.find(p => p.name === 'White Sage').sizes[1].qty, 0);
  assert.strictEqual(inv.plants.find(p => p.name === 'Toyon').sizes[3].qty, 1);
  assert.strictEqual(h.sent.length, 1); assert.strictEqual(h.sent[0].to, 'team@existing.tool', 'no duplicate notification');
  assert.strictEqual(h.lockState.calls, 1); assert.strictEqual(h.lockState.held, false);
  assert.strictEqual(h.ss.sheets['Submissions'].rows.length, 4, 'Submissions untouched');
});

t('oversell rejected with clear message; nothing written', () => {
  const h = load(), before = h.ss.sheets['IENN Invoices'].rows.length;
  const r = order(h, [{ plant: 'White Sage (Salvia apiana)', sizeKey: '4"', qty: 5 }, { plant: 'Sticky Monkeyflower (Diplacus aurantiacus)', sizeKey: '4"', qty: 1 }, { plant: 'Yarrow', sizeKey: '2"', qty: 50 }]);
  assert.strictEqual(r.ok, false); assert.strictEqual(r.error, 'stock');
  assert.deepStrictEqual(J(r.problems.map(p => [p.plant, p.sizeKey, p.available])), [['White Sage', '4"', 3], ['Sticky Monkeyflower', '4"', 0]]);
  assert.match(r.message, /Only 3 White Sage \(4-inch pot\) left — you asked for 5\./); assert.match(r.message, /Sticky Monkeyflower \(4-inch pot\) just sold out\./);
  assert.strictEqual(h.ss.sheets['IENN Invoices'].rows.length, before); assert.strictEqual(h.sent.length, 0);
});

t('second order cannot reuse stock; busy lock rejects; customer-view path throws', () => {
  const h = load();
  assert.strictEqual(order(h, [{ plant: 'Toyon (Heteromeles arbutifolia)', sizeKey: '1 gal', qty: 2 }]).ok, true);
  const r2 = order(h, [{ plant: 'Toyon (Heteromeles arbutifolia)', sizeKey: '1 gal', qty: 1 }]);
  assert.strictEqual(r2.ok, false); assert.strictEqual(r2.problems[0].available, 0);
  assert.throws(() => h.ctx.iennSubmitInvoiceChecked({ customerEmail: 'x@y.co', lines: [{ plant: 'Toyon', size: '1 gal', qty: '1', amt: '15' }] }), /just sold out/);
  h.lockState.held = true; assert.strictEqual(order(h, [{ plant: 'Yarrow', sizeKey: '2"', qty: 1 }]).error, 'busy');
});

t('new weekly count resets the baseline; cancelled invoices are not subtracted', () => {
  const h = load();
  order(h, [{ plant: 'White Sage (Salvia apiana)', sizeKey: '1 gal', qty: 3 }]);              // 8 -> 5
  const inv = h.ss.sheets['IENN Invoices']; inv.rows[2][10] = 'Cancelled';                     // cancel INV-091 (2 units)
  assert.strictEqual(J(h.ctx.iennInventory()).plants[0].sizes[3].qty, 7);
  h.ss.sheets['Submissions'].rows.push([new Date('2026-10-21'), 'Keith', JSON.stringify({ p1: { four: 4, gal1: 12 } })]);
  assert.strictEqual(J(h.ctx.iennInventory()).plants[0].sizes[3].qty, 12, 'orders before the new count are no longer subtracted');
});

t('invalid input rejected; server ignores client prices', () => {
  const h = load();
  assert.strictEqual(order(h, [], { name: '' }).error, 'invalid');
  assert.strictEqual(order(h, [{ plant: 'Yarrow', sizeKey: '4"', qty: 1 }], { email: 'bad' }).error, 'invalid');
  assert.strictEqual(order(h, [{ plant: 'Yarrow', sizeKey: 'huge', qty: 1 }]).error, 'invalid');
  assert.strictEqual(order(h, [{ plant: 'Yarrow', sizeKey: '2"', qty: 1, price: 0.01 }]).subtotal, 3);
});

t('optional extra team email (off by default) skips placeholders and contains summary + link', () => {
  const h = load(); vm.runInContext("IENN_EXTRA_TEAM_EMAIL = true;", h.ctx);
  order(h, [{ plant: 'Yarrow', sizeKey: '2"', qty: 1 }]); assert.strictEqual(h.sent.length, 1, 'placeholders skipped');
  vm.runInContext("TEAM_EMAILS = ['eric@test.local','andrew@test.local','keith@test.local','raylene@test.local'];", h.ctx);
  order(h, [{ plant: 'Yarrow', sizeKey: '2"', qty: 2 }]);
  const m = h.sent[h.sent.length - 1];
  assert.strictEqual(m.to, 'eric@test.local,andrew@test.local,keith@test.local,raylene@test.local');
  assert.match(m.body, /2 × Yarrow \(2"\) = \$6\.00/); assert.match(m.body, /#gid=3/); assert.match(m.body, /One person please claim/);
});

t('reply draft fills template from IENN Invoices, keeps placeholders, never sends', () => {
  const h = load(); const r = order(h, [{ plant: 'White Sage (Salvia apiana)', sizeKey: '4"', qty: 2 }]);
  const rows = h.ss.sheets['IENN Invoices'].rows, last = rows[rows.length - 1]; last[12] = 'Ready Saturday!';
  const sentBefore = h.sent.length, d = h.ctx.iennDraftReply(r.orderId);
  assert.strictEqual(h.drafts.length, 1); assert.strictEqual(h.sent.length, sentBefore);
  assert.strictEqual(d.to, 'ana@example.com'); assert.match(d.body, /Hi Ana Lopez,/);
  assert.match(d.body, /2 × White Sage \(4-inch pot\) @ \$6 = \$12\.00/);
  assert.match(d.body, /Subtotal: \$12\.00\nTax \(8\.75%\): \$1\.05\nTotal: \$13\.05/);
  assert.match(d.body, /Payment status: Not paid yet/); assert.match(d.body, /\{\{PAYMENT_METHOD\}\}/); assert.match(d.body, /\{\{PICKUP_ADDRESS\}\}/);
  assert.match(d.body, /Your notes: Saturday 11am/); assert.match(d.body, /Our response:\nReady Saturday!/);
});

t('print list + CSV: sorted by availability then appeal, prices on sizes', () => {
  const { ctx } = load();
  const html = ctx.iennPrintHtml_(), csv = ctx.iennPrintCsv_().split('\n');
  assert.match(html, /images\/ienn-logo-sage\.png/); assert.match(html, /October 20, 2026/); assert.match(html, /4-inch pot<br><small>\$6/);
  assert.strictEqual(csv[0], 'Plant,Botanical,2-inch pot ($3),4-inch pot ($6),Quarter tree pot ($10),1-gallon ($15)');
  assert.deepStrictEqual(csv.slice(1).map(l => l.split(',')[0]), ['White Sage', 'Sticky Monkeyflower', 'Toyon', 'Yarrow', 'Blue Pyramid Cypress']);
  assert.strictEqual(csv[1], 'White Sage,Salvia apiana,Ask,3,Ask,8');
  assert.match(ctx.iennHubHtml_(), /Orders<\/b><span>2 New/);
});

console.log(`\n${pass} tests passed`);
