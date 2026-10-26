/**
 * IENN metrics for Eric's phone widget (DRAFT — not deployed).
 *
 *   GET <web app URL>?view=metrics&key=<METRICS_KEY>
 *   -> { ok: true, updated: "2026-10-25T20:15:00-07:00", tz: "America/Los_Angeles",
 *        periods: { today: {label, from}, d7: {...}, d30: {...}, qtd: {...}, ytd: {...} },
 *        metrics: [ { id, label, unit, periods: { today, d7, d30, qtd, ytd }, today, week, since? }, ... ] }
 *
 * Periods (all America/Los_Angeles, each runs up to "now"):
 *   today = since midnight;  d7 = today + the 6 days before;  d30 = today + the 29 days before;
 *   qtd = since the 1st of the current calendar quarter (Jan/Apr/Jul/Oct 1);  ytd = since Jan 1.
 * `today` / `week` (= d7) are kept for older copies of the widget.
 * `since` appears only when a source can't reach back to a period's start (Cloudflare retention):
 *   e.g. since: { ytd: "2026-04-25" } = the YTD visits number only counts from that date.
 *
 * Counts and totals only. Never returns names, emails, phones, addresses, notes or invoice numbers.
 * Read-only: never writes to any sheet (it does not reuse iennInvoices_(), which can add header cells).
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

var IENN_METRICS_PERIODS = [                                            // order = display order
  { key: 'today', label: 'Today' },
  { key: 'd7',    label: '7 days' },
  { key: 'd30',   label: '30 days' },
  { key: 'qtd',   label: 'This quarter' },
  { key: 'ytd',   label: 'Year to date' }
];
var IENN_METRICS_TZ = 'America/Los_Angeles';
var IENN_METRICS_CACHE_SECONDS = 600;                                   // ~10 minutes for the whole payload
var IENN_CF_ACCOUNT_ID = 'a85e045b95745b2eea831457317a5f54';            // an identifier, not a secret
var IENN_CF_BEACON_TOKEN = '00379ec8474248f69ace426cd21d2126';          // public (it is in every page); used as the siteTag unless CF_SITE_TAG is set
// Cloudflare limits for rumPageloadEventsAdaptiveGroups are read live from the GraphQL `settings` node (cached 6 h).
// These fallbacks are used only if that read fails: deliberately conservative (30-day chunks, 31-day reach-back).
var IENN_CF_FALLBACK_MAX_DURATION_S = 30 * 86400;
var IENN_CF_FALLBACK_NOT_OLDER_S = 31 * 86400;
var IENN_CF_ALIASES_PER_REQUEST = 8;                                    // keep each GraphQL request small
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
  var cache = CacheService.getScriptCache(), ck = 'ienn-metrics-v2';
  if (!fresh) { var hit = cache.get(ck); if (hit) return JSON.parse(hit); }
  var w = iennMetricsWindows_(new Date()), src = {}, errors = {};
  var need = {}; IENN_METRICS.forEach(function (m) { need[m.source] = true; });
  if (need.cf) { try { src.cf = iennMetricsCloudflare_(w); } catch (e) { errors.cf = String(e.message || e); } }
  if (need.orders || need.all) { try { var o = iennMetricsOrders_(w); src.orders = o.website; src.all = o.all; } catch (e) { errors.orders = errors.all = String(e.message || e); } }
  var metrics = IENN_METRICS.map(function (m) {
    var s = src[m.source], row = { id: m.id, label: m.label, unit: m.unit || '', periods: {} };
    IENN_METRICS_PERIODS.forEach(function (p) { var v = s && s.periods[p.key] ? s.periods[p.key][m.field] : null; row.periods[p.key] = v == null ? null : v; });
    row.today = row.periods.today; row.week = row.periods.d7;          // back-compat
    if (s && s.since && Object.keys(s.since).length) row.since = s.since;
    if (!s) row.error = errors[m.source] ? 'unavailable' : 'unknown source';
    return row;
  });
  var periods = {};
  IENN_METRICS_PERIODS.forEach(function (p) { periods[p.key] = { label: p.label, from: Utilities.formatDate(w.starts[p.key], IENN_METRICS_TZ, 'yyyy-MM-dd') }; });
  var payload = { ok: true, updated: Utilities.formatDate(w.now, IENN_METRICS_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"), tz: IENN_METRICS_TZ, periods: periods, metrics: metrics };
  if (Object.keys(errors).length) { payload.partial = true; Logger.log('IENN metrics source errors: ' + JSON.stringify(errors)); }
  cache.put(ck, JSON.stringify(payload), errors.cf || errors.orders ? 120 : IENN_METRICS_CACHE_SECONDS);   // retry sooner after a failure
  return payload;
}

/** { now, end, starts: {today,d7,d30,qtd,ytd}, earliest } as Dates. Midnights in America/Los_Angeles (DST-safe per day). */
function iennMetricsWindows_(now) {
  var ymd = Utilities.formatDate(now, IENN_METRICS_TZ, 'yyyy-MM-dd'), y = +ymd.slice(0, 4), mo = +ymd.slice(5, 7);
  var back = function (days) { var d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - days); return d.toISOString().slice(0, 10); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var starts = {
    today: iennMetricsMidnight_(ymd),
    d7: iennMetricsMidnight_(back(6)),
    d30: iennMetricsMidnight_(back(29)),
    qtd: iennMetricsMidnight_(y + '-' + pad(Math.floor((mo - 1) / 3) * 3 + 1) + '-01'),
    ytd: iennMetricsMidnight_(y + '-01-01')
  };
  var earliest = starts.today; Object.keys(starts).forEach(function (k) { if (starts[k] < earliest) earliest = starts[k]; });   // d30 can precede Jan 1
  return { now: now, end: now, starts: starts, earliest: earliest };
}
function iennMetricsMidnight_(ymd) {
  var noon = new Date(ymd + 'T12:00:00Z');                               // offset at that LA date (PST -08:00 / PDT -07:00)
  var off = Utilities.formatDate(noon, IENN_METRICS_TZ, 'XXX');
  return new Date(ymd + 'T00:00:00' + off);
}
function iennMetricsZeroPeriods_(fields) {
  var o = {}; IENN_METRICS_PERIODS.forEach(function (p) { o[p.key] = {}; fields.forEach(function (f) { o[p.key][f] = 0; }); }); return o;
}

