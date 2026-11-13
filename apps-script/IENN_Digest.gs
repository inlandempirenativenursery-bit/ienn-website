/**
 * IENN weekly stock digest (approved by Eric 2026-11-02).
 *  - Fridays 7 a.m. America/Los_Angeles (installDigestTrigger), to Script Property DIGEST_TO (default nursery Gmail).
 *  - Numbers come from iennInventory() (= iennStockDetail_ / iennCarryCounts_ / iennAvailable_), so they match the shop feed exactly.
 *  - Low = 1..LOW_STOCK_AT ready; sold out = counted size at 0 ready, reported one line per plant (subject counts plants). "On request" / uncounted sizes are never alerted. Extra is shown, never alerted.
 *  - No customer names, emails, phones, addresses and no pickup address anywhere in this mail.
 *  - Same-day duplicate guard: DIGEST_LAST_SENT_DAY. Orders "since last digest": DIGEST_LAST_SENT_AT, floored at the metrics since-date.
 *  - runDigestNow_() = test send: bypasses the guard, "TEST" in the subject, does not move the guard or the orders window.
 */
var IENN_DIGEST_TZ = 'America/Los_Angeles', IENN_DIGEST_DEFAULT_TO = '' /* REDACTED: team email, see Script Properties */, IENN_DIGEST_LOW_AT = 5, IENN_DIGEST_STALE_DAYS = 7;
var IENN_DIGEST_HANDLER = 'iennWeeklyDigest';

function iennDigestProp_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function iennDigestTo_() { var t = String(iennDigestProp_('DIGEST_TO')).trim(); return t || IENN_DIGEST_DEFAULT_TO; }
function iennDigestLowAt_() { var n = Number(iennDigestProp_('LOW_STOCK_AT')); return iennDigestProp_('LOW_STOCK_AT') !== '' && isFinite(n) && n >= 0 ? n : IENN_DIGEST_LOW_AT; }

/** Trigger handler (weekly, Friday 7 a.m. PT). */
function iennWeeklyDigest() { return iennDigestSend_({ test: false }); }
/** Manual test send from the editor. */
function runDigestNow_() { return iennDigestSend_({ test: true }); }

/** Idempotent: removes any existing digest triggers, then installs exactly one weekly Friday 7 a.m. trigger. */
function installDigestTrigger() {
  var tz = Session.getScriptTimeZone();
  if (tz !== IENN_DIGEST_TZ) throw new Error('Project timezone is ' + tz + ', expected ' + IENN_DIGEST_TZ);
  var removed = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === IENN_DIGEST_HANDLER) { ScriptApp.deleteTrigger(t); removed++; } });
  ScriptApp.newTrigger(IENN_DIGEST_HANDLER).timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(7).inTimezone(IENN_DIGEST_TZ).create();
  var n = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === IENN_DIGEST_HANDLER; }).length;
  return { ok: true, timezone: tz, removed: removed, digestTriggers: n };
}

function iennDigestSend_(opt) {
  opt = opt || {}; var now = opt.now || new Date(), props = PropertiesService.getScriptProperties();
  var day = Utilities.formatDate(now, IENN_DIGEST_TZ, 'yyyy-MM-dd'), to = iennDigestTo_();
  if (!opt.test) {
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { if (props.getProperty('DIGEST_LAST_SENT_DAY') === day) return { ok: true, skipped: 'already sent ' + day }; props.setProperty('DIGEST_LAST_SENT_DAY', day); }
    finally { lock.releaseLock(); }
  }
  var d;
  try { d = iennDigestBuild_(now, opt.test); }
  catch (err) {
    var label = Utilities.formatDate(now, IENN_DIGEST_TZ, 'EEE MMM d');
    MailApp.sendEmail({ to: to, subject: (opt.test ? 'TEST ' : '') + 'IENN weekly stock – ' + label + ': digest failed',
      body: 'The weekly stock digest could not be built, so no counts were sent (to avoid wrong numbers).\n\nReason: ' + String(err && err.message || err).slice(0, 300) +
        '\n\nCheck the IENN Inventory sheet (Catalog and Submissions tabs) and the shop feed (?view=inventory).' });
    return { ok: false, failed: true, error: String(err && err.message || err) };
  }
  MailApp.sendEmail({ to: to, subject: d.subject, body: d.text, htmlBody: d.html });
  if (!opt.test) props.setProperty('DIGEST_LAST_SENT_AT', String(now.getTime()));
  return { ok: true, to: to, subject: d.subject, low: d.low.length, soldOut: d.soldOut.length };
}

