/**
 * IENN metrics for Eric's phone widget (DRAFT — not deployed).
 *
 *   GET <web app URL>?view=metrics&key=<METRICS_KEY>
 *   -> { ok: true, updated: "2026-10-25T20:15:00-07:00", tz: "America/Los_Angeles",
 *        metrics: [ { id, label, today, week, unit }, ... ] }
 *
 * "today" = since midnight America/Los_Angeles; "week" = the last 7 calendar days including today.
 * Counts and totals only. This file never returns names, emails, phones, addresses, notes or invoice numbers.
 * Read-only: it never writes to any sheet (it does not reuse iennInvoices_(), which can add header cells).
 *
 * Setup (Lobo — see docs/widget-2026-10-25.md):
 *   1. In iennRoute_ (IENN_Website.gs), add ONE line before `if (p.view !== 'inventory') return null;`
 *        if (p.view === 'metrics') return iennMetricsRoute_(p);
 *   2. Script Properties: METRICS_KEY (long random string), CF_API_TOKEN (Cloudflare token, Account Analytics: Read).
 *      Optional: CF_SITE_TAG (defaults to the beacon token below), CF_HOSTS (comma list to count only those hostnames).
 *   3. Deploy > Manage deployments > edit the existing deployment > Version: New version (same /exec URL).
 *
 * Adding a metric = one line in IENN_METRICS. Each line names a source and a field that source already computes:
 *   cf:     visits, pageviews
 *   orders: count, revenue, units      (website orders, Cancelled excluded)
 *   all:    count, revenue, units      (every invoice incl. in-person ones from the invoice tool, Cancelled excluded)
 */
var IENN_METRICS = [
  { id: 'visits',  label: 'Visits',     source: 'cf',     field: 'visits',  unit: '' },
  { id: 'orders',  label: 'Orders',     source: 'orders', field: 'count',   unit: '' },
  { id: 'revenue', label: 'Sales',      source: 'orders', field: 'revenue', unit: '$' }
  // , { id: 'pageviews', label: 'Page views',  source: 'cf',     field: 'pageviews', unit: '' }
  // , { id: 'plants',    label: 'Plants sold', source: 'orders', field: 'units',     unit: '' }
  // , { id: 'allorders', label: 'All orders',  source: 'all',    field: 'count',     unit: '' }
];

var IENN_METRICS_TZ = 'America/Los_Angeles';
var IENN_METRICS_CACHE_SECONDS = 600;                                   // ~10 minutes
var IENN_CF_ACCOUNT_ID = 'a85e045b95745b2eea831457317a5f54';            // an identifier, not a secret
var IENN_CF_BEACON_TOKEN = '00379ec8474248f69ace426cd21d2126';          // public (it is in every page); used as the siteTag unless CF_SITE_TAG is set
var IENN_WEBSITE_ORDER_RE = /^Website order\b/;                         // IENN_Website.gs writes notes starting "Website order — …"
var INVOICE_TOTAL_HEADERS = ['grand total', 'grand', 'total'];
var INVOICE_STATUS_HEADERS = ['status'];

