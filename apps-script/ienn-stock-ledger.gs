/**
 * IENN stock ledger — makes stock auto-decrease on every order, without editing anyone's weekly counts.
 * READY TO PASTE (new file in the existing IENN Apps Script project) — NOT DEPLOYED.
 *
 * REAL names used (seen in the live web app's function list): getInitial, getAvailableStock, submitInvoice,
 * getSettings, saveTeamEmails, nextInvoiceNumber, buildReceiptText. Real invoice payload (from the customer view):
 *   { date, paid:"unpaid", payment, customerEmail, discType, discAmt, note,
 *     lines:[{ plant:"Name (Botanical)", size:'4"'|'1 gal'|..., qty, amt }], subtotal, tax, grand }
 *   Line "amt" is TAX-INCLUSIVE in the existing tool (subtotal = grand / 1.0875).
 *
 * ===== ASSUMPTIONS (Eric to confirm; all configurable below) =====
 *  S1. The inventory tool is the single source of truth. "Sold" is created INSIDE the tool's own spreadsheet
 *      (the one holding Submissions + Catalog), never a separate file. ienSS_() finds it by: INVENTORY_SS_ID if set,
 *      else the bound/active spreadsheet, else the Drive file named "IENN Inventory" that the tool created.
 *      If the tool has its own lookup helper, make ienSS_() return that instead (one-line edit).
 *  S2. Sheet "Submissions": header row; one row per person per weekly count. Columns (loose header match):
 *        Timestamp | Week (optional) | Person | Counts
 *      Counts = JSON keyed by Catalog plant id: {"<id>": {"four": 12, "gal1": 3}, ...}
 *  S3. Sheet "Catalog": header row; columns Id | Name (common name; may be "Common (Botanical)").
 *  S4. LATEST WEEK = the Week column value of the newest row if a Week column exists, else the ISO week
 *      (yyyy-Www, America/Los_Angeles) of the newest Timestamp. Within that week, each person's NEWEST row counts
 *      (a re-submission replaces their earlier one); counts are summed across people.
 *  S5. The existing getAvailableStock() already does this aggregation and returns { "<plant name>": { '4"': n, '1 gal': n } }.
 *      We KEEP it as the source of counts (renamed, see edits) and only use our own aggregation if it is missing.
 *  S6. New sheet "Sold" (auto-created): one row per order line:
 *        Order ID | Timestamp | Week | Plant ID | Plant | Size key (four|gal1|...) | Qty | Source | Customer (JSON)
 *      AVAILABLE = latest-week count − Sold qty with the SAME Week. A new weekly count => new Week => baseline resets.
 *
 * ===== MINIMAL EDITS TO EXISTING CODE =====
 *  E1. Rename the existing  function getAvailableStock(  ->  function getAvailableStockRaw_(
 *      (our getAvailableStock below returns raw minus Sold, so getInitial() and the customer view show live stock too).
 *  E2. Rename the existing  function submitInvoice(  ->  function submitInvoiceOriginal_(
 *      (our submitInvoice below = lock + stock check + original (writes IENN Invoices + emails team, unchanged) + Sold rows).
 *  Nothing else in the existing project changes.
 */

var INVENTORY_SS_ID = '';            // '' = active spreadsheet; else the IENN Inventory spreadsheet id
var SUBMISSIONS_SHEET = 'Submissions', CATALOG_SHEET = 'Catalog', SOLD_SHEET = 'Sold';
var SOLD_HEADERS = ['Order ID', 'Timestamp', 'Week', 'Plant ID', 'Plant', 'Size key', 'Qty', 'Source', 'Customer'];
var IENN_TZ = 'America/Los_Angeles';