/** Throws if the Catalog or stock can't be read (caller sends the "digest failed" mail). */
function iennDigestRead_() {
  var ss = inventoryDb_(); if (!ss) throw new Error('IENN Inventory spreadsheet not readable');
  var cat = ss.getSheetByName(IENN_CATALOG_SHEET || 'Catalog'), sub = ss.getSheetByName(IENN_SUBMISSIONS_SHEET || 'Submissions');
  if (!cat || cat.getDataRange().getValues().length < 2) throw new Error('Catalog tab missing or empty');
  if (!sub) throw new Error('Submissions tab missing');
  var inv = iennInventory();
  if (!inv || inv.fallback) throw new Error('Catalog could not be read (feed used the fallback plant list)');
  if (!inv.countDate) throw new Error('No stock count found in Submissions');
  if (!inv.plants || !inv.plants.length) throw new Error('No plants in the feed');
  return { inv: inv, subRows: sub.getDataRange().getValues() };
}

/** Pure-ish: counter -> latest count ms from Submissions rows [week, person, at, counts]. */
function iennDigestCounters_(rows, now) {
  var last = {};
  for (var r = 1; r < (rows || []).length; r++) { var p = String(rows[r][1] || '').trim(), at = Number(rows[r][2]) || 0; if (!p || !rows[r][0] || !at) continue; if (!last[p] || at > last[p]) last[p] = at; }
  return Object.keys(last).sort().map(function (p) { var days = (now.getTime() - last[p]) / 864e5;
    return { person: p.charAt(0).toUpperCase() + p.slice(1), at: last[p], date: Utilities.formatDate(new Date(last[p]), IENN_DIGEST_TZ, 'EEE MMM d'), days: Math.floor(days), stale: days > IENN_DIGEST_STALE_DAYS }; });
}

/** Orders / dollars in (from, to], same rules as metrics: since-date floor (test orders before it ignored), Cancelled skipped, one invoice = one order. */
function iennDigestOrders_(from, to) {
  var sh = iennInvoicesSheet_(), v = sh.getDataRange().getValues(), head = v[0] || [];
  var c = { id: iennCol_(head, INVOICE_ID_HEADERS), date: iennCol_(head, INVOICE_DATE_HEADERS), total: iennCol_(head, INVOICE_TOTAL_HEADERS), status: iennCol_(head, INVOICE_STATUS_HEADERS) };
  if (c.date < 0) throw new Error('Invoices: no Timestamp/Date column');
  var floor = iennMetricsMidnight_(iennMetricsOrdersSince_()); if (!from || from < floor) from = floor;
  var seen = {}, count = 0, dollars = 0;
  for (var i = 1; i < v.length; i++) {
    var r = v[i], d = iennDate_(r[c.date]); if (!d || d < from || d > to) continue;
    if (c.status >= 0 && /cancel/i.test(String(r[c.status]))) continue;
    var id = c.id >= 0 ? String(r[c.id] || '') : ''; if (id) { if (seen[id]) continue; seen[id] = true; }
    count++; dollars += c.total >= 0 ? (Number(String(r[c.total]).replace(/[^0-9.\-]/g, '')) || 0) : 0;
  }
  return { count: count, dollars: Math.round(dollars * 100) / 100, from: from };
}

/** One sold-out line per plant: "Apricot mallow: all sizes out" or "Black sage: 1 gal out (+5 extra)" / 'X: 2", Tree pot out'. */
function iennDigestOutLine_(o) {
  var ex = o.sizes.filter(function (z) { return z.extra > 0; });
  var exTxt = !ex.length ? '' : (o.sizes.length === 1 ? ' (+' + ex[0].extra + ' extra)' : ' (+' + ex.map(function (z) { return z.extra + ' extra ' + z.key; }).join(', ') + ')');
  return o.plant + ': ' + (o.all ? 'all sizes out' : o.sizes.map(function (z) { return z.key; }).join(', ') + ' out') + exTxt;
}
/** Pure: feed -> { rows, low (per size), soldOut (per plant) } using ready qty only for alerts. */
function iennDigestClassify_(inv, lowAt) {
  var rows = [], low = [], soldOut = [];
  inv.plants.forEach(function (p) {
    var cells = {}, outs = [], counted = 0;
    p.sizes.forEach(function (z) {
      cells[z.key] = z.qty === null || z.qty === undefined ? null : { ready: z.qty, extra: z.extra || 0 };
      if (z.qty === null || z.qty === undefined) return;            // On request / uncounted: never alerted
      var it = { plant: p.name, size: z.size, ready: z.qty, extra: z.extra || 0 };
      if (z.qty === 0) outs.push({ key: z.key, extra: z.extra || 0 }); else if (z.qty <= lowAt) low.push(it);
      counted++;
    });
    if (outs.length) soldOut.push({ plant: p.name, all: outs.length === counted, sizes: outs });
    rows.push({ plant: p.name, cells: cells });
  });
  var by = function (a, b) { return a.plant.localeCompare(b.plant) || a.size.localeCompare(b.size); };
  rows.sort(function (a, b) { return a.plant.localeCompare(b.plant); }); low.sort(by); soldOut.sort(function (a, b) { return a.plant.localeCompare(b.plant); });
  return { rows: rows, low: low, soldOut: soldOut };
}