/* ---------- Purchases: IENN Invoices tab (read-only) ---------- */

/** Counts invoices whose Timestamp falls in each period. Status "Cancelled" is excluded.
    website = note starts "Website order" (orders placed on inlandempirenativenursery.com); all = every invoice row. */
function iennMetricsOrders_(w) {
  var sh = iennInvoicesSheet_(), v = sh.getDataRange().getValues(), head = v[0] || [];
  var c = { id: iennCol_(head, INVOICE_ID_HEADERS), date: iennCol_(head, INVOICE_DATE_HEADERS), note: iennCol_(head, INVOICE_NOTE_HEADERS),
    lines: iennCol_(head, INVOICE_LINES_HEADERS), total: iennCol_(head, INVOICE_TOTAL_HEADERS), status: iennCol_(head, INVOICE_STATUS_HEADERS) };
  if (c.date < 0) throw new Error('Invoices: no Timestamp/Date column');
  var F = ['count', 'revenue', 'units'], res = { website: { periods: iennMetricsZeroPeriods_(F) }, all: { periods: iennMetricsZeroPeriods_(F) } }, seen = {};
  for (var i = 1; i < v.length; i++) {
    var r = v[i], d = iennDate_(r[c.date]);
    if (!d || d < w.earliest || d > w.end) continue;
    if (c.status >= 0 && /cancel/i.test(String(r[c.status]))) continue;
    var id = c.id >= 0 ? String(r[c.id] || '') : ''; if (id) { if (seen[id]) continue; seen[id] = true; }   // one invoice = one purchase
    var total = c.total >= 0 ? (Number(String(r[c.total]).replace(/[^0-9.\-]/g, '')) || 0) : 0, units = 0;
    if (c.lines >= 0 && r[c.lines]) { try { JSON.parse(r[c.lines]).forEach(function (l) { units += Number(l.qty) || 0; }); } catch (e) {} }
    var web = c.note >= 0 && IENN_WEBSITE_ORDER_RE.test(String(r[c.note] || ''));
    [res.all].concat(web ? [res.website] : []).forEach(function (b) {
      IENN_METRICS_PERIODS.forEach(function (p) { if (d >= w.starts[p.key]) { var t = b.periods[p.key]; t.count++; t.revenue += total; t.units += units; } });
    });
  }
  ['website', 'all'].forEach(function (k) { IENN_METRICS_PERIODS.forEach(function (p) { var t = res[k].periods[p.key]; t.revenue = Math.round(t.revenue * 100) / 100; }); });
  return res;
}

