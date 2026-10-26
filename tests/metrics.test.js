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
    UrlFetchApp: { fetch: (u, o) => { const q = JSON.parse(o.payload).query; fetches.push(q); return cf(q); } },
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
// Fake Cloudflare: answers the settings node and every aliased segment from a list of page loads [time, isVisit].
function fakeCf(events, lim = { maxDuration: 8035200, notOlderThan: 15897600 }, opts = {}) {
  const segs = [];
  const fn = q => {
    if (opts.fail) return { getResponseCode: () => 200, getContentText: () => '{"errors":[{"message":"not authorized"}]}' };
    if (q.includes('settings{')) return { getResponseCode: () => 200, getContentText: () => JSON.stringify(opts.noSettings ? { errors: [{ message: 'x' }] } : { data: { viewer: { accounts: [{ settings: { rumPageloadEventsAdaptiveGroups: { enabled: true, ...lim } } }] } } }) };
    const acct = {}, re = /(s\d+):rumPageloadEventsAdaptiveGroups\(limit:1,filter:(.*?)\)\{count/g; let m;
    while ((m = re.exec(q))) {
      const from = Date.parse(/datetime_geq:"([^"]+)"/.exec(m[2])[1]), to = Date.parse(/datetime_lt:"([^"]+)"/.exec(m[2])[1]);
      segs.push({ from, to });
      const ev = events.filter(([t]) => t >= from && t < to);
      acct[m[1]] = [{ count: ev.length, sum: { visits: ev.filter(e => e[1]).length } }];
    }
    return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ data: { viewer: { accounts: [acct] } } }) };
  };
  fn.segs = segs; return fn;
}
const T = s => Date.parse(s);
const events = [
  [T('2026-10-25T08:00:00-07:00'), 1], [T('2026-10-25T09:00:00-07:00'), 0],           // today: 2 loads, 1 visit
  [T('2026-10-20T10:00:00-07:00'), 1],                                                 // d7
  [T('2026-10-01T00:30:00-07:00'), 1],                                                 // d30 + qtd (Oct 1)
  [T('2026-09-30T23:30:00-07:00'), 1],                                                 // d30 only (before Q4)
  [T('2026-09-20T12:00:00-07:00'), 1],                                                 // outside d30 (starts Sep 26), in ytd
  [T('2026-03-15T12:00:00-07:00'), 1],                                                 // ytd only
];
const props = { METRICS_KEY: 'k3y-long', CF_API_TOKEN: 'tok' };
const P = (r, id) => r.metrics.find(x => x.id === id).periods;

let cf = fakeCf(events), h = run({ now: NOW, rows, props, cf });
assert.deepStrictEqual(h.get({ key: 'nope' }), { ok: false, error: 'unauthorized' });
assert.deepStrictEqual(run({ now: NOW, rows, props: {}, cf }).get({ key: '' }), { ok: false, error: 'metrics disabled' });
let r = h.get({ key: 'k3y-long' });
assert.strictEqual(r.ok, true); assert.strictEqual(r.updated, '2026-10-25T20:00:00-07:00');
assert.deepStrictEqual(Object.fromEntries(Object.entries(r.periods).map(([k, v]) => [k, v.from])),
  { today: '2026-10-25', d7: '2026-10-19', d30: '2026-09-26', qtd: '2026-10-01', ytd: '2026-01-01' });
