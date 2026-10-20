// Unit tests for docs/inventory-apps-script.gs with stubbed Apps Script services and stubbed
// existing project functions (getAvailableStockRaw_, submitInvoiceRaw_, getSettings). Run: node test/gs.test.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../docs/inventory-apps-script.gs', 'utf8');
const J = x => JSON.stringify(x);
function makeEnv(opts = {}) {
  const sheets = {
    Submissions: [['Timestamp', 'Person', 'Week', 'Counts'], [1, 'Eric', '2026-10-12', '{}'], [2, 'Keith', '2026-10-19', '{}']],
    Catalog: [['id', 'Common name'], ['ws', 'White Sage'], ['mf', 'Sticky Monkeyflower'], ['ya', 'Yarrow']]
  };
  const inv = [['Invoice #', 'Name', 'Email', 'Items', 'Subtotal', 'Tax', 'Total', 'Notes', 'Status', 'Paid', 'Payment method', 'Pickup address', 'Pickup window', 'Our response']];
  const raw = { 'White Sage': { '4"': 6, '1 gal': 2 }, 'Sticky Monkeyflower': { '4"': 4, '1 gal': 15 }, 'Yarrow': { '1 gal': 0 } };
  const mail = [], lock = { held: false, n: 0 }; let invNo = 100;
  function sheet(name, data) { data = data || sheets[name];
    return { getDataRange: () => ({ getValues: () => data.map(r => r.slice()) }), appendRow: r => data.push(r),
      getSheetId: () => 7, getParent: () => ({ getUrl: () => 'https://docs.google.com/spreadsheets/d/INV/edit' }) }; }
  const ctx = {
    SpreadsheetApp: { getActive: () => ({ getSheetByName: n => sheets[n] ? sheet(n) : null, insertSheet: n => { sheets[n] = []; return sheet(n); } }),
      openById: () => ({ getSheets: () => [sheet(null, inv)], getSheetByName: () => sheet(null, inv) }), flush() {} },
    MailApp: { sendEmail: m => mail.push(m) },
    LockService: { getScriptLock: () => ({ tryLock: () => { if (lock.held) return false; lock.held = true; lock.n++; return true; }, releaseLock: () => { lock.held = false; } }) },
    ContentService: { MimeType: { JSON: 'json', CSV: 'csv' }, createTextOutput: s => ({ s, setMimeType() { return this; }, downloadAsFile(f) { this.f = f; return this; } }) },
    HtmlService: { createHtmlOutput: h => ({ h, setTitle() { return this; } }) },
    Utilities: { formatDate: () => '2026-10-20' },
    getSettings: () => ({ teamEmails: opts.team || ['a@test.invalid', 'b@test.invalid'] }),
    getAvailableStockRaw_: () => JSON.parse(J(raw)),
    submitInvoiceRaw_: p => { const no = 'INV-' + (++invNo); const sub = p.items.reduce((a, i) => a + i.price * i.qty, 0);
      inv.push([no, p.customer.name, p.customer.email, p.items.map(i => i.qty + ' x ' + i.plant + ' (' + i.size + ')').join('\n'), sub, '', '', p.notes, 'New', 'No', '', '', '', '']);
      ctx.lastPayload = p; return { invoiceNo: no }; }
  };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  ctx.IENN_CFG.INVOICES_SPREADSHEET_ID = 'INV';
  return { ctx, sheets, inv, mail, lock, raw };
}
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok -', name); };
const order = (items, extra) => Object.assign({ name: 'Ana Ruiz', email: 'ana@example.com', notes: 'Sat 11am', items }, extra);

