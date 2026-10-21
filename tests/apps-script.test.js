// Simulates the LIVE split: standalone "ienn invoice tool v4" (hosts the website backend) reading the
// separate IENN Inventory spreadsheet by ID. Loads the exact paste-ready files. Run: node tests/apps-script.test.js (no dependencies). Mirrors the live project's test suite; secrets are placeholders here.
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { makeSheet } = require('./gas-harness');
const INV_ID = '1klPpRNuoNtdUDmCwpqYaQuQOKYvgku4AhKOFpTVR3Vw', INVO_ID = '1sGCDid99h7WsWsOrG2jyD2Nh9mprrNaS9dIV2vtS-Zs';
const ADDR = /El[a]ine|P[i]co|1710[5]|2243[0]|TEST ADDRESS/;
let pass = 0; const t = (n, f) => { f(); pass++; console.log('ok -', n); };
const D = s => Date.parse(s);
function book(name, id, tabs) { const ss = { name, sheets: {}, getId: () => id, getName: () => name, getSheets() { return Object.values(this.sheets); },
  getSheetByName(n) { return this.sheets[n] || null; }, insertSheet(n) { return (this.sheets[n] = makeSheet(n, [], 9, this)); }, getUrl: () => 'https://docs.google.com/spreadsheets/d/' + id + '/edit' };
  Object.keys(tabs).forEach((n, i) => (ss.sheets[n] = makeSheet(n, tabs[n], i + 1, ss))); return ss; }
function load() {
  let now = D('2026-10-20T17:00:00Z');
  const inv = book('IENN Inventory', INV_ID, {
    Submissions: [['week', 'person', 'at', 'counts'],
      ['2026-W41', 'keith', D('2026-10-07T21:00:00Z'), JSON.stringify({ apiana: { four: 9, gal1: 9 } })],
      ['2026-W42', 'keith', D('2026-10-14T21:00:00Z'), JSON.stringify({ apiana: { four: 2, gal1: 6 }, deergrass: { four: 0, gal1: 4 } })],
      ['2026-W42', 'eric', D('2026-10-14T22:00:00Z'), JSON.stringify({ apiana: { four: 1, gal1: 4 }, woolly: { gal1: 2 } })]],
    Catalog: [['id', 'common', 'latin', 'band'], ['apiana', 'White sage', 'Salvia apiana', 'active'], ['deergrass', 'Deergrass', 'Muhlenbergia rigens', 'active'], ['woolly', 'Woolly blue curls', 'Trichostema lanatum', 'back']],
    Settings: [['key', 'value'], ['emails', '{}']] });
  const invo = book('IENN Invoices', INVO_ID, {
    Invoices: [['Timestamp', 'Invoice #', 'Date', 'Paid', 'Customer Email', 'Grand Total', 'Lines JSON', 'Note'],
      [new Date(D('2026-10-10T18:00:00Z')), 'IEN-2026-001', '2026-10-10', 'paid', 'a@x.co', '30', JSON.stringify([{ plant: 'White sage (Salvia apiana)', size: '4"', qty: '5' }]), ''],
      [new Date(D('2026-10-16T18:00:00Z')), 'IEN-2026-002', '2026-10-16', 'unpaid', 'b@x.co', '30', JSON.stringify([{ plant: 'White sage (Salvia apiana)', size: '1 gal', qty: '2' }]), '']],
    Settings: [['key', 'value'], ['teamEmails', '{}'], ['nextSeq', '2']] });
  const decoy = book('IENN Inventory', 'DECOY', { Submissions: [['week', 'person', 'at', 'counts']], Catalog: [['id', 'common', 'latin', 'band']] });
  const byId = { [INV_ID]: inv, [INVO_ID]: invo }, sent = [], drafts = [], lock = { held: false }, props = { INV_DB_ID: INVO_ID };
  const fmt = (d, tz, f) => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/Los_Angeles' }).format(new Date(d)); return f === 'yyyy' ? p.slice(0, 4) : f === 'MMMM d, yyyy' ? 'October 20, 2026' : p; };
  const RealDate = Date; class FDate extends RealDate { constructor(...a) { a.length ? super(...a) : super(now); } static now() { return now; } }
  const logs = [];
  const ctx = {
    SpreadsheetApp: { getActive: () => { throw new Error('standalone project: getActive() is null'); }, openById: id => { if (!byId[id]) throw new Error('no ' + id); return byId[id]; },
      open: () => decoy, flush() {}, create: () => { throw new Error('must not create'); }, getUi: () => { throw new Error('no UI in standalone'); } },
    DriveApp: { getFilesByName: () => { let n = 1; return { hasNext: () => n-- > 0, next: () => ({}) }; } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty(k, v) { props[k] = String(v); } }) },
    MailApp: { sendEmail: m => sent.push(m) }, GmailApp: { createDraft: (to, s, b) => { drafts.push({ to, subject: s, body: b }); return { getId: () => 'r-' + drafts.length }; }, sendEmail() { throw new Error('must never send via GmailApp'); } },
    LockService: { getScriptLock: () => ({ tryLock() { if (lock.held) return false; return (lock.held = true); }, releaseLock() { lock.held = false; } }) },
    ContentService: { MimeType: { JSON: 'json', JAVASCRIPT: 'js', CSV: 'csv' }, createTextOutput: s => ({ s, setMimeType() { return this; }, downloadAsFile() { return this; }, getContent() { return s; } }) },
    HtmlService: { createHtmlOutput: h => ({ h, setTitle() { return this; }, getContent() { return h; } }),
      createHtmlOutputFromFile: f => ({ file: f, setTitle() { return this; }, setXFrameOptionsMode() { return this; }, addMetaTag() { return this; } }), XFrameOptionsMode: { ALLOWALL: 1 } },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }) },
    Utilities: { formatDate: fmt, base64Encode: () => '', getUuid: () => require('crypto').randomUUID(), computeHmacSha256Signature: (v, k) => Array.from(require('crypto').createHmac('sha256', k).update(v).digest()).map(x => x > 127 ? x - 256 : x),
      base64EncodeWebSafe: a => Buffer.from(a.map(x => x & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_') }, Session: { getScriptTimeZone: () => 'America/Los_Angeles', getEffectiveUser: () => ({ getEmail: () => 'owner@x.co' }) }, Logger: { log: m => logs.push(String(m)) }, console: { log() {}, error: m => logs.push('ERR ' + m) }, Date: FDate, JSON, Math, Object, String, Number, Array, encodeURIComponent
  };
  vm.createContext(ctx);
  const dir = path.join(__dirname, '..', 'apps-script');
  ['Code.gs'].concat(fs.readdirSync(dir).filter(f => /^IENN_.*\.gs$/.test(f)).sort()).forEach(f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  vm.runInContext("TEAM_EMAIL_TO = 'andrew@example.test'; TEAM_EMAIL_CC = ['eric@example.test', 'keith@example.test']; TEAM_EMAILS = [TEAM_EMAIL_TO].concat(TEAM_EMAIL_CC); PICKUP_ADDRESS = 'TEST ADDRESS 1'; PICKUP_ALT_ADDRESS = 'TEST ADDRESS 2';", ctx);   // repo config holds placeholders only
  return { ctx, inv, invo, sent, drafts, lock, props, logs, setNow: x => (now = x) };
}
const post = (h, items, extra) => JSON.parse(h.ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ name: 'Ana Lopez', email: 'ana@example.com', phone: '9095550100', notes: 'Sat 11', pickup: 'Saturday', payment: 'Zelle', items }, extra)) } }).getContent());
const J = x => JSON.parse(JSON.stringify(x));
const qty = (feed, name, key) => feed.plants.find(p => p.name === name).sizes.find(s => s.key === key).qty;

