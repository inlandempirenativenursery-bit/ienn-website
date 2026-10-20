/**
 * Promo banner data for the website (sheet tab "Promos" in the IENN Inventory spreadsheet).
 * Columns: Active | Title | Message | Start date | End date | Discount note (optional)
 * Rule: the FIRST row with Active = yes/TRUE whose Start..End range includes today (America/Los_Angeles, both dates inclusive).
 * The result rides along in the existing ?view=inventory feed as `promo` (object or null). No new endpoint.
 * Run iennSetup() (or iennPromoSheet_()) once to create the tab with headers + 3 example rows (all Active = no).
 */
var IENN_PROMO_SHEET = 'Promos';
var IENN_PROMO_TZ = 'America/Los_Angeles';
var IENN_PROMO_HEADERS = ['Active', 'Title', 'Message', 'Start date', 'End date', 'Discount note (optional)'];
var IENN_PROMO_EXAMPLES = [
  ['no', 'Fall Sale', 'EXAMPLE — replace this text. Fall planting season is here: stock up before the rains.', '2026-11-01', '2026-11-30', 'EXAMPLE — e.g. 10% off 1 gal'],
  ['no', 'Spring Sale', 'EXAMPLE — replace this text. Spring bloomers are ready for pickup.', '2027-03-01', '2027-04-30', ''],
  ['no', 'Summer Sale', 'EXAMPLE — replace this text. Summer deals on drought-tough natives.', '2027-06-01', '2027-07-31', '']
];

/** Get the Promos tab, creating it (headers + example rows) if missing. */
function iennPromoSheet_() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(IENN_PROMO_SHEET);
  if (sh) return sh;
  sh = ss.insertSheet(IENN_PROMO_SHEET);
  sh.appendRow(IENN_PROMO_HEADERS);
  IENN_PROMO_EXAMPLES.forEach(function (r) { sh.appendRow(r); });
  sh.setFrozenRows(1);
  return sh;
}

/** Normalize a sheet cell to 'yyyy-MM-dd' (Date objects, 'yyyy-MM-dd', 'M/d/yyyy'). '' if unreadable. */
function iennPromoDay_(v) {
  if (v instanceof Date || (v && typeof v.getTime === 'function')) return isNaN(v.getTime()) ? '' : Utilities.formatDate(v, IENN_PROMO_TZ, 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim(), m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  return '';
}
function iennPromoActive_(v) { return v === true || /^(yes|y|true|on|1|x)$/i.test(String(v == null ? '' : v).trim()); }

/** Pure: rows (without header) + today 'yyyy-MM-dd' -> promo object or null. */
function iennPromoPick_(rows, today) {
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || [], title = String(r[1] || '').trim(), a = iennPromoDay_(r[3]), b = iennPromoDay_(r[4]);
    if (!iennPromoActive_(r[0]) || !title || !a || !b) continue;
    if (today >= a && today <= b) return { title: title, message: String(r[2] || '').trim(), start: a, end: b, discountNote: String(r[5] || '').trim() || null };
  }
  return null;
}
function iennPromoToday_() { return Utilities.formatDate(new Date(typeof __now === 'function' ? __now() : Date.now()), IENN_PROMO_TZ, 'yyyy-MM-dd'); }

/** Feed value. Read-only on GET: a missing tab just means no promo (create it with iennSetup). */
function iennPromo_() {
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(IENN_PROMO_SHEET); if (!sh) return null;
    return iennPromoPick_(sh.getDataRange().getValues().slice(1), iennPromoToday_());
  } catch (err) { return null; }   // a broken promo row must never break the inventory feed
}