/* ---------- Visits: Cloudflare Web Analytics (GraphQL, dataset rumPageloadEventsAdaptiveGroups) ---------- */

/** visits = sum{visits} (page loads arriving from another site or none); pageviews = count. Bots excluded.
    The span from the earliest period start to now is cut at every period start (so each period = a sum of whole segments)
    and again so no segment is wider than Cloudflare's maxDuration. Anything older than notOlderThan is skipped and
    reported in `since` for the affected periods. */
function iennMetricsCloudflare_(w) {
  var token = iennMetricsProp_('CF_API_TOKEN'); if (!token) throw new Error('CF_API_TOKEN not set');
  var siteTag = iennMetricsProp_('CF_SITE_TAG') || IENN_CF_BEACON_TOKEN;
  var hosts = (iennMetricsProp_('CF_HOSTS') || '').split(',').map(function (h) { return h.trim(); }).filter(String);
  var lim = iennCfLimits_(token), end = new Date(w.end.getTime() + 60000);   // include the current minute
  var floor = new Date(end.getTime() - lim.notOlderThan * 1000 + 3600000);  // 1 h inside retention, to be safe
  var segs = iennCfSegments_(w, end, floor, (lim.maxDuration - 3600) * 1000);
  var base = [{ siteTag: siteTag }, { bot: 0 }]; if (hosts.length) base.push({ requestHost_in: hosts });
  var iso = function (d) { return d.toISOString().replace(/\.\d{3}Z$/, 'Z'); };
  for (var i = 0; i < segs.length; i += IENN_CF_ALIASES_PER_REQUEST) {
    var part = segs.slice(i, i + IENN_CF_ALIASES_PER_REQUEST);
    var q = '{viewer{accounts(filter:{accountTag:' + iennGql_(IENN_CF_ACCOUNT_ID) + '}){' + part.map(function (s, j) {
      return 's' + j + ':rumPageloadEventsAdaptiveGroups(limit:1,filter:' + iennGql_({ AND: base.concat([{ datetime_geq: iso(s.from), datetime_lt: iso(s.to) }]) }) + '){count sum{visits}}';
    }).join('') + '}}}';
    var acct = iennCfQuery_(token, q);
    part.forEach(function (s, j) { var g = (acct['s' + j] || [])[0] || {}; s.visits = (g.sum && g.sum.visits) || 0; s.pageviews = g.count || 0; });
  }
  var out = { periods: iennMetricsZeroPeriods_(['visits', 'pageviews']), since: {} };
  IENN_METRICS_PERIODS.forEach(function (p) {
    var st = w.starts[p.key], t = out.periods[p.key];
    segs.forEach(function (s) { if (s.bucket >= st) { t.visits += s.visits; t.pageviews += s.pageviews; } });
    if (st < floor) out.since[p.key] = Utilities.formatDate(floor, IENN_METRICS_TZ, 'yyyy-MM-dd');
  });
  return out;
}

/** Disjoint [from,to) segments covering max(earliest,floor)..end, cut at each period start and at maxMs width. */
function iennCfSegments_(w, end, floor, maxMs) {
  var cuts = Object.keys(w.starts).map(function (k) { return w.starts[k].getTime(); }).concat([end.getTime()]);
  cuts = cuts.filter(function (t, i) { return cuts.indexOf(t) === i; }).sort(function (a, b) { return a - b; });
  var segs = [];
  for (var i = 0; i + 1 < cuts.length; i++) {
    var a = cuts[i], b = cuts[i + 1], bucket = new Date(a);                // bucket = the period boundary this span starts at
    if (b <= floor.getTime()) continue;                                   // entirely beyond retention
    if (a < floor.getTime()) a = floor.getTime();                         // partly beyond: keep what's available
    for (var x = a; x < b; x += maxMs) segs.push({ from: new Date(x), to: new Date(Math.min(x + maxMs, b)), bucket: bucket });
  }
  return segs;
}