t('inventory read BY ID (not the Drive name decoy); latest week minus sales after the latest count', () => {
  const h = load(), f = JSON.parse(h.ctx.iennRoute_({ parameter: { view: 'inventory' } }).getContent());
  assert.strictEqual(qty(f, 'White sage', '4"'), 3); assert.strictEqual(qty(f, 'White sage', '1 gal'), 10 - 2);
  assert.strictEqual(qty(f, 'Deergrass', '1 gal'), 4); assert.strictEqual(qty(f, 'Woolly blue curls', '1 gal'), 2);
  assert.ok(f.plants.find(p => p.fullName === 'Woolly blue curls (Trichostema lanatum)'), 'catalog-only plant gets latin name');
  assert.strictEqual(+h.ctx.iennBaselineDate_(), D('2026-10-14T22:00:00Z'), 'baseline from the "at" column');
  assert.doesNotMatch(JSON.stringify(f), ADDR);
});
t('website order: Invoices row via live submitInvoice, IEN number, status, one alert To Andrew CC Eric+Keith, customer copy, no exact address', () => {
  const h = load(), r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 2 }, { plant: 'Deergrass (Muhlenbergia rigens)', sizeKey: '2"', qty: 1 }]);
  assert.strictEqual(r.ok, true, JSON.stringify(r)); assert.strictEqual(r.orderId, 'IEN-2026-003'); assert.strictEqual(r.total, 15);
  const rows = h.invo.sheets.Invoices.rows, row = rows[rows.length - 1];
  assert.strictEqual(row[1], 'IEN-2026-003'); assert.deepStrictEqual(J(rows[0].slice(8)), ['Status', 'Handled by', 'Our response']); assert.deepStrictEqual(J(row.slice(8, 10)), ['New', 'Andrew']);
  const team = h.sent.filter(m => m.to === 'andrew@example.test'), cust = h.sent.filter(m => m.to === 'ana@example.com');
  assert.strictEqual(h.sent.length, 2); assert.strictEqual(team.length, 1); assert.strictEqual(team[0].cc, 'eric@example.test,keith@example.test'); assert.strictEqual(cust.length, 1);
  assert.match(cust[0].body, /You chose: Zelle/); h.sent.forEach(m => assert.doesNotMatch(m.body + m.subject, ADDR));
  assert.strictEqual(qty(h.ctx.iennInventory(), 'White sage', '4"'), 1, 'stock dropped'); assert.strictEqual(h.inv.sheets.Submissions.rows.length, 4, 'counts untouched');
});
t('oversell rejected before writing; internal Index path throws', () => {
  const h = load(), n = h.invo.sheets.Invoices.rows.length, r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '1 gal', qty: 9 }]);
  assert.strictEqual(r.ok, false); assert.match(r.message, /Only 8 White sage \(1-gallon\) available/); assert.strictEqual(h.invo.sheets.Invoices.rows.length, n); assert.strictEqual(h.sent.length, 0);
  assert.throws(() => h.ctx.iennSubmitInvoiceChecked({ lines: [{ plant: 'Deergrass', size: '4"', qty: '1', amt: '6' }], customerEmail: '' }), /not available/);
  const ok = h.ctx.iennSubmitInvoiceChecked({ lines: [{ plant: 'Deergrass', size: '1 gal', qty: '1', amt: '15' }], customerEmail: '', grand: '15' });
  assert.strictEqual(ok.invno, 'IEN-2026-003'); assert.strictEqual(h.lock.held, false);
});
t('routes: ?view=customer closed, default view still the team Index, print list has no exact address', () => {
  const h = load();
  assert.match(h.ctx.doGet({ parameter: { view: 'customer' } }).getContent(), /Orders have moved to our website/);
  assert.strictEqual(h.ctx.doGet({ parameter: {} }).file, 'Index');
  assert.doesNotMatch(h.ctx.iennRoute_({ parameter: { view: 'print' } }).getContent() + h.ctx.iennPrintCsv_(), ADDR);
});
t('exact addresses ONLY in the confirmed reply draft (never sent)', () => {
  const h = load(), r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]);
  const pre = h.ctx.iennDraftReply(r.orderId); assert.doesNotMatch(pre.body, ADDR); assert.match(pre.body, /Exact address sent once your order is confirmed/);
  const d = h.ctx.iennConfirmAndDraftLatest(), sentBefore = h.sent.length;
  assert.match(d.body, /Here's the location: TEST ADDRESS 1/); assert.doesNotMatch(d.body, /Grand Terrace|P[i]co/);
  const row = h.invo.sheets.Invoices.rows.slice(-1)[0]; assert.strictEqual(row[8], 'Confirmed'); assert.strictEqual(h.drafts.length, 2); assert.strictEqual(h.sent.length, sentBefore);
});
t('a new weekly count moves the baseline (earlier sales no longer subtracted)', () => {
  const h = load(); h.inv.sheets.Submissions.rows.push(['2026-W43', 'keith', D('2026-10-21T21:00:00Z'), JSON.stringify({ apiana: { four: 4, gal1: 1 } })]);
  const f = h.ctx.iennInventory(); assert.strictEqual(qty(f, 'White sage', '4"'), 4); assert.strictEqual(qty(f, 'White sage', '1 gal'), 1);
});
t('public repo: no exact address and no real team emails anywhere', () => {
  const dir = path.join(__dirname, '..');
  const hits = []; (function walk(d) { fs.readdirSync(d).forEach(f => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!/^(\.git|node_modules)$/.test(f)) walk(p); } else if (p !== __filename && !/\.(jpe?g|png|webp|gif|ico)$/i.test(f)) fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (ADDR.test(l) || /@gmail\.com/i.test(l)) hits.push(path.relative(dir, p) + ':' + (i + 1)); }); }); })(dir);
  assert.deepStrictEqual(hits, [], hits.join(' '));
});
t('customer copy is clean: no internal info, no exact address/ZIP, has Sierra & Baseline + contact lines', () => {
  const h = load(); post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]);
  const c = h.sent.find(m => m.to === 'ana@example.com'), b = c.body;
  assert.strictEqual(c.subject, 'Your Inland Empire Native Nursery order — IEN-2026-003');
  [/1710[5]/, /El[a]ine/, /P[i]co/, /Grand Terrace/, /92336/, /Website order/, /Status:/, /Handled by/, /docs\.google/, /9095550100/, /Ana Lopez/].forEach(r => assert.doesNotMatch(b + c.subject, r, String(r)));
  ['Sierra & Baseline in Fontana, about 10 minutes from the 210', 'Saturdays 10 a.m. – 2 p.m., other times case by case on request', 'Cash or Zelle at time of pickup', 'We\u2019ll email to confirm your pickup time', 'plants@inlandempirenativenursery.com', 'Call or text Andrew', 'All sales are final', 'Your notes: Pickup preference: Saturday\nSat 11'].forEach(x => assert.ok(b.includes(x), x));
  const team = h.sent.find(m => m.to === 'andrew@example.test'); assert.match(team.body, /Website order — Ana Lopez · 9095550100/);
  assert.match(h.invo.sheets.Invoices.rows.slice(-1)[0][7], /^Website order — Ana Lopez/);
  fs.writeFileSync('/tmp/ienn-customer.txt', 'Subject: ' + c.subject + '\n\n' + b); fs.writeFileSync('/tmp/ienn-team.txt', 'Subject: ' + team.subject + '\nCC: ' + team.cc + '\n\n' + team.body);
});
t('thank-you draft: warm lines, exact address, draft only, onOpen safe in standalone', () => {
  const h = load(); post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]); const n = h.sent.length;
  const d = h.ctx.iennConfirmAndDraftLatest();
  ['Hi Ana Lopez', 'Thanks for ordering, and thanks for choosing us.', 'Confirming your pickup time: Saturday, October 24, 2026 (Saturdays 10 a.m. – 2 p.m.)', "Here's the location: TEST ADDRESS 1", 'Payment: Cash or Zelle at time of pickup (you chose Zelle).', "If you have any questions, don't hesitate to reach out.", 'Order number: IEN-2026-003', '(taxes included)', 'Other pickup times available case by case upon request.', 'Inland Empire Native Nursery']
    .forEach(x => assert.ok(d.body.includes(x), x));
  assert.strictEqual(h.sent.length, n, 'never sent'); assert.strictEqual(h.drafts.length, 1);
  assert.doesNotThrow(() => h.ctx.onOpen());
  fs.writeFileSync('/tmp/ienn-draft.txt', 'Subject: ' + d.subject + '\n\n' + d.body);
});

