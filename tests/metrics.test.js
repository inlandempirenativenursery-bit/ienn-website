// Unit test for apps-script/IENN_Metrics.gs (draft widget endpoint). Node VM + in-memory stubs; no network.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const dir = path.join(__dirname, '..', 'apps-script');
function fmt(d, tz, f) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'longOffset' }).formatToParts(d).map(x => [x.type, x.value]));
  const off = (p.timeZoneName.replace('GMT', '') || '+00:00');
  if (f === 'XXX') return off;
  if (f === 'yyyy-MM-dd') return `${p.year}-${p.month}-${p.day}`;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${off}`;
}
function run({ now, rows, props, cf }) {
  const cache = {}, fetches = [], writes = [];
  const sheet = { getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }), getRange() { writes.push(arguments); return { setValues() {}, setValue() {} }; } };
  const ctx = {
    Date: class extends Date { constructor(...a) { a.length ? super(...a) : super(now); } static now() { return now; } },
    JSON, Math, Number, String, Object, Array, RegExp, Logger: { log() {} },
    Utilities: { formatDate: fmt },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null }) },
    CacheService: { getScriptCache: () => ({ get: k => cache[k] || null, put: (k, v) => (cache[k] = v) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; } }) },
    UrlFetchApp: { fetch: (u, o) => { fetches.push(JSON.parse(o.payload).query); return cf(); } },
    SpreadsheetApp: { openById: () => ({ getSheetByName: n => (n === 'Invoices' ? sheet : null) }) },
  };
  vm.createContext(ctx);
  for (const f of ['IENN_Config.gs', 'IENN_Stock.gs', 'IENN_Metrics.gs']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  return { ctx, cache, fetches, writes, get: p => JSON.parse(ctx.iennMetricsRoute_(p).s) };
}
const head = ['Timestamp', 'Invoice #', 'Date', 'Paid', 'Customer Email', 'Grand Total', 'Lines JSON', 'Note', 'Status', 'Handled by', 'Our response'];
const L = q => JSON.stringify([{ plant: 'White Sage', size: '1 gal', qty: q, amt: 1 }]);
const NOW = Date.parse('2026-10-25T20:00:00-07:00');            // Sun 8pm PDT
const rows = [head,
  [new Date('2026-10-25T00:30:00-07:00'), 'IENN-1', '', 'unpaid', 'a@x.co', '16.31', L(1), 'Website order — Ann · 555-1111\nPickup: Sat', 'New'],
  [new Date('2026-10-25T09:00:00-07:00'), 'IENN-2', '', 'unpaid', 'b@x.co', '$32.63', L(2), 'Website order — Bo', 'Cancelled'],
  [new Date('2026-10-24T23:59:00-07:00'), 'IENN-3', '', 'unpaid', 'c@x.co', '10.00', L(3), 'Website order — Cy', 'Paid'],
  [new Date('2026-10-19T00:10:00-07:00'), 'IENN-4', '', 'paid', 'd@x.co', '5.00', L(1), 'Website order — Di', 'Picked up'],
  [new Date('2026-10-18T23:50:00-07:00'), 'IENN-5', '', 'paid', 'e@x.co', '99.00', L(9), 'Website order — Ed', 'New'],   // 8 days ago: out
  [new Date('2026-10-25T10:00:00-07:00'), 'IENN-6', '', 'paid', 'f@x.co', '7.00', L(4), 'walk-in', 'New'],               // in-person: all only
];
const cfOk = () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: { viewer: { accounts: [{ t: [{ count: 30, sum: { visits: 12 } }], k: [{ count: 210, sum: { visits: 88 } }] }] } } }) });
const props = { METRICS_KEY: 'k3y-long', CF_API_TOKEN: 'tok' };

let h = run({ now: NOW, rows, props, cf: cfOk });
assert.deepStrictEqual(h.get({ key: 'nope' }), { ok: false, error: 'unauthorized' });
assert.deepStrictEqual(run({ now: NOW, rows, props: {}, cf: cfOk }).get({ key: '' }), { ok: false, error: 'metrics disabled' });
let r = h.get({ key: 'k3y-long' });
assert.strictEqual(r.ok, true); assert.strictEqual(r.updated, '2026-10-25T20:00:00-07:00');
const m = Object.fromEntries(r.metrics.map(x => [x.id, x]));
assert.deepStrictEqual([m.visits.today, m.visits.week], [12, 88]);
assert.deepStrictEqual([m.orders.today, m.orders.week], [1, 3], 'website orders: today 1 (cancelled excluded), week 3 (8-day-old excluded)');
assert.deepStrictEqual([m.revenue.today, m.revenue.week, m.revenue.unit], [16.31, 31.31, '$']);
const text = JSON.stringify(r);
for (const pii of ['@x.co', 'Ann', '555', 'IENN-1', 'Pickup', 'walk-in']) assert(!text.includes(pii), 'leaks ' + pii);
assert.strictEqual(h.writes.length, 0, 'never writes to the sheet');
// CF query: account, siteTag defaults to beacon token, LA midnight windows
const q = h.fetches[0];
assert(q.includes('accountTag:"a85e045b95745b2eea831457317a5f54"') && q.includes('siteTag:"00379ec8474248f69ace426cd21d2126"') && q.includes('bot:0'), q);
assert(q.includes('datetime_geq:"2026-10-25T07:00:00Z"') && q.includes('datetime_geq:"2026-10-19T07:00:00Z"'), q);
// cache: second call does not refetch
h.get({ key: 'k3y-long' }); assert.strictEqual(h.fetches.length, 1, 'cached');
// all-invoice source
h.ctx.IENN_METRICS.push({ id: 'allorders', label: 'All orders', source: 'all', field: 'count' }, { id: 'plants', label: 'Plants', source: 'orders', field: 'units' });
r = h.get({ key: 'k3y-long', fresh: '1' }); const m2 = Object.fromEntries(r.metrics.map(x => [x.id, x]));
assert.deepStrictEqual([m2.allorders.today, m2.allorders.week, m2.plants.today, m2.plants.week], [2, 4, 1, 5]);
// Cloudflare down: orders still served, visits null, partial flag
h = run({ now: NOW, rows, props, cf: () => ({ getResponseCode: () => 200, getContentText: () => '{"errors":[{"message":"not authorized"}]}' }) });
r = h.get({ key: 'k3y-long' }); const m3 = Object.fromEntries(r.metrics.map(x => [x.id, x]));
assert(r.ok && r.partial && m3.visits.today === null && m3.visits.error === 'unavailable' && m3.orders.week === 3);
assert(!JSON.stringify(r).includes('not authorized'), 'no raw upstream error in payload');
// DST: week window spanning Nov 1 2026 (PDT->PST)
h = run({ now: Date.parse('2026-11-03T12:00:00-08:00'), rows, props, cf: cfOk }); h.get({ key: 'k3y-long' });
assert(h.fetches[0].includes('datetime_geq:"2026-11-03T08:00:00Z"') && h.fetches[0].includes('datetime_geq:"2026-10-28T07:00:00Z"'), h.fetches[0]);
console.log('metrics: all passed');