/** { maxDuration, notOlderThan } in seconds for rumPageloadEventsAdaptiveGroups on this account (cached 6 h). */
function iennCfLimits_(token) {
  var cache = CacheService.getScriptCache(), hit = cache.get('ienn-cf-limits');
  if (hit) return JSON.parse(hit);
  var lim = { maxDuration: IENN_CF_FALLBACK_MAX_DURATION_S, notOlderThan: IENN_CF_FALLBACK_NOT_OLDER_S, source: 'fallback' };
  try {
    var acct = iennCfQuery_(token, '{viewer{accounts(filter:{accountTag:' + iennGql_(IENN_CF_ACCOUNT_ID) + '}){settings{rumPageloadEventsAdaptiveGroups{enabled maxDuration notOlderThan}}}}}');
    var s = acct.settings && acct.settings.rumPageloadEventsAdaptiveGroups;
    if (s && s.maxDuration > 3600 && s.notOlderThan > 3600) lim = { maxDuration: s.maxDuration, notOlderThan: s.notOlderThan, source: 'settings' };
  } catch (e) { Logger.log('Cloudflare settings read failed, using fallback limits: ' + e); }
  cache.put('ienn-cf-limits', JSON.stringify(lim), lim.source === 'settings' ? 21600 : 600);
  return lim;
}

function iennCfQuery_(token, query) {
  var res = UrlFetchApp.fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token }, payload: JSON.stringify({ query: query }) });
  var j = JSON.parse(res.getContentText() || '{}');                      // GraphQL errors arrive as HTTP 200 + errors[]
  if (res.getResponseCode() !== 200 || (j.errors && j.errors.length)) throw new Error('Cloudflare: ' + (j.errors && j.errors[0] && j.errors[0].message || res.getResponseCode()));
  var acct = (((j.data || {}).viewer || {}).accounts || [])[0];
  if (!acct) throw new Error('Cloudflare: account not visible to this token');
  return acct;
}

/** Run once from the editor after setting CF_API_TOKEN: logs the dataset limits and which siteTag/hostnames have data
    in the last 7 days, so CF_SITE_TAG can be set if it differs from the beacon token. Read-only. */
function iennMetricsCheckCloudflare() {
  var token = iennMetricsProp_('CF_API_TOKEN'), w = iennMetricsWindows_(new Date());
  var f = { datetime_geq: w.starts.d7.toISOString().replace(/\.\d{3}Z$/, 'Z'), datetime_lt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z') };
  var acct = iennCfQuery_(token, '{viewer{accounts(filter:{accountTag:' + iennGql_(IENN_CF_ACCOUNT_ID) + '}){' +
    'settings{rumPageloadEventsAdaptiveGroups{enabled maxDuration notOlderThan}}' +
    'rumPageloadEventsAdaptiveGroups(limit:50,filter:' + iennGql_(f) + ',orderBy:[count_DESC]){count sum{visits} dimensions{siteTag requestHost}}}}}');
  Logger.log(JSON.stringify(acct, null, 2));
}

/** Run from the editor to see exactly what the widget will get (bypasses the cache). */
function iennMetricsTest() { Logger.log(JSON.stringify(iennMetrics_(true), null, 2)); }

/** JS value -> GraphQL input literal ({a:"x",b:[1]}), so no schema type names are needed. Values come only from this file. */
function iennGql_(v) {
  if (Array.isArray(v)) return '[' + v.map(iennGql_).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).map(function (k) { return k + ':' + iennGql_(v[k]); }).join(',') + '}';
  return JSON.stringify(v);
}
function iennMetricsProp_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function iennMetricsSafeEq_(a, b) { if (a.length !== b.length) return false; var x = 0; for (var i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