const linkOf = m => { const x = /CONFIRM ORDER[^\n]*?: (\S+)/.exec(m.body); return x && x[1]; };
const qs = u => Object.fromEntries(new URL(u).searchParams);
t('confirm: alert is HTML + text, both carry the signed button link; no exact address', () => {
  const h = load(), r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]), m = h.sent.find(x => x.to === 'andrew@example.test');
  const u = linkOf(m); assert.ok(u && u.startsWith('https://www.inlandempirenativenursery.com/confirm.html?id=IEN-2026-003&t='), u);
  assert.ok(m.htmlBody.includes('>Confirm order</a>') && m.htmlBody.includes(u.replace(/&/g, '&amp;')));
  assert.ok(h.props.IENN_CONFIRM_SECRET && h.props.IENN_CONFIRM_SECRET.length >= 64, 'secret auto-created');
  assert.strictEqual(qs(u).t, h.ctx.iennConfirmToken_(r.orderId));
  h.sent.forEach(x => assert.doesNotMatch(x.body + (x.htmlBody || ''), ADDR));
  fs.writeFileSync('/tmp/ienn-alert.txt', 'Subject: ' + m.subject + '\nCC: ' + m.cc + '\n\n' + m.body); fs.writeFileSync('/tmp/ienn-alert.html', m.htmlBody);
});
t('confirm: bad token / wrong id / missing token -> generic page, nothing changed, no order data', () => {
  const h = load(); post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]);
  const good = h.ctx.iennConfirmToken_('IEN-2026-003');
  [{ id: 'IEN-2026-003', t: good.slice(0, -1) + (good.slice(-1) === 'A' ? 'B' : 'A') }, { id: 'IEN-2026-002', t: good }, { id: 'IEN-2026-003' }, { id: 'IEN-9999-999', t: h.ctx.iennConfirmToken_('IEN-9999-999') }, { id: '<x>', t: good }]
    .forEach(p => { const c = h.ctx.doGet({ parameter: Object.assign({ action: 'confirm' }, p) }).getContent();
      assert.match(c, /Link not valid/); [/IEN-/, /Ana/, /ana@example/, /White sage/, /\$/].forEach(x => assert.doesNotMatch(c, x, String(x))); });
  assert.strictEqual(h.drafts.length, 0); assert.strictEqual(h.invo.sheets.Invoices.rows.slice(-1)[0][8], 'New');
  assert.ok(h.ctx.iennSafeEqual_('abc', 'abc') && !h.ctx.iennSafeEqual_('abc', 'abd') && !h.ctx.iennSafeEqual_('', '') && !h.ctx.iennSafeEqual_('ab', 'abc'));
});
t('confirm: good link -> Confirmed + one DRAFT with exact address, nothing sent; second tap idempotent', () => {
  const h = load(); post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]);
  const u = linkOf(h.sent.find(x => x.to === 'andrew@example.test')), n = h.sent.length;
  const c1 = h.ctx.doGet({ parameter: Object.assign({ action: 'confirm' }, qs(u)) }).getContent();
  assert.ok(c1.includes('Order IEN-2026-003 confirmed. The thank-you email is in Gmail Drafts (NURSERY_ACCOUNT_PLACEHOLDER@example.com): open it, add a personal touch, press Send.'));
  assert.ok(c1.includes('https://mail.google.com/mail/#drafts') && c1.includes('width=device-width')); assert.doesNotMatch(c1, ADDR);
  assert.strictEqual(h.invo.sheets.Invoices.rows.slice(-1)[0][8], 'Confirmed'); assert.strictEqual(h.drafts.length, 1); assert.strictEqual(h.sent.length, n, 'nothing sent');
  assert.match(h.drafts[0].body, /Here's the location: TEST ADDRESS 1/); assert.strictEqual(h.drafts[0].to, 'ana@example.com'); assert.strictEqual(h.props['IENN_DRAFT_IEN-2026-003'], 'r-1');
  const c2 = h.ctx.doGet({ parameter: Object.assign({ action: 'confirm' }, qs(u)) }).getContent();
  assert.match(c2, /Already confirmed/); assert.match(c2, /Check Drafts/); assert.strictEqual(h.drafts.length, 1); assert.strictEqual(h.sent.length, n); assert.strictEqual(h.lock.held, false);
});
t('confirm: status Confirmed by hand but no draft yet -> draft created once', () => {
  const h = load(); post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]);
  h.invo.sheets.Invoices.rows.slice(-1)[0][8] = 'Confirmed';
  const p = { action: 'confirm', id: 'IEN-2026-003', t: h.ctx.iennConfirmToken_('IEN-2026-003') };
  assert.match(h.ctx.doGet({ parameter: p }).getContent(), /confirmed\. The thank-you/); assert.match(h.ctx.doGet({ parameter: p }).getContent(), /Already confirmed/); assert.strictEqual(h.drafts.length, 1);
});
t('confirm route does not break ?view=inventory / default / print; /dev URL falls back to IENN_WEBAPP_URL', () => {
  const h = load(); const f = JSON.parse(h.ctx.doGet({ parameter: { view: 'inventory' } }).getContent()); assert.strictEqual(f.version, 3); assert.ok(f.plants.length >= 3);
  assert.strictEqual(h.ctx.doGet({ parameter: {} }).file, 'Index'); assert.ok(h.ctx.doGet({ parameter: { view: 'print' } }));
  h.ctx.ScriptApp.getService = () => ({ getUrl: () => 'https://script.google.com/macros/s/X/dev' }); assert.strictEqual(h.ctx.iennWebAppUrl_(), 'https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec');
  vm.runInContext("IENN_WEBAPP_URL = 'https://script.google.com/macros/s/LIVE/exec'", h.ctx); assert.strictEqual(h.ctx.iennWebAppUrl_(), 'https://script.google.com/macros/s/LIVE/exec');
});