function iennDigestEsc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function iennDigestBuild_(now, test) {
  var rd = iennDigestRead_(), inv = rd.inv, lowAt = iennDigestLowAt_(), k = iennDigestClassify_(inv, lowAt);
  var counters = iennDigestCounters_(rd.subRows, now);
  var lastAt = Number(iennDigestProp_('DIGEST_LAST_SENT_AT')) || 0, ord = iennDigestOrders_(lastAt ? new Date(lastAt) : null, now);
  var label = Utilities.formatDate(now, IENN_DIGEST_TZ, 'EEE MMM d');
  var subject = (test ? 'TEST ' : '') + 'IENN weekly stock – ' + label + ': ' + k.low.length + ' low, ' + k.soldOut.length + ' sold out';
  var sizes = inv.sizes.map(function (s) { return { key: s.key, label: s.key }; });
  var cellTxt = function (c) { return c === null ? 'On request' : c.ready + (c.extra ? ' (+' + c.extra + ' extra)' : ''); };
  var item = function (x) { return x.plant + ' – ' + x.size + ': ' + x.ready + ' ready' + (x.extra ? ' (+' + x.extra + ' extra)' : ''); };
  var fromTxt = Utilities.formatDate(ord.from, IENN_DIGEST_TZ, 'EEE MMM d');
  var T = [];
  if (test) T.push('TEST SEND – the weekly digest goes out Fridays at 7 a.m.', '');
  T.push('Stock as the website shows it right now. Alerts use ready stock only (low = ' + lowAt + ' or fewer ready).', '');
  T.push('LOW STOCK (' + k.low.length + ')'); k.low.forEach(function (x) { T.push('  ' + item(x)); }); if (!k.low.length) T.push('  None');
  T.push('', 'SOLD OUT (' + k.soldOut.length + ')'); k.soldOut.forEach(function (x) { T.push('  ' + iennDigestOutLine_(x)); }); if (!k.soldOut.length) T.push('  None');
  T.push('', 'ORDERS since ' + fromTxt + ': ' + ord.count + ' order' + (ord.count === 1 ? '' : 's') + ', $' + ord.dollars.toFixed(2));
  T.push('', 'LAST COUNTS'); counters.forEach(function (c) { T.push('  ' + c.person + ': ' + c.date + (c.stale ? '  ⚠ over ' + IENN_DIGEST_STALE_DAYS + ' days old' : '')); });
  T.push('', 'FULL TABLE (ready, +extra)', '  Plant | ' + sizes.map(function (s) { return s.label; }).join(' | '));
  k.rows.forEach(function (r) { T.push('  ' + r.plant + ' | ' + sizes.map(function (s) { return cellTxt(r.cells[s.key]); }).join(' | ')); });
  var e = iennDigestEsc_, td = 'style="padding:3px 8px;border:1px solid #ddd"';
  var list = function (a) { return a.length ? '<ul>' + a.map(function (x) { return '<li>' + e(item(x)) + '</li>'; }).join('') + '</ul>' : '<p>None</p>'; };
  var H = (test ? '<p><b>TEST SEND</b> – the weekly digest goes out Fridays at 7 a.m.</p>' : '') +
    '<p>Stock as the website shows it right now. Alerts use ready stock only (low = ' + lowAt + ' or fewer ready).</p>' +
    '<h3>Low stock (' + k.low.length + ')</h3>' + list(k.low) + '<h3>Sold out (' + k.soldOut.length + ')</h3>' + (k.soldOut.length ? '<ul>' + k.soldOut.map(function (x) { return '<li>' + e(iennDigestOutLine_(x)) + '</li>'; }).join('') + '</ul>' : '<p>None</p>') +
    '<h3>Orders since ' + e(fromTxt) + '</h3><p>' + ord.count + ' order' + (ord.count === 1 ? '' : 's') + ', $' + ord.dollars.toFixed(2) + '</p>' +
    '<h3>Last counts</h3><ul>' + counters.map(function (c) { return '<li>' + e(c.person) + ': ' + e(c.date) + (c.stale ? ' <b style="color:#b00">⚠ over ' + IENN_DIGEST_STALE_DAYS + ' days old</b>' : '') + '</li>'; }).join('') + '</ul>' +
    '<h3>Full table</h3><p>Ready (+extra). Extra = smaller plants on hand, not retail-ready.</p><table style="border-collapse:collapse;font-size:13px"><tr><th ' + td + '>Plant</th>' +
    sizes.map(function (s) { return '<th ' + td + '>' + e(s.label) + '</th>'; }).join('') + '</tr>' +
    k.rows.map(function (r) { return '<tr><td ' + td + '>' + e(r.plant) + '</td>' + sizes.map(function (s) { var c = r.cells[s.key];
      var bg = c && c.ready === 0 ? ' background:#fde2e2' : (c && c.ready <= lowAt ? ' background:#fff4cc' : '');
      return '<td style="padding:3px 8px;border:1px solid #ddd;' + bg + '">' + e(cellTxt(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  return { subject: subject, text: T.join('\n'), html: H, low: k.low, soldOut: k.soldOut, orders: ord, counters: counters };
}