t('feed: Catalog names + getAvailableStock, only 4"/1 gal, prices, on-request sizes', () => {
  const { ctx } = makeEnv(); const f = JSON.parse(ctx.ienWebsiteGet_({ parameter: { view: 'json' } }).s);
  assert.strictEqual(J(f.plants.map(p => p.name)), J(['White Sage', 'Sticky Monkeyflower', 'Yarrow']));
  assert.strictEqual(J(f.plants[0].sizes), J([{ size: '4"', stock: 6, price: 6 }, { size: '1 gal', stock: 2, price: 15 }]));
  assert.strictEqual(J(f.onRequestSizes), J(['2"', 'Tree pot'])); assert.strictEqual(f.week, '2026-10-19'); assert.strictEqual(f.taxRate, 0.0875);
  assert.strictEqual(ctx.ienWebsiteGet_({ parameter: { view: 'customer' } }), null);
});
t('website order: goes through submitInvoice, logs Sold, stock decreases, Submissions untouched', () => {
  const { ctx, sheets, inv, mail, lock } = makeEnv(); const before = J(sheets.Submissions);
  const r = JSON.parse(ctx.doPost({ postData: { contents: J(Object.assign({ action: 'order' }, order([{ name: 'white sage', size: '1 gal', qty: 2 }, { name: 'Sticky Monkeyflower', size: '4"', qty: 3 }]))) } }).s);
  assert.strictEqual(r.ok, true); assert.strictEqual(r.orderId, 'INV-101');
  assert.strictEqual(r.subtotal, 48); assert.strictEqual(r.tax, 4.2); assert.strictEqual(r.total, 52.2);
  assert.strictEqual(ctx.lastPayload.source, 'website'); assert.strictEqual(inv.length, 2);
  assert.strictEqual(J(sheets.Sold.slice(1).map(x => x.slice(1))), J([['INV-101', 'White Sage', '1 gal', 2, '2026-10-19', 'website'], ['INV-101', 'Sticky Monkeyflower', '4"', 3, '2026-10-19', 'website']]));
  const s = ctx.getAvailableStock(); assert.strictEqual(s['White Sage']['1 gal'], 0); assert.strictEqual(s['Sticky Monkeyflower']['4"'], 1);
  assert.strictEqual(J(sheets.Submissions), before);
  assert.strictEqual(mail.length, 1); assert.strictEqual(mail[0].subject, 'New IENN order #INV-101');
  assert.match(mail[0].body, /View details: https:\/\/docs\.google\.com\/spreadsheets\/d\/INV\/edit#gid=7&range=A2/);
  assert.strictEqual(lock.held, false);
});
t('internal Index invoice (direct submitInvoice) also decrements', () => {
  const { ctx } = makeEnv();
  ctx.submitInvoice({ customer: { name: 'Walk-in', email: '' }, items: [{ plant: 'Sticky Monkeyflower', size: '1 gal', qty: 5, price: 15 }] });
  assert.strictEqual(ctx.getAvailableStock()['Sticky Monkeyflower']['1 gal'], 10);
});
t('oversell rejected: no invoice, no Sold rows, no email', () => {
  const { ctx, sheets, inv, mail, lock } = makeEnv();
  const r = ctx.placeOrder_(order([{ name: 'White Sage', size: '1 gal', qty: 3 }]));
  assert.strictEqual(r.ok, false); assert.strictEqual(r.error, 'out_of_stock');
  assert.strictEqual(J(r.items), J([{ name: 'White Sage', size: '1 gal', requested: 3, available: 2 }]));
  assert.strictEqual(inv.length, 1); assert.strictEqual((sheets.Sold || [1]).length, 1); assert.strictEqual(mail.length, 0); assert.strictEqual(lock.held, false);
});
t('sequential orders: second oversells after first; Index invoice also blocked', () => {
  const { ctx } = makeEnv(); const o = order([{ name: 'White Sage', size: '1 gal', qty: 2 }]);
  assert.strictEqual(ctx.placeOrder_(o).ok, true); assert.strictEqual(ctx.placeOrder_(o).error, 'out_of_stock');
  assert.throws(() => ctx.submitInvoice({ customer: {}, items: [{ plant: 'White Sage', size: '1 gal', qty: 1, price: 15 }] }), /OUT_OF_STOCK/);
});
t('new week of counts resets the sold offset', () => {
  const { ctx, sheets } = makeEnv(); ctx.placeOrder_(order([{ name: 'White Sage', size: '1 gal', qty: 2 }]));
  sheets.Submissions.push([3, 'Andrew', '2026-10-26', '{}']); assert.strictEqual(ctx.getAvailableStock()['White Sage']['1 gal'], 2);
});
t('on-request sizes (2", Tree pot) are not orderable online', () => {
  const { ctx } = makeEnv(); assert.strictEqual(ctx.placeOrder_(order([{ name: 'White Sage', size: 'Tree pot', qty: 1 }])).error, 'out_of_stock');
});
t('validation: bad email, empty cart, unknown plant', () => {
  const { ctx } = makeEnv();
  assert.strictEqual(ctx.placeOrder_(order([{ name: 'White Sage', size: '4"', qty: 1 }], { email: 'bad' })).error, 'invalid');
  assert.strictEqual(ctx.placeOrder_(order([])).error, 'empty');
  assert.strictEqual(ctx.placeOrder_(order([{ name: 'Nope', size: '4"', qty: 1 }])).error, 'out_of_stock');
});
t('no team emails: order succeeds, no extra mail', () => {
  const { ctx, mail } = makeEnv({ team: [] }); assert.strictEqual(ctx.placeOrder_(order([{ name: 'White Sage', size: '4"', qty: 1 }])).ok, true); assert.strictEqual(mail.length, 0);
});
t('buildResponseEmail: address hidden until confirmed, paid status, quoted notes, tax estimate', () => {
  const { ctx, inv } = makeEnv(); const r = ctx.placeOrder_(order([{ name: 'White Sage', size: '4"', qty: 2 }], { notes: 'Can I come Sunday?' }));
  let m = ctx.buildResponseEmail(r.orderId);
  assert.match(m.body, /^Hi Ana,/); assert.match(m.body, /Not yet paid/); assert.match(m.body, /> Can I come Sunday\?/);
  assert.match(m.body, /once your order is confirmed/); assert.match(m.body, /Total: \$13\.05/);
  Object.assign(inv[1], { 8: 'Confirmed', 9: 'Yes', 10: 'Zelle', 11: '123 Test St', 13: 'See you then!' });
  m = ctx.buildResponseEmail(r.orderId);
  assert.match(m.body, /Payment status: Paid/); assert.match(m.body, /Payment form: Zelle/); assert.match(m.body, /Pickup address: 123 Test St/); assert.match(m.body, /See you then!/);
});
t('bad JSON post', () => { const { ctx } = makeEnv(); assert.strictEqual(JSON.parse(ctx.doPost({ postData: { contents: '{' } }).s).error, 'bad_json'); });
t('print + csv: popular-first, counted/sold/available, out rows, on-request', () => {
  const { ctx } = makeEnv(); ctx.placeOrder_(order([{ name: 'White Sage', size: '1 gal', qty: 2 }]));
  const csv = ctx.ienWebsiteGet_({ parameter: { view: 'csv' } }); const L = csv.s.split('\n');
  assert.strictEqual(L[0], 'Plant,Size,Price,Counted (week 2026-10-19),Sold since,Available');
  assert.strictEqual(L[1], 'White Sage,"4""",6,6,0,6'); assert.strictEqual(L[2], 'White Sage,1 gal,15,2,2,0');
  assert.strictEqual(L[3].split(',')[0], 'Sticky Monkeyflower'); assert.match(csv.s, /\(any plant\),Tree pot,10,,,On request/);
  assert.strictEqual(csv.f, 'ienn-plant-list-2026-10-20.csv');
  const html = ctx.ienWebsiteGet_({ parameter: { view: 'print' } }).h;
  assert.match(html, /@media print/); assert.match(html, /window\.print\(\)/); assert.match(html, /<tr class="out"><td>White Sage<\/td><td>1 gal/);
});
console.log(`\n${n} tests passed`);