assert.strictEqual(r.periods.qtd.label, 'This quarter');
const m = Object.fromEntries(r.metrics.map(x => [x.id, x]));
assert.deepStrictEqual([m.visits.today, m.visits.week], [1, 2], 'back-compat today/week');
// 184-day retention: on Oct 25 YTD reaches back further than Cloudflare keeps -> clipped, noted in `since`
assert.deepStrictEqual(m.visits.since, { ytd: '2026-04-24' });
assert.strictEqual(P(r, 'visits').ytd, 5, 'March visit is beyond retention, not counted');
assert(!m.orders.since, 'orders come from the sheet: never clipped');
// segments: none wider than maxDuration, none older than retention, disjoint, ≤ 8 aliases per request
const lim = 8035200e3, keep = 15897600e3;
assert(cf.segs.every(g => g.to - g.from <= lim && g.from >= NOW - keep), JSON.stringify(cf.segs));
cf.segs.slice().sort((x, y) => x.from - y.from).reduce((prev, g) => { assert(!prev || g.from >= prev.to, 'disjoint'); return g; }, null);
assert(h.fetches.filter(q => /s8:/.test(q)).length === 0, 'max 8 aliases per request');
const q = h.fetches.find(x => x.includes('s0:'));
assert(q.includes('accountTag:"a85e045b95745b2eea831457317a5f54"') && q.includes('siteTag:"00379ec8474248f69ace426cd21d2126"') && q.includes('bot:0'), q);
assert(q.includes('datetime_geq:"2026-10-25T07:00:00Z"') && q.includes('datetime_geq:"2026-10-19T07:00:00Z"') && q.includes('datetime_geq:"2026-10-01T07:00:00Z"'), q);
// orders: periods
assert.deepStrictEqual(P(r, 'orders'), { today: 1, d7: 3, d30: 4, qtd: 4, ytd: 4 }, 'cancelled never counted; Oct 18 order is in d30/qtd but not d7');
assert.deepStrictEqual(P(r, 'revenue'), { today: 16.31, d7: 31.31, d30: 130.31, qtd: 130.31, ytd: 130.31 });
const text = JSON.stringify(r);
for (const pii of ['@x.co', 'Ann', '555', 'IENN-1', 'Pickup', 'walk-in']) assert(!text.includes(pii), 'leaks ' + pii);
assert.strictEqual(h.writes.length, 0, 'never writes to the sheet');
// cache: second call does not refetch (payload 10 min, limits 6 h)
let n = h.fetches.length; h.get({ key: 'k3y-long' }); assert.strictEqual(h.fetches.length, n, 'cached');
h.get({ key: 'k3y-long', fresh: '1' }); assert(!h.fetches.slice(n).some(x => x.includes('settings{')), 'limits cached separately');
// extra metrics are one line each
h.ctx.IENN_METRICS.push({ id: 'allorders', label: 'All orders', source: 'all', field: 'count' }, { id: 'plants', label: 'Plants', source: 'orders', field: 'units' });
r = h.get({ key: 'k3y-long', fresh: '1' });
assert.deepStrictEqual([P(r, 'allorders').today, P(r, 'allorders').d7, P(r, 'plants').today, P(r, 'plants').ytd], [2, 4, 1, 14]);
// settings unreadable -> conservative 30-day chunks / 31-day reach-back: qtd/ytd clipped and flagged, still a number
cf = fakeCf(events, undefined, { noSettings: true }); h = run({ now: NOW, rows, props, cf }); r = h.get({ key: 'k3y-long' });
assert(cf.segs.every(g => g.to - g.from <= 30 * 864e5 && g.from >= NOW - 31 * 864e5));
assert.deepStrictEqual(P(r, 'visits'), { today: 1, d7: 2, d30: 4, qtd: 3, ytd: 4 });
assert.deepStrictEqual(r.metrics[0].since, { ytd: '2026-09-24' });
// small maxDuration forces chunking inside one period (e.g. 10 days)
cf = fakeCf(events, { maxDuration: 10 * 86400, notOlderThan: 400 * 86400 }); h = run({ now: NOW, rows, props, cf }); r = h.get({ key: 'k3y-long' });
assert(cf.segs.length > 25 && cf.segs.every(g => g.to - g.from <= 10 * 864e5));
assert.deepStrictEqual(P(r, 'visits'), { today: 1, d7: 2, d30: 4, qtd: 3, ytd: 6 }); assert(!r.metrics[0].since);
// early January: d30 reaches into last year, before YTD start
h = run({ now: T('2026-01-05T09:00:00-08:00'), rows, props, cf: fakeCf([[T('2025-12-20T12:00:00-08:00'), 1], [T('2026-01-02T12:00:00-08:00'), 1]]) });
r = h.get({ key: 'k3y-long' }); assert.deepStrictEqual(P(r, 'visits'), { today: 0, d7: 1, d30: 2, qtd: 1, ytd: 1 });
assert.strictEqual(r.periods.d30.from, '2025-12-07');
// Cloudflare down: orders still served, visits null, partial flag, no raw upstream error
h = run({ now: NOW, rows, props, cf: fakeCf(events, undefined, { fail: true }) });
r = h.get({ key: 'k3y-long' }); const m3 = Object.fromEntries(r.metrics.map(x => [x.id, x]));
assert(r.ok && r.partial && m3.visits.periods.ytd === null && m3.visits.error === 'unavailable' && m3.orders.periods.d7 === 3);
assert(!JSON.stringify(r).includes('not authorized'));
// DST: week window spanning Nov 1 2026 (PDT->PST)
h = run({ now: T('2026-11-03T12:00:00-08:00'), rows, props, cf: fakeCf([]) }); h.get({ key: 'k3y-long' });
const qq = h.fetches.find(x => x.includes('s0:'));
assert(qq.includes('datetime_geq:"2026-11-03T08:00:00Z"') && qq.includes('datetime_geq:"2026-10-28T07:00:00Z"'), qq);
console.log('metrics: all passed');