const order = f => J(f.plants.map(p => p.name));
t('popularity: no Pin column -> best sellers (90 days, Cancelled excluded) first, rest stable; rank/popularity/pinned fields', () => {
  const h = load(), I = h.invo.sheets.Invoices.rows;
  I.push([new Date(D('2026-10-18T18:00:00Z')), 'IEN-2026-003', '2026-10-18', 'unpaid', 'c@x.co', '6', JSON.stringify([{ plant: 'Deergrass (Muhlenbergia rigens)', size: '2"', qty: '9' }]), '']);
  I.push([new Date(D('2026-10-19T18:00:00Z')), 'IEN-2026-004', '2026-10-19', 'unpaid', 'd@x.co', '6', JSON.stringify([{ plant: 'Yarrow (Achillea millefolium)', size: '2"', qty: '50' }]), '']);
  I.push([new Date(D('2026-06-01T18:00:00Z')), 'IEN-2026-000', '2026-06-01', 'paid', 'e@x.co', '6', JSON.stringify([{ plant: 'Sugarbush (Rhus ovata)', size: '2"', qty: '99' }]), '']);
  h.ctx.iennInvoices_(); I[0][8] = 'Status'; I[I.length - 2][8] = 'Cancelled';   // Yarrow cancelled; Sugarbush older than 90 days
  const f = JSON.parse(h.ctx.iennRoute_({ parameter: { view: 'inventory' } }).getContent()), base = JSON.parse(JSON.stringify(h.ctx.getInitial().plants)).map(n => n.split(' (')[0]).filter(n => n !== 'Other');
  assert.deepStrictEqual(order(f).slice(0, 2), ['Deergrass', 'White sage']);
  const rest = order(f).slice(2), expect = base.concat(['Other', 'Woolly blue curls']).filter(n => !['Deergrass', 'White sage'].includes(n));
  assert.deepStrictEqual(rest, expect.filter(n => rest.includes(n)), 'stable'); assert.strictEqual(rest.length, f.plants.length - 2);
  assert.deepStrictEqual(f.plants.map(p => p.rank), f.plants.map((_, i) => i + 1));
  const by = n => f.plants.find(p => p.name === n);
  assert.strictEqual(by('Deergrass').popularity, 9); assert.strictEqual(by('White sage').popularity, 7); assert.strictEqual(by('Yarrow').popularity, 0); assert.strictEqual(by('Sugarbush').popularity, 0);
  assert.ok(f.plants.every(p => p.pinned === false));
});
t('pin: numbers first (1,2..), then text pins in Catalog order, then popularity; "no"/blank not pinned; Featured alias', () => {
  const h = load(), C = h.inv.sheets.Catalog.rows;
  C[0].push('Pin'); C[1].push(''); C[2].push('no'); C[3].push('x');
  C.push(['yarrow', 'Yarrow', 'Achillea millefolium', 'active', '2']); C.push(['sugar', 'Sugarbush', 'Rhus ovata', 'active', 'yes']); C.push(['poppy', 'California poppy', 'Eschscholzia californica', 'active', 1]);
  let f = h.ctx.iennInventory();
  assert.deepStrictEqual(order(f).slice(0, 5), ['California poppy', 'Yarrow', 'Woolly blue curls', 'Sugarbush', 'White sage']);
  assert.deepStrictEqual(J(f.plants.slice(0, 6).map(p => p.pinned)), [true, true, true, true, false, false]);
  assert.strictEqual(f.plants[4].popularity, 7); assert.strictEqual(f.plants[0].rank, 1);
  C[0][4] = 'Featured'; f = h.ctx.iennInventory(); assert.strictEqual(order(f)[0], 'California poppy');
});
t('iennSetup adds only the Pin and Badge headers to Catalog (once); rows untouched', () => {
  const h = load(), C = h.inv.sheets.Catalog.rows, before = JSON.stringify(C.slice(1));
  h.ctx.iennSetup(); assert.deepStrictEqual(J(C[0]), ['id', 'common', 'latin', 'band', 'Pin', 'Badge']); assert.strictEqual(JSON.stringify(C.slice(1)), before);
  h.ctx.iennSetup(); assert.deepStrictEqual(J(C[0]), ['id', 'common', 'latin', 'band', 'Pin', 'Badge']); assert.strictEqual(JSON.stringify(C.slice(1)), before);
});
t('iennSetup keeps an existing badge column (any case) and adds Pin only', () => {
  const h = load(), C = h.inv.sheets.Catalog.rows; C[0].push('BADGE');
  h.ctx.iennSetup(); h.ctx.iennSetup(); assert.deepStrictEqual(J(C[0]), ['id', 'common', 'latin', 'band', 'BADGE', 'Pin']);
});
const feed = h => JSON.parse(h.ctx.iennRoute_({ parameter: { view: 'inventory' } }).getContent());
t('badge: missing Badge column -> every plant has badge ""', () => {
  const f = feed(load()); assert.ok(f.plants.length > 0); assert.ok(f.plants.every(p => p.badge === ''));
});
t('badge: blank/whitespace cells -> ""; set value trimmed; header case-insensitive; order and other fields unchanged', () => {
  const h0 = load(), base = feed(h0);
  const h = load(), C = h.inv.sheets.Catalog.rows; C[0].push(' bAdGe '); C.slice(1).forEach(r => r.push(''));
  C[1][C[0].length - 1] = '  #1 Seller  '; C[2][C[0].length - 1] = '   ';
  const f = feed(h), name1 = String(C[1][1]).trim();
  f.plants.forEach(p => assert.strictEqual(typeof p.badge, 'string'));
  assert.ok(f.plants.some(p => p.badge === '#1 Seller'));
  assert.strictEqual(f.plants.filter(p => p.badge !== '').length, 1);
  const strip = x => J(x.plants.map(p => { const c = Object.assign({}, p); delete c.badge; return c; }));
  assert.deepStrictEqual(strip(f), strip(base));
});
t('placeholder recipe: one Submissions row -> White sage 4" = 5, everything else 0', () => {
  const h = load(); h.inv.sheets.Submissions.rows.splice(1);   // live sheet: header only
  h.inv.sheets.Submissions.rows.push(['2026-W43', 'eric', 1792545160783, '{"apiana":{"four":5,"gal1":0}}', 'PLACEHOLDER test count (Lobo)']);
  assert.deepStrictEqual(J(h.ctx.getAvailableStock()), { 'White sage': { '4"': 5, '1 gal': 0 } });
  const f = h.ctx.iennInventory(); assert.strictEqual(qty(f, 'White sage', '4"'), 5);
  f.plants.forEach(p => p.sizes.forEach(s => { if (s.qty !== null && !(p.name === 'White sage' && s.key === '4"')) assert.strictEqual(s.qty, 0, p.name + s.key); }));
});
const alertOf = h => h.sent.find(x => /CONFIRM ORDER/.test(x.body));
t('json confirm: alert button -> confirm.html, direct exec fallback in text + HTML', () => {
  const h = load(), r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]), m = alertOf(h), tok = h.ctx.iennConfirmToken_(r.orderId);
  const page = 'https://www.inlandempirenativenursery.com/confirm.html?id=' + r.orderId + '&t=' + encodeURIComponent(tok), direct = 'https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec' + '?action=confirm&id=' + r.orderId + '&t=' + encodeURIComponent(tok);
  assert.strictEqual(linkOf(m), page); assert.ok(m.htmlBody.includes('href="' + page.replace(/&/g, '&amp;') + '"'));
  assert.ok(m.body.includes('If that link does not work, try: ' + direct)); assert.ok(m.htmlBody.includes('If the button does not work, try: ' + direct.replace(/&/g, '&amp;')));
});
t('json confirm: good token -> {ok,confirmed,draft}, draft + Confirmed, no data; repeat -> already', () => {
  const h = load(), r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]), n = h.sent.length, id = r.orderId;
  const out = h.ctx.doGet({ parameter: { action: 'confirm', id, t: h.ctx.iennConfirmToken_(id), format: 'json' } }), raw = out.getContent();
  assert.deepStrictEqual(JSON.parse(raw), { ok: true, orderId: id, status: 'confirmed', draft: true });
  assert.doesNotMatch(raw, /@|Fontana|ADDRESS|El[a]ine|P[i]co/); assert.strictEqual(h.drafts.length, 1); assert.strictEqual(h.sent.length, n);
  assert.strictEqual(h.invo.sheets.Invoices.rows.slice(-1)[0][8], 'Confirmed'); assert.strictEqual(h.lock.held, false);
  const again = JSON.parse(h.ctx.doGet({ parameter: { view: 'confirm', orderId: id, t: h.ctx.iennConfirmToken_(id), format: 'json' } }).getContent());
  assert.deepStrictEqual(again, { ok: true, orderId: id, status: 'already', draft: true }); assert.strictEqual(h.drafts.length, 1);
});
t('json confirm: bad / missing / wrong-id token -> {ok:false,error:invalid}, nothing changed', () => {
  const h = load(), r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]), id = r.orderId, good = h.ctx.iennConfirmToken_(id), st = h.invo.sheets.Invoices.rows.slice(-1)[0][8];
  [{ id, t: 'bad' }, { id }, { id, t: h.ctx.iennConfirmToken_('IEN-2026-001') }, { id: '<x>', t: good }].forEach(q => {
    assert.deepStrictEqual(JSON.parse(h.ctx.doGet({ parameter: Object.assign({ action: 'confirm', format: 'json' }, q) }).getContent()), { ok: false, error: 'invalid' }); });
  assert.strictEqual(h.drafts.length, 0); assert.strictEqual(h.invo.sheets.Invoices.rows.slice(-1)[0][8], st);
  assert.match(h.ctx.doGet({ parameter: { action: 'confirm', id, t: 'bad' } }).getContent(), /Link not valid/);   // HTML route unchanged
});
console.log('\n' + pass + ' two-project tests passed');

