// Run: node tests/apps-script.test.js   (no dependencies)
const assert = require('assert'), vm = require('vm'), { load } = require('./gas-harness');
const J = x => JSON.parse(JSON.stringify(x));
let pass = 0; const t = (name, fn) => { fn(); pass++; console.log('ok -', name); };
const order = (h, items, extra) => JSON.parse(h.ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ name: 'Ana Lopez', email: 'ana@example.com', phone: '9095550100', notes: 'Saturday 11am', pickup: 'Saturday 10 AM – 2 PM', payment: 'Zelle', items }, extra)) } }).getContent());

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
  assert.strictEqual(inv.taxIncluded, true); assert.strictEqual(inv.onRequestLabel, 'Available on request'); assert.strictEqual(inv.plants.length, 5);
  const jsonp = ctx.iennRoute_({ parameter: { view: 'inventory', callback: 'cb1' } }).getContent();
  assert.match(jsonp, /^cb1\(\{/);
  // Status columns were added to IENN Invoices (only change to existing sheets)
  assert.deepStrictEqual(J(ctx.SpreadsheetApp.getActive().getSheetByName('IENN Invoices').rows[0].slice(-3)), ['Status', 'Handled by', 'Our response']);
});

t('website order goes through existing submitInvoice, stock drops, one team email (existing tool)', () => {
  const h = load();
  const r = order(h, [{ plant: 'White Sage (Salvia apiana)', sizeKey: '4"', qty: 2 }, { plant: 'White Sage (Salvia apiana)', sizeKey: '4"', qty: 1 },
    { plant: 'Toyon (Heteromeles arbutifolia)', sizeKey: '1 gal', qty: 1 }, { plant: 'Blue Pyramid Cypress', sizeKey: 'Tree pot', qty: 2 }]);
  assert.strictEqual(r.ok, true, JSON.stringify(r)); assert.strictEqual(r.orderId, 'INV-101');
  assert.strictEqual(r.total, 18 + 15 + 20, 'customer total = sum of displayed (tax-included) prices'); assert.strictEqual(r.tax, undefined);
  const row = h.ss.sheets['IENN Invoices'].rows.slice(-1)[0];
  assert.strictEqual(row[0], 'INV-101'); assert.match(row[3], /^Website order — Ana Lopez · 9095550100\nPickup: Saturday 10 AM – 2 PM\nPays by: Zelle\nSaturday 11am$/);
  assert.deepStrictEqual([row[5], row[6], row[7]], ['48.74', '4.26', '53.00'], 'records: tax backed out of the tax-included total');
  assert.strictEqual(row[10], 'New'); assert.strictEqual(row[11], 'Andrew', 'Handled by defaults to Andrew');
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
  assert.strictEqual(order(h, [{ plant: 'Yarrow', sizeKey: '2"', qty: 1, price: 0.01 }]).total, 3);
});