/** Router entry. Lobo adds: if (p.view === 'metrics') return iennMetricsRoute_(p); */
function iennMetricsRoute_(p) {
  var out;
  try {
    var want = iennMetricsProp_('METRICS_KEY');
    if (!want) out = { ok: false, error: 'metrics disabled' };
    else if (!iennMetricsSafeEq_(String((p && p.key) || ''), want)) out = { ok: false, error: 'unauthorized' };
    else out = iennMetrics_(p && p.fresh === '1');
  } catch (err) { out = { ok: false, error: 'server error' }; }
  // Plain JSON only (no JSONP callback): the key must never be usable from a third-party page.
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Builds (or returns cached) payload. fresh=true bypasses the cache (?fresh=1). */
function iennMetrics_(fresh) {
  var cache = CacheService.getScriptCache(), ck = 'ienn-metrics-v1';
  if (!fresh) { var hit = cache.get(ck); if (hit) return JSON.parse(hit); }
  var w = iennMetricsWindows_(new Date()), src = {}, errors = {};
  var need = {}; IENN_METRICS.forEach(function (m) { need[m.source] = true; });
  if (need.cf) { try { src.cf = iennMetricsCloudflare_(w); } catch (e) { errors.cf = String(e.message || e); } }
  if (need.orders || need.all) { try { var o = iennMetricsOrders_(w); src.orders = o.website; src.all = o.all; } catch (e) { errors.orders = errors.all = String(e.message || e); } }
  var metrics = IENN_METRICS.map(function (m) {
    var s = src[m.source], row = { id: m.id, label: m.label, unit: m.unit || '', today: null, week: null };
    if (s) { row.today = s.today[m.field] == null ? null : s.today[m.field]; row.week = s.week[m.field] == null ? null : s.week[m.field]; }
    else row.error = errors[m.source] ? 'unavailable' : 'unknown source';
    return row;
  });
  var payload = { ok: true, updated: Utilities.formatDate(w.now, IENN_METRICS_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"), tz: IENN_METRICS_TZ, metrics: metrics };
  if (Object.keys(errors).length) { payload.partial = true; Logger.log('IENN metrics source errors: ' + JSON.stringify(errors)); }
  cache.put(ck, JSON.stringify(payload), errors.cf || errors.orders ? 120 : IENN_METRICS_CACHE_SECONDS);   // retry sooner after a failure
  return payload;
}

/** { now, todayStart, weekStart, end } as Dates. Midnights are computed in America/Los_Angeles (DST-safe per day). */
function iennMetricsWindows_(now) {
  var ymd = Utilities.formatDate(now, IENN_METRICS_TZ, 'yyyy-MM-dd');
  var d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 6);
  return { now: now, todayStart: iennMetricsMidnight_(ymd), weekStart: iennMetricsMidnight_(d.toISOString().slice(0, 10)), end: now };
}
function iennMetricsMidnight_(ymd) {
  var noon = new Date(ymd + 'T12:00:00Z');                               // offset at that LA date (PST -08:00 / PDT -07:00)
  var off = Utilities.formatDate(noon, IENN_METRICS_TZ, 'XXX');
  return new Date(ymd + 'T00:00:00' + off);
}

/* ---------- Purchases: IENN Invoices tab (read-only) ---------- */

/** Counts invoices whose Timestamp falls in each window. Status "Cancelled" is excluded.
    website = note starts "Website order" (orders placed on inlandempirenativenursery.com); all = every invoice row. */
function iennMetricsOrders_(w) {
  var sh = iennInvoicesSheet_(), v = sh.getDataRange().getValues(), head = v[0] || [];
  var c = { id: iennCol_(head, INVOICE_ID_HEADERS), date: iennCol_(head, INVOICE_DATE_HEADERS), note: iennCol_(head, INVOICE_NOTE_HEADERS),
    lines: iennCol_(head, INVOICE_LINES_HEADERS), total: iennCol_(head, INVOICE_TOTAL_HEADERS), status: iennCol_(head, INVOICE_STATUS_HEADERS) };
  if (c.date < 0) throw new Error('Invoices: no Timestamp/Date column');
  var z = function () { return { count: 0, revenue: 0, units: 0 }; };
  var res = { website: { today: z(), week: z() }, all: { today: z(), week: z() } }, seen = {};
  for (var i = 1; i < v.length; i++) {
    var r = v[i], d = iennDate_(r[c.date]);
    if (!d || d < w.weekStart || d > w.end) continue;
    if (c.status >= 0 && /cancel/i.test(String(r[c.status]))) continue;
    var id = c.id >= 0 ? String(r[c.id] || '') : ''; if (id) { if (seen[id]) continue; seen[id] = true; }   // one invoice = one purchase
    var total = c.total >= 0 ? (Number(String(r[c.total]).replace(/[^0-9.\-]/g, '')) || 0) : 0, units = 0;
    if (c.lines >= 0 && r[c.lines]) { try { JSON.parse(r[c.lines]).forEach(function (l) { units += Number(l.qty) || 0; }); } catch (e) {} }
    var web = c.note >= 0 && IENN_WEBSITE_ORDER_RE.test(String(r[c.note] || ''));
    var buckets = [res.all]; if (web) buckets.push(res.website);
    buckets.forEach(function (b) {
      [b.week].concat(d >= w.todayStart ? [b.today] : []).forEach(function (t) { t.count++; t.revenue += total; t.units += units; });
    });
  }
  ['website', 'all'].forEach(function (k) { ['today', 'week'].forEach(function (t) { res[k][t].revenue = Math.round(res[k][t].revenue * 100) / 100; }); });
  return res;
}

/* ---------- Visits: Cloudflare Web Analytics (GraphQL, dataset rumPageloadEventsAdaptiveGroups) ---------- */

/** visits = sum{visits} (a page view whose referrer is another site or none, i.e. an arrival); pageviews = count. Bots excluded. */
function iennMetricsCloudflare_(w) {
  var token = iennMetricsProp_('CF_API_TOKEN'); if (!token) throw new Error('CF_API_TOKEN not set');
  var siteTag = iennMetricsProp_('CF_SITE_TAG') || IENN_CF_BEACON_TOKEN;
  var hosts = (iennMetricsProp_('CF_HOSTS') || '').split(',').map(function (h) { return h.trim(); }).filter(String);
  var base = [{ siteTag: siteTag }, { bot: 0 }]; if (hosts.length) base.push({ requestHost_in: hosts });
  var f = function (from, to) { return { AND: base.concat([{ datetime_geq: iso(from), datetime_lt: iso(to) }]) }; };
  function iso(d) { return d.toISOString().replace(/\.\d{3}Z$/, 'Z'); }
  var end = new Date(w.end.getTime() + 60000);                           // include the current minute
  var query = '{viewer{accounts(filter:{accountTag:' + iennGql_(IENN_CF_ACCOUNT_ID) + '}){' +
    't:rumPageloadEventsAdaptiveGroups(limit:1,filter:' + iennGql_(f(w.todayStart, end)) + '){count sum{visits}}' +
    'k:rumPageloadEventsAdaptiveGroups(limit:1,filter:' + iennGql_(f(w.weekStart, end)) + '){count sum{visits}}}}}';
  var res = iennCfFetch_(token, query);
  var j = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200 || (j.errors && j.errors.length)) throw new Error('Cloudflare: ' + (j.errors && j.errors[0] && j.errors[0].message || res.getResponseCode()));
  var acct = (((j.data || {}).viewer || {}).accounts || [])[0];
  if (!acct) throw new Error('Cloudflare: account not visible to this token');
  var pick = function (g) { g = (g || [])[0] || {}; return { visits: (g.sum && g.sum.visits) || 0, pageviews: g.count || 0 }; };
  return { today: pick(acct.t), week: pick(acct.k) };
}

/** Run once from the editor after setting CF_API_TOKEN: logs which siteTag/hostnames have data in the last 7 days,
    so CF_SITE_TAG can be set if it turns out to differ from the beacon token. Read-only. */
function iennMetricsCheckCloudflare() {
  var token = iennMetricsProp_('CF_API_TOKEN'), w = iennMetricsWindows_(new Date());
  var f = { datetime_geq: w.weekStart.toISOString().replace(/\.\d{3}Z$/, 'Z'), datetime_lt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') };
  var res = iennCfFetch_(token, '{viewer{accounts(filter:{accountTag:' + iennGql_(IENN_CF_ACCOUNT_ID) + '}){' +
    'rumPageloadEventsAdaptiveGroups(limit:50,filter:' + iennGql_(f) + ',orderBy:[count_DESC]){count sum{visits} dimensions{siteTag requestHost}}}}}');
  Logger.log(res.getResponseCode() + ' ' + res.getContentText());
}

/** Run from the editor to see exactly what the widget will get (bypasses the cache). */
function iennMetricsTest() { Logger.log(JSON.stringify(iennMetrics_(true), null, 2)); }

function iennCfFetch_(token, query) {
  return UrlFetchApp.fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify({ query: query }) });
}
/** JS value -> GraphQL input literal ({a:"x",b:[1]}), so no schema type names are needed. Values come only from this file. */
function iennGql_(v) {
  if (Array.isArray(v)) return '[' + v.map(iennGql_).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).map(function (k) { return k + ':' + iennGql_(v[k]); }).join(',') + '}';
  return JSON.stringify(v);
}
function iennMetricsProp_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function iennMetricsSafeEq_(a, b) { if (a.length !== b.length) return false; var x = 0; for (var i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