const status = (h, id) => { const v = h.invo.sheets.Invoices.getDataRange().getValues(), c = v[0].indexOf('Status'), r = v.findIndex(x => x[1] === id); return c < 0 ? '' : v[r][c]; };
t('bug1: Gmail failure -> status NOT Confirmed, logged, short code shown, no data leaked; retry after auth works; 2nd tap "Already confirmed"', () => {
  const h = load(); const id = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '2"', qty: 1 }]).orderId;
  const real = h.ctx.GmailApp.createDraft; h.ctx.GmailApp.createDraft = () => { throw new Error('You do not have permission to call GmailApp.createDraft'); };
  const link = { action: 'confirm', id, t: h.ctx.iennConfirmToken_(id) };
  const page = h.ctx.iennRoute_({ parameter: link }).getContent();
  assert.match(page, /Something went wrong/); assert.match(page, /E_GMAIL_AUTH/); assert.doesNotMatch(page, /ana@example|permission|Ana/);
  assert.notStrictEqual(status(h, id), 'Confirmed'); assert.ok(h.logs.some(l => /ERR IENN confirm .*permission/.test(l)));
  h.ctx.GmailApp.createDraft = real;
  assert.match(h.ctx.iennRoute_({ parameter: link }).getContent(), /confirmed\. The thank-you/); assert.strictEqual(status(h, id), 'Confirmed');
  assert.strictEqual(h.drafts.length, 1); assert.match(h.drafts[0].body, ADDR, 'draft built with exact address even though status was set after');
  assert.match(h.ctx.iennRoute_({ parameter: link }).getContent(), /Already confirmed/); assert.strictEqual(h.drafts.length, 1);
});
t('bug1: missing customer email -> E_NO_EMAIL, nothing changed', () => {
  const h = load(); const page = h.ctx.iennRoute_({ parameter: { action: 'confirm', id: 'IEN-2026-001', t: h.ctx.iennConfirmToken_('IEN-2026-001') } }).getContent();
  assert.ok(/confirmed|E_NO_EMAIL/.test(page));
  const v = h.invo.sheets.Invoices.getDataRange().getValues(); v[2][4] = ''; h.invo.sheets.Invoices.getRange(3, 5).setValue('');
  const p2 = h.ctx.iennRoute_({ parameter: { action: 'confirm', id: 'IEN-2026-002', t: h.ctx.iennConfirmToken_('IEN-2026-002') } }).getContent();
  assert.match(p2, /E_NO_EMAIL/); assert.notStrictEqual(status(h, 'IEN-2026-002'), 'Confirmed');
});
t('bug1: iennTestDraftAuth creates then deletes a draft to the owner, sends nothing', () => {
  const h = load(); let deleted = 0; h.ctx.GmailApp.createDraft = (to) => { assert.strictEqual(to, 'owner@x.co'); return { deleteDraft: () => deleted++ }; };
  assert.strictEqual(h.ctx.iennTestDraftAuth(), true); assert.strictEqual(deleted, 1); assert.strictEqual(h.sent.length, 0);
});
t('bug2: invoice number = max(Invoices IEN-YYYY-NNN, Settings nextSeq) + 1 (stale counter, old Oct 4 invoice)', () => {
  const h = load(), set = h.invo.sheets.Settings;
  set.getRange(3, 2).setValue(0);   // counter behind the sheet (live case)
  h.invo.sheets.Invoices.appendRow([new Date(D('2026-10-04T18:00:00Z')), 'IEN-2026-007', '2026-10-04', 'paid', 'c@x.co', '6', '[]', '']);
  h.invo.sheets.Invoices.appendRow([new Date(), 'IEN-2025-050', '2025-12-01', 'paid', 'c@x.co', '6', '[]', '']);
  assert.strictEqual(h.ctx.nextInvoiceNumber(), 'IEN-2026-008'); assert.strictEqual(Number(set.getDataRange().getValues()[2][1]), 8);
  set.getRange(3, 2).setValue(20); assert.strictEqual(h.ctx.nextInvoiceNumber(), 'IEN-2026-021', 'counter ahead wins');
  assert.strictEqual(h.ctx.getInitial().previewInv, 'IEN-2026-022');
  const ids = h.invo.sheets.Invoices.getDataRange().getValues().slice(1).map(r => r[1]); assert.strictEqual(new Set(ids).size, ids.length);
});
t('bug3: no Submissions rows -> every tracked qty null, all plants listed, countDate null; with a count -> 0 means sold out + countDate ISO', () => {
  const h = load(), sub = h.inv.sheets.Submissions, full = sub.getDataRange().getValues().map(r => r.slice());
  const before = JSON.parse(h.ctx.iennRoute_({ parameter: { view: 'inventory' } }).getContent());
  assert.strictEqual(before.countDate, new Date(D('2026-10-14T22:00:00Z')).toISOString());
  assert.strictEqual(qty(before, 'Deergrass', '4"'), 0, 'baseline exists: missing/0 count = sold out');
  h.inv.sheets.Submissions = require('./gas-harness').makeSheet('Submissions', [full[0]], 1, h.inv);
  const f = JSON.parse(h.ctx.iennRoute_({ parameter: { view: 'inventory' } }).getContent());
  assert.strictEqual(f.countDate, null); assert.ok(f.plants.length >= 20);
  f.plants.forEach(p => p.sizes.forEach(s => assert.strictEqual(s.qty, null, p.name + ' ' + s.key)));
});
t('stock check: no baseline -> qty 3 of a 4" plant accepted; baseline qty 0 -> rejected; baseline qty 5, order 3 -> ok', () => {
  const H = require('./gas-harness');
  const h = load(), hdr = h.inv.sheets.Submissions.getDataRange().getValues()[0].slice();
  h.inv.sheets.Submissions = H.makeSheet('Submissions', [hdr], 1, h.inv);
  assert.strictEqual(h.ctx.iennBaselineDate_(), null);
  const r = post(h, [{ plant: 'Deergrass (Muhlenbergia rigens)', sizeKey: '4"', qty: 3 }]); assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.ok(h.ctx.iennSubmitInvoiceChecked({ lines: [{ plant: 'Deergrass', size: '4"', qty: '3', amt: '18' }], customerEmail: '', grand: '18' }).invno);
  const h2 = load(), n = h2.invo.sheets.Invoices.rows.length, r0 = post(h2, [{ plant: 'Deergrass (Muhlenbergia rigens)', sizeKey: '4"', qty: 3 }]);
  assert.strictEqual(r0.ok, false); assert.match(r0.message, /not available/); assert.strictEqual(h2.invo.sheets.Invoices.rows.length, n);
  const h3 = load(); h3.inv.sheets.Submissions = H.makeSheet('Submissions', [hdr, ['2026-W43', 'eric', D('2026-10-20T16:00:00Z'), JSON.stringify({ apiana: { four: 5, gal1: 5 } })]], 1, h3.inv);
  assert.strictEqual(qty(h3.ctx.iennInventory(), 'White sage', '4"'), 5);
  const r5 = post(h3, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 3 }]); assert.strictEqual(r5.ok, true, JSON.stringify(r5));
});

