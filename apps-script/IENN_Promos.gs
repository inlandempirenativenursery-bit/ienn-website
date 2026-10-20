/**
 * Promo banner feed.  GET ?view=promos -> {ok:true, today:'yyyy-MM-dd', promos:[{title,message,discount,start,end,pages}]}
 * Reads an optional "Promos" tab in the same spreadsheet (no tab = no promos, never an error).
 * Columns (header row 1, any order, case-insensitive): Active | Title | Message | Start date | End date | Discount note | Pages
 *   Active: yes/no (also y/true/1/x). Dates: inclusive, Pacific time; blank start = from now, blank end = no end.
 *   Pages: order / home / all (blank = all).
 * Only the FIRST active row whose range includes today is returned (top row wins), so the team controls priority by row order.
 */
var IENN_PROMOS_SHEET = 'Promos';
var IENN_PROMO_TZ = 'America/Los_Angeles';

function iennPromoDay_(v) {
  if (v === '' || v == null) return '';
  if (v instanceof Date) return isNaN(v) ? '' : Utilities.formatDate(v, IENN_PROMO_TZ, 'yyyy-MM-dd');
  var s = String(v).trim(), m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s) || null, u;
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((u = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return u[3] + '-' + ('0' + u[1]).slice(-2) + '-' + ('0' + u[2]).slice(-2);
  var d = iennDate_(s); return d ? Utilities.formatDate(d, IENN_PROMO_TZ, 'yyyy-MM-dd') : '';
}

function iennPromos(now) {
  var today = iennPromoDay_(now || new Date()), sh = iennSs_().getSheetByName(IENN_PROMOS_SHEET), out = { ok: true, today: today, promos: [] };
  if (!sh) return out;
  var rows = sh.getDataRange().getValues(); if (rows.length < 2) return out;
  var h = rows[0], c = {
    active: iennCol_(h, ['Active', 'On']), title: iennCol_(h, ['Title']), message: iennCol_(h, ['Message', 'Text']),
    start: iennCol_(h, ['Start date', 'Start']), end: iennCol_(h, ['End date', 'End']),
    discount: iennCol_(h, ['Discount note', 'Discount']), pages: iennCol_(h, ['Pages', 'Page']) };
  if (c.active < 0 || c.title < 0) return out;
  var get = function (r, k) { return c[k] < 0 ? '' : String(r[c[k]] == null ? '' : r[c[k]]).trim(); };
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!/^(yes|y|true|1|x|on)$/i.test(get(r, 'active')) || !get(r, 'title')) continue;
    var st = c.start < 0 ? '' : iennPromoDay_(r[c.start]), en = c.end < 0 ? '' : iennPromoDay_(r[c.end]);
    if ((st && today < st) || (en && today > en)) continue;
    var pg = get(r, 'pages').toLowerCase(); pg = /order/.test(pg) ? 'order' : /home|index/.test(pg) ? 'home' : 'all';
    var disc = get(r, 'discount'); if (/^\[.*\]$/.test(disc)) disc = '';   // "[Eric to fill]" placeholders never go public
    out.promos.push({ title: get(r, 'title'), message: get(r, 'message'), discount: disc, start: st, end: en, pages: pg });
    break;
  }
  return out;
}