t('optional extra team email (off by default) skips placeholders and contains summary + link', () => {
  const h = load(); vm.runInContext("IENN_EXTRA_TEAM_EMAIL = true;", h.ctx);
  order(h, [{ plant: 'Yarrow', sizeKey: '2"', qty: 1 }]); assert.strictEqual(h.sent.length, 1, 'placeholders skipped');
  vm.runInContext("TEAM_EMAILS = ['eric@test.local','andrew@test.local','keith@test.local','raylene@test.local'];", h.ctx);
  order(h, [{ plant: 'Yarrow', sizeKey: '2"', qty: 2 }]);
  const m = h.sent[h.sent.length - 1];
  assert.strictEqual(m.to, 'eric@test.local,andrew@test.local,keith@test.local,raylene@test.local');
  assert.match(m.body, /2 × Yarrow \(2"\) = \$6\.00/); assert.match(m.body, /#gid=3/); assert.match(m.body, /Total: \$6\.00 \(taxes included\)/);
  assert.match(m.body, /Andrew is handling this order/); assert.doesNotMatch(m.body, /plus tax/);
});

t('reply draft fills template from IENN Invoices, keeps placeholders, never sends', () => {
  const h = load(); const r = order(h, [{ plant: 'White Sage (Salvia apiana)', sizeKey: '4"', qty: 2 }]);
  const rows = h.ss.sheets['IENN Invoices'].rows, last = rows[rows.length - 1]; last[12] = 'Ready Saturday!';
  const sentBefore = h.sent.length, d = h.ctx.iennDraftReply(r.orderId);
  assert.strictEqual(h.drafts.length, 1); assert.strictEqual(h.sent.length, sentBefore);
  assert.strictEqual(d.to, 'ana@example.com'); assert.match(d.body, /Hi Ana Lopez,/);
  assert.match(d.body, /2 × White Sage \(4-inch pot\) @ \$6 = \$12\.00/);
  assert.match(d.body, /Total: \$12\.00 \(taxes included\)/); assert.doesNotMatch(d.body, /Tax \(/); assert.match(d.body, /Call or text Andrew: \(909\) 609-9373/);
  assert.match(d.body, /Payment status: Not paid yet/); assert.match(d.body, /\{\{PAYMENT_METHOD\}\}/); assert.match(d.body, /\{\{PICKUP_ADDRESS\}\}/);
  assert.match(d.body, /Your notes: Pickup: Saturday 10 AM – 2 PM\nPays by: Zelle\nSaturday 11am/); assert.match(d.body, /Our response:\nReady Saturday!/);
});

t('print list + CSV: sorted by availability then appeal, prices on sizes', () => {
  const { ctx } = load();
  const html = ctx.iennPrintHtml_(), csv = ctx.iennPrintCsv_().split('\n');
  assert.match(html, /images\/ienn-logo-sage\.png/); assert.match(html, /October 20, 2026/); assert.match(html, /4-inch pot<br><small>\$6/);
  assert.strictEqual(csv[0], 'Plant,Botanical,2-inch pot ($3),4-inch pot ($6),Quarter tree pot ($10),1-gallon ($15)');
  assert.deepStrictEqual(csv.slice(1).map(l => l.split(',')[0]), ['White Sage', 'Sticky Monkeyflower', 'Toyon', 'Yarrow', 'Blue Pyramid Cypress']);
  assert.strictEqual(csv[1], 'White Sage,Salvia apiana,On request,3,On request,8');
  assert.match(html, /taxes included/); assert.doesNotMatch(html, /plus tax/); assert.match(html, /href="tel:\+19096099373">\(909\) 609-9373/);
  assert.match(ctx.iennRoute_({ parameter: { view: 'printlist' } }).getContent(), /Plant list/);
  assert.match(ctx.iennHubHtml_(), /Orders<\/b><span>2 New/);
});

t('public ?view=customer no longer takes orders: message + link to the website shop', () => {
  const { ctx } = load(); const html = ctx.iennRoute_({ parameter: { view: 'customer' } }).getContent();
  assert.match(html, /Orders have moved to our website/); assert.match(html, /ienn-website\/order\.html/); assert.match(html, /tel:\+19096099373/);
  assert.strictEqual(ctx.iennRoute_({ parameter: {} }), null, 'internal Index view untouched');
});

t('claim defaults to Andrew; team-entered order uses the same checked submit + stock', () => {
  const h = load();
  const res = h.ctx.iennSubmitInvoiceChecked({ customerEmail: 'fb@x.co', note: 'Facebook Marketplace', lines: [{ plant: 'Toyon (Heteromeles arbutifolia)', size: '1 gal', qty: '2', amt: '30.00' }], subtotal: '27.59', tax: '2.41', grand: '30.00' });
  assert.strictEqual(res.invoiceNumber, 'INV-101');
  assert.strictEqual(J(h.ctx.iennInventory()).plants.find(p => p.name === 'Toyon').sizes[3].qty, 0);
  const rows = h.ss.sheets['IENN Invoices'].rows; assert.strictEqual(rows[rows.length - 1][11], 'Andrew');
});

t('promo: date range, active flag, open-ended, first match wins, bad rows skipped', () => {
  const { ctx } = load(), H = ['Active', 'Title', 'Message', 'Start date', 'End date', 'Discount note'];
  const pick = (rows, d) => J(ctx.iennPickPromo_([H].concat(rows), d));
  const fall = ['Yes', 'Fall Sale', 'Plant now', '2026-11-01', '2026-11-30', ''];
  assert.strictEqual(pick([fall], '2026-10-31'), null, 'before start');
  assert.strictEqual(pick([fall], '2026-11-01').title, 'Fall Sale', 'start inclusive');
  assert.strictEqual(pick([fall], '2026-11-30').title, 'Fall Sale', 'end inclusive');
  assert.strictEqual(pick([fall], '2026-12-01'), null, 'after end');
  assert.strictEqual(pick([['No', 'Off', '', '', '', '']], '2026-11-05'), null, 'Active=No');
  assert.strictEqual(pick([[' yes ', 'Open', '', '', '', '']], '2030-01-01').title, 'Open', 'blank start+end = open-ended, yes is case/space tolerant');
  assert.strictEqual(pick([['Yes', 'NoEnd', '', '2026-10-01', '', '']], '2027-05-01').title, 'NoEnd');
  assert.strictEqual(pick([['Yes', 'NoStart', '', '', '10/25/2026', '']], '2026-10-20').title, 'NoStart', 'm/d/yyyy accepted');
  assert.strictEqual(pick([['Yes', 'Bad', '', 'soon', '', ''], ['Yes', 'Second', 'm', '', '', 'e.g. 10%']], '2026-10-20').title, 'Second', 'unreadable date skipped; first valid wins');
  assert.deepStrictEqual(pick([['Yes', 'A', 'msg', new Date(Date.UTC(2026, 9, 18, 12)), '', 'note']], '2026-10-20'), { title: 'A', message: 'msg', start: '2026-10-18', end: '', discountNote: 'note' });
  assert.strictEqual(ctx.iennPickPromo_([['Title'], ['x']], '2026-10-20'), null, 'no Active column -> null');
});

t('promo: missing tab -> null in inventory; iennSetup creates Promos with inactive examples', () => {
  const h = load();
  assert.strictEqual(J(h.ctx.iennInventory()).promo, null);
  h.ctx.iennSetup();
  const rows = h.ss.sheets['Promos'].rows;
  assert.deepStrictEqual(J(rows[0]), ['Active', 'Title', 'Message', 'Start date', 'End date', 'Discount note']);
  assert.deepStrictEqual(rows.slice(1).map(r => [r[0], r[1]]), [['No', 'Fall Sale'], ['No', 'Spring Sale'], ['No', 'Summer Sale']]);
  assert.strictEqual(J(h.ctx.iennInventory()).promo, null, 'examples are inactive');
  rows[1][0] = 'Yes'; rows[1][3] = '2026-10-01'; rows[1][4] = ''; // open-ended so the test doesn't depend on the real clock
  assert.strictEqual(J(h.ctx.iennInventory()).promo.title, 'Fall Sale');
  h.ctx.iennSetup(); assert.strictEqual(h.ss.sheets['Promos'].rows.length, 4, 'setup does not duplicate');
});

console.log(`\n${pass} tests passed`);