const subWith = (h, counts) => { const H = require('./gas-harness'), hdr = h.inv.sheets.Submissions.getDataRange().getValues()[0].slice();
  h.inv.sheets.Submissions = H.makeSheet('Submissions', [hdr, ['2026-W43', 'eric', D('2026-10-20T16:00:00Z'), JSON.stringify(counts)]], 1, h.inv); };
const sz = (f, name, key) => f.plants.find(p => p.name === name).sizes.find(s => s.key === key);
t('ready: feed qty = READY count; extra = on hand - ready; canRequest', () => {
  const h = load(); subWith(h, { apiana: { four: 8, gal1: 4, fourReady: 3, gal1Ready: 4 } });
  const f = JSON.parse(h.ctx.iennRoute_({ parameter: { view: 'inventory' } }).getContent());
  assert.deepStrictEqual([sz(f, 'White sage', '4"').qty, sz(f, 'White sage', '4"').extra, sz(f, 'White sage', '4"').canRequest], [3, 5, true]);
  assert.deepStrictEqual([sz(f, 'White sage', '1 gal').qty, sz(f, 'White sage', '1 gal').extra, sz(f, 'White sage', '1 gal').canRequest], [4, 0, false]);
  assert.ok(f.countDate); assert.deepStrictEqual(J(h.ctx.getAvailableStock()), { 'White sage': { '4"': 3, '1 gal': 4 } });
});
t('ready keys missing -> fall back to on hand, extra 0', () => {
  const h = load(); subWith(h, { apiana: { four: 6, gal1: 2 } });
  const s = sz(h.ctx.iennInventory(), 'White sage', '4"'); assert.deepStrictEqual([s.qty, s.extra, s.canRequest], [6, 0, false]);
});
t('request path: ready < qty <= ready+extra accepted with notices; REQUEST in alert + invoice note; friendly line in customer copy; no address', () => {
  const h = load(); subWith(h, { apiana: { four: 8, gal1: 0, fourReady: 3 } });
  const r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 5 }]);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.deepStrictEqual(J(r.notices), [{ plant: 'White sage', sizeKey: '4"', size: '4-inch pot', requested: 5, ready: 3, extra: 5, message: 'We have 3 ready now. We may have a few smaller ones; Andrew will reach out about the extra.' }]);
  const rows = h.invo.sheets.Invoices.getDataRange().getValues(), last = rows[rows.length - 1];
  assert.ok(last.some(c => /REQUEST: White sage \(4-inch pot\) customer wants 5, only 3 retail-ready; up to 5 smaller ones on hand\. Offer the smaller ones\./.test(String(c))));
  const cust = h.sent.find(m => m.to === 'ana@example.com'); assert.ok(cust); assert.match(cust.body, /About your White sage \(4-inch pot\): We have 3 ready now/); assert.doesNotMatch(cust.body, /REQUEST|retail-ready/); assert.doesNotMatch(cust.body, ADDR);
  h.sent.filter(m => m.to !== 'ana@example.com').forEach(m => assert.doesNotMatch(m.body, ADDR));
});
t('qty > ready+extra rejected with real number (+ smaller ones); 0/0 not available; nothing written', () => {
  const h = load(); subWith(h, { apiana: { four: 8, gal1: 0, fourReady: 3 }, deergrass: { four: 0, gal1: 0 } }); const n = h.invo.sheets.Invoices.rows.length;
  const r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 9 }]); assert.strictEqual(r.ok, false); assert.match(r.message, /Only 3 White sage \(4-inch pot\) available plus a few smaller ones/);
  const r2 = post(h, [{ plant: 'Deergrass (Muhlenbergia rigens)', sizeKey: '4"', qty: 1 }]); assert.strictEqual(r2.ok, false); assert.match(r2.message, /not available/);
  const h2 = load(); subWith(h2, { apiana: { four: 3, gal1: 0 } }); const r3 = post(h2, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 4 }]);
  assert.match(r3.message, /Only 3 White sage/); assert.doesNotMatch(r3.message, /smaller/);
  assert.strictEqual(h.invo.sheets.Invoices.rows.length, n);
  assert.throws(() => h.ctx.submitInvoice({ lines: [{ plant: 'White sage (Salvia apiana)', size: '4"', qty: '9', amt: '54' }] }), /Only 3/);
});
t('no baseline: everything allowed, qty/extra null, no notices', () => {
  const h = load(); h.inv.sheets.Submissions.rows.splice(1);
  const s = sz(h.ctx.iennInventory(), 'White sage', '4"'); assert.deepStrictEqual([s.qty, s.extra, s.canRequest], [null, null, false]);
  const r = post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 40 }]); assert.strictEqual(r.ok, true); assert.deepStrictEqual(J(r.notices), []);
});
t('URLs point at www.inlandempirenativenursery.com', () => {
  const h = load(); assert.strictEqual(h.ctx.IENN_WEBSITE_URL, 'https://www.inlandempirenativenursery.com/order.html');
  assert.strictEqual(h.ctx.IENN_LOGO_URL, 'https://www.inlandempirenativenursery.com/images/ienn-logo-IMG_2773.jpg');
  assert.match(h.ctx.iennHubHtml_(), /href="https:\/\/www\.inlandempirenativenursery\.com\/"/);
  assert.match(h.ctx.iennCustomerClosed_().getContent(), /www\.inlandempirenativenursery\.com\/order\.html/);
});
t('?view=confirm alias: no token / bad token / wrong-id token change nothing; good token confirms', () => {
  const h = load(); post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]);
  const id = 'IEN-2026-003', st = () => JSON.stringify(h.invo.sheets.Invoices.getDataRange().getValues()), before = st(), n = h.sent.length;
  [{ orderId: id }, { orderId: id, t: 'bad' }, { orderId: id, t: h.ctx.iennConfirmToken_('IEN-2026-001') }, { t: h.ctx.iennConfirmToken_(id) }].forEach(q => {
    const c = h.ctx.doGet({ parameter: Object.assign({ view: 'confirm' }, q) }).getContent();
    assert.match(c, /Link not valid/); assert.doesNotMatch(c, new RegExp(id));
  });
  assert.strictEqual(st(), before); assert.strictEqual(h.sent.length, n);
  const ok = h.ctx.doGet({ parameter: { view: 'confirm', orderId: id, t: h.ctx.iennConfirmToken_(id) } }).getContent();
  assert.match(ok, /confirmed/); assert.notStrictEqual(st(), before);
  assert.ok(h.invo.sheets.Invoices.getDataRange().getValues().some(r => r.includes(id) && r.includes('Confirmed')));
});
const LIVE_EXEC = 'https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec';
for (const other of ['https://script.google.com/macros/s/X/dev', 'https://script.google.com/macros/s/AKfycbOLD1/exec']) {
  t('confirm link in alert uses the live AKfycby_ exec URL even when getUrl() = ' + other, () => {
    const h = load(); h.ctx.ScriptApp.getService = () => ({ getUrl: () => other });
    post(h, [{ plant: 'White sage (Salvia apiana)', sizeKey: '4"', qty: 1 }]); const m = h.sent.find(x => x.to === 'andrew@example.test'), u = linkOf(m);
    assert.ok(u && u.startsWith('https://www.inlandempirenativenursery.com/confirm.html?id='), u); assert.ok(m.body.includes('try: ' + LIVE_EXEC + '?action=confirm&id='), 'fallback'); assert.ok(!(m.body + m.htmlBody).includes(other));
  });
  t('hub links use the live AKfycby_ exec URL even when getUrl() = ' + other, () => {
    const h = load(); h.ctx.ScriptApp.getService = () => ({ getUrl: () => other });
    const html = h.ctx.iennHubHtml_(); assert.ok(html.includes('href="' + LIVE_EXEC + '"'), 'hub exec'); assert.ok(!html.includes(other));
  });
}
t('iennWebAppUrl_ never returns /dev, even if the constant is blank', () => {
  const h = load(); vm.runInContext("IENN_WEBAPP_URL = ''", h.ctx); h.ctx.ScriptApp.getService = () => ({ getUrl: () => 'https://script.google.com/macros/s/X/dev' });
  assert.strictEqual(h.ctx.iennWebAppUrl_(), '');
});
console.log('\n' + pass + ' total tests passed');