// ---------- shared size / price (mirrors inventory.js) ----------
var IENN_SIZES = ['2"', '4"', 'Tree pot', '1 gal'];
var IENN_SIZE_KEYS = { '2"': 'two', '4"': 'four', 'Tree pot': 'tree', '1 gal': 'gal1' };
var IENN_SIZE_PRICES = { '2"': 3, '4"': 6, 'Tree pot': 10, '1 gal': 15 };
var IENN_TAX_PCT = 8.75;             // existing tool: prices INCLUDE tax; tax is backed out (sub = total / 1.0875)
function ienNormSize(s) {
  var t = String(s == null ? '' : s).toLowerCase().replace(/[\u201d\u2033]/g, '"').replace(/\s+/g, ' ').trim();
  if (t === 'four') return '4"'; if (t === 'gal1') return '1 gal'; if (t === 'two') return '2"';
  if (/quarter|1\/4|\u00bc|tree/.test(t)) return 'Tree pot';
  if (/^1 ?(-| )?(gal|gallon)s?\b|^1g$|^#1$|one gallon/.test(t)) return '1 gal';
  if (/^2 ?(-| )?("|in\b|inch|inches)|^2$/.test(t)) return '2"';
  if (/^4 ?(-| )?("|in\b|inch|inches)|^4$/.test(t)) return '4"';
  return null;
}
function ienPrice(size) { var z = ienNormSize(size); return z ? IENN_SIZE_PRICES[z] : null; }
function ienTax(total) { var sub = total / (1 + IENN_TAX_PCT / 100); return { subtotal: Math.round(sub * 100) / 100, tax: Math.round((total - sub) * 100) / 100, total: total }; }
function ienCommon_(n) { return String(n || '').split(' (')[0].trim().toLowerCase(); }
function ienHdr_(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); }

// ---------- pure logic (unit-tested in tests/ledger.test.js) ----------
function ienIsoWeek(d) {
  var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  var y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), w = Math.ceil(((t - y) / 864e5 + 1) / 7);
  return t.getUTCFullYear() + '-W' + (w < 10 ? '0' : '') + w;
}
/** rows incl. header. Returns { week, counts: { id: { four, gal1, ... } } } */
function ienAggregateSubmissions(rows) {
  var h = rows[0].map(ienHdr_), c = function (n) { return h.indexOf(n); };
  var ts = c('timestamp') >= 0 ? c('timestamp') : 0, wk = c('week'), who = c('person') >= 0 ? c('person') : c('name'), js = c('counts') >= 0 ? c('counts') : c('json');
  var recs = rows.slice(1).filter(function (r) { return r[ts] !== '' && r[js] !== ''; }).map(function (r) {
    var d = r[ts] instanceof Date ? r[ts] : new Date(r[ts]);
    return { d: d, week: wk >= 0 && r[wk] !== '' ? String(r[wk]) : ienIsoWeek(d), who: String(who >= 0 ? r[who] : ''), counts: typeof r[js] === 'string' ? JSON.parse(r[js]) : r[js] };
  });
  if (!recs.length) return { week: null, counts: {} };
  recs.sort(function (a, b) { return a.d - b.d; });
  var week = recs[recs.length - 1].week, latest = {};
  recs.forEach(function (r) { if (r.week === week) latest[r.who] = r; });   // newest per person wins
  var counts = {};
  Object.keys(latest).forEach(function (p) {
    var cs = latest[p].counts || {};
    Object.keys(cs).forEach(function (id) {
      counts[id] = counts[id] || {};
      Object.keys(cs[id] || {}).forEach(function (k) { counts[id][k] = (counts[id][k] || 0) + (Number(cs[id][k]) || 0); });
    });
  });
  return { week: week, counts: counts };
}
/** Catalog rows -> { name(lower common): botanical } (Botanical column, or "Common (Botanical)" in Name) */
function ienCatalogBotanical(rows) {
  var h = rows[0].map(ienHdr_), n = h.indexOf('name') >= 0 ? h.indexOf('name') : 1, b = h.indexOf('botanical'), o = {};
  rows.slice(1).forEach(function (r) { var nm = String(r[n] || ''), m = nm.match(/\((.*)\)/); if (nm) o[ienCommon_(nm)] = (b >= 0 && r[b]) ? String(r[b]) : (m ? m[1] : ''); });
  return o;
}
/** Catalog rows -> { id: name } */
function ienCatalog(rows) {
  var h = rows[0].map(ienHdr_), i = h.indexOf('id') >= 0 ? h.indexOf('id') : 0, n = h.indexOf('name') >= 0 ? h.indexOf('name') : (h.indexOf('commonname') >= 0 ? h.indexOf('commonname') : 1), o = {};
  rows.slice(1).forEach(function (r) { if (r[i] !== '') o[String(r[i])] = String(r[n]); });
  return o;
}
/** Convert aggregated id counts to getAvailableStock() shape { name: { '4"': n, '1 gal': n } } */
function ienCountsByName(agg, catalog) {
  var out = {};
  Object.keys(agg.counts).forEach(function (id) {
    var name = catalog[id] || id, o = out[name] = {};
    Object.keys(agg.counts[id]).forEach(function (k) { var z = ienNormSize(k); if (z) o[z] = agg.counts[id][k]; });
  });
  return out;
}
/** stock {name:{size:n}} minus Sold rows (incl. header) with the given week. */
function ienSubtractSold(stock, soldRows, week) {
  var out = JSON.parse(JSON.stringify(stock || {}));
  if (!soldRows || soldRows.length < 2) return out;
  var h = soldRows[0].map(ienHdr_), W = h.indexOf('week'), P = h.indexOf('plant'), S = h.indexOf('sizekey'), Q = h.indexOf('qty');
  soldRows.slice(1).forEach(function (r) {
    if (String(r[W]) !== String(week)) return;
    var z = ienNormSize(r[S]), key = null;
    for (var k in out) if (ienCommon_(k) === ienCommon_(r[P])) { key = k; break; }
    if (!key || !z) return;
    out[key][z] = (Number(out[key][z]) || 0) - (Number(r[Q]) || 0);
  });
  return out;
}
/** Validate invoice lines against available stock. Returns {ok} or {ok:false,error}. */
function ienCheckLines(avail, lines) {
  var need = {}, probs = [];
  (lines || []).forEach(function (l) {
    var z = ienNormSize(l.size), q = parseInt(l.qty, 10) || 0, key = null;
    for (var k in avail) if (ienCommon_(k) === ienCommon_(l.plant)) { key = k; break; }
    var nk = ienCommon_(l.plant) + '|' + z; need[nk] = (need[nk] || 0) + q;
    var have = key && z ? Number(avail[key][z]) || 0 : 0;
    if (need[nk] > have) probs.push(String(l.plant).split(' (')[0] + ' (' + (z || l.size) + '): only ' + Math.max(0, have) + ' left');
  });
  return probs.length ? { ok: false, error: 'Not enough stock: ' + probs.join('; ') } : { ok: true };
}

// ---------- Apps Script glue ----------
var INVENTORY_SS_NAME = 'IENN Inventory';
function ienSS_() {
  if (INVENTORY_SS_ID) return SpreadsheetApp.openById(INVENTORY_SS_ID);
  var a = null; try { a = SpreadsheetApp.getActive(); } catch (x) {}
  if (a && a.getSheetByName(SUBMISSIONS_SHEET)) return a;
  var it = DriveApp.getFilesByName(INVENTORY_SS_NAME);
  if (it.hasNext()) { var ss = SpreadsheetApp.open(it.next()); INVENTORY_SS_ID = ss.getId(); return ss; }
  throw new Error('IENN Inventory spreadsheet not found — set INVENTORY_SS_ID');
}
function ienSoldSheet_() { var ss = ienSS_(), s = ss.getSheetByName(SOLD_SHEET); if (!s) { s = ss.insertSheet(SOLD_SHEET); s.appendRow(SOLD_HEADERS); } return s; }
function ienLatestWeek_() { var s = ienSS_().getSheetByName(SUBMISSIONS_SHEET); return s ? ienAggregateSubmissions(s.getDataRange().getValues()) : { week: null, counts: {} }; }
function ienRawStock_(agg) {
  if (typeof getAvailableStockRaw_ === 'function') return getAvailableStockRaw_();   // existing aggregation (E1)
  return ienCountsByName(agg, ienCatalog(ienSS_().getSheetByName(CATALOG_SHEET).getDataRange().getValues()));
}
function ienAvailableNow_() {
  var agg = ienLatestWeek_();
  return { week: agg.week, stock: ienSubtractSold(ienRawStock_(agg), ienSoldSheet_().getDataRange().getValues(), agg.week) };
}

/** Replaces the existing name (see E1): live stock after deductions, same shape as before. */
function getAvailableStock() { return ienAvailableNow_().stock; }

/** Replaces the existing name (see E2). Used by the customer view, internal view and the website POST. */
function submitInvoice(data, opt) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Busy — please try again in a moment.');
  try {
    var now = ienAvailableNow_(), chk = ienCheckLines(now.stock, data && data.lines);
    if (!chk.ok) throw new Error(chk.error);
    var res = submitInvoiceOriginal_(data);                 // existing: writes IENN Invoices + emails team
    var id = (res && (res.invoiceNumber || res.number || res.id)) || (typeof res === 'string' || typeof res === 'number' ? res : '') ||
             ('WEB-' + Utilities.formatDate(new Date(), IENN_TZ, 'yyMMdd-HHmmss'));
    var catalog = {}; try { var c = ienCatalog(ienSS_().getSheetByName(CATALOG_SHEET).getDataRange().getValues()); for (var k in c) catalog[ienCommon_(c[k])] = k; } catch (x) {}
    var rows = data.lines.map(function (l) {
      var z = ienNormSize(l.size);
      return [String(id), new Date(), now.week, catalog[ienCommon_(l.plant)] || '', l.plant, IENN_SIZE_KEYS[z] || l.size, parseInt(l.qty, 10) || 0,
              (opt && opt.source) || 'invoice', opt && opt.customer ? JSON.stringify(opt.customer) : ''];
    });
    var s = ienSoldSheet_(); s.getRange(s.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    SpreadsheetApp.flush();
    if (res && typeof res === 'object') { res.orderId = res.orderId || String(id); return res; }
    return res != null && res !== '' ? res : { orderId: String(id) };
  } finally { lock.releaseLock(); }
}

if (typeof module !== 'undefined') module.exports = { ienNormSize: ienNormSize, ienPrice: ienPrice, ienTax: ienTax, ienIsoWeek: ienIsoWeek,
  ienAggregateSubmissions: ienAggregateSubmissions, ienCatalog: ienCatalog, ienCountsByName: ienCountsByName, ienSubtractSold: ienSubtractSold, ienCheckLines: ienCheckLines, ienCatalogBotanical: ienCatalogBotanical, IENN_SIZES: IENN_SIZES, IENN_TAX_PCT: IENN_TAX_PCT, IENN_SIZE_PRICES: IENN_SIZE_PRICES };
