/** IENN — Promos tab -> `promo` in ?view=inventory JSON. Config in IENN_Config.gs. */

/** 'yyyy-MM-dd' for a sheet cell (Date or text like 2026-11-01, 11/1/2026); '' if blank/unreadable. */
function iennPromoDay_(v) {
  if (v === '' || v == null) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? '' : Utilities.formatDate(v, IENN_PROMO_TZ, 'yyyy-MM-dd');
  var s = String(v).trim(), m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) return (m[3].length == 2 ? '20' + m[3] : m[3]) + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  return null; // present but unreadable -> row ignored
}
/** 'a | b' or multi-line text -> ['a', 'b'] (blank lines dropped). */
function iennPromoLines_(s) { return String(s || '').split(/\r?\n|\s+\|\s+/).map(function (x) { return x.trim(); }).filter(String); }
function iennPromoActive_(v) { return /^(yes|y|true|on|1|x|✓)$/i.test(String(v == null ? '' : v).trim()) || v === true; }

/** Pure: first active in-range promo from sheet values (header row first), or null. today = 'yyyy-MM-dd'. */
function iennPickPromo_(values, today) {
  if (!values || values.length < 2) return null;
  var h = values[0], c = { a: iennCol_(h, PROMO_ACTIVE_HEADERS), t: iennCol_(h, PROMO_TITLE_HEADERS), m: iennCol_(h, PROMO_MESSAGE_HEADERS),
    s: iennCol_(h, PROMO_START_HEADERS), e: iennCol_(h, PROMO_END_HEADERS), d: iennCol_(h, PROMO_DISCOUNT_HEADERS), b: iennCol_(h, PROMO_BOTTOM_HEADERS) };
  if (c.a < 0 || c.t < 0) return null;
  for (var i = 1; i < values.length; i++) {
    var r = values[i], get = function (k) { return c[k] < 0 ? '' : r[c[k]]; };
    if (!iennPromoActive_(get('a'))) continue;
    var title = String(get('t') || '').trim(); if (!title) continue;
    var s = iennPromoDay_(get('s')), e = iennPromoDay_(get('e'));
    if (s === null || e === null) continue;
    if ((s && today < s) || (e && today > e)) continue;
    return { title: title, message: String(get('m') || '').trim(), start: s, end: e, discountNote: String(get('d') || '').trim(),
      bottomInfo: iennPromoLines_(String(get('b') || '').trim() || IENN_PROMO_BOTTOM_DEFAULT) };
  }
  return null;
}

/** Current promo or null. Missing tab or any error -> null (never breaks inventory). */
function iennPromo_(now) {
  try {
    var sh = iennSs_().getSheetByName(IENN_PROMOS_SHEET); if (!sh) return null;
    return iennPickPromo_(sh.getDataRange().getValues(), Utilities.formatDate(now || new Date(), IENN_PROMO_TZ, 'yyyy-MM-dd'));
  } catch (err) { return null; }
}

/** Creates the Promos tab with headers + example rows (Active = No) if missing. Called by iennSetup(). */
function iennEnsurePromos_() {
  var ss = iennSs_(), sh = ss.getSheetByName(IENN_PROMOS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(IENN_PROMOS_SHEET);
    sh.getRange(1, 1, 1 + IENN_PROMO_EXAMPLES.length, IENN_PROMO_HEADERS.length).setValues([IENN_PROMO_HEADERS].concat(IENN_PROMO_EXAMPLES));
    sh.setFrozenRows(1);
    return sh;
  }
  // Existing tab: add a "Bottom info" column at the end if missing. Rows are not moved; only the example rows get the default text.
  var v = sh.getDataRange().getValues(), h = v[0] || [];
  if (iennCol_(h, PROMO_BOTTOM_HEADERS) < 0) {
    var col = h.length + 1, t = iennCol_(h, PROMO_TITLE_HEADERS), ex = {};
    IENN_PROMO_EXAMPLES.forEach(function (r) { ex[String(r[1]).toLowerCase()] = 1; });
    sh.getRange(1, col).setValue('Bottom info');
    for (var i = 1; i < v.length; i++) if (t >= 0 && ex[String(v[i][t]).trim().toLowerCase()] && /^EXAMPLE/.test(String(v[i][iennCol_(h, PROMO_MESSAGE_HEADERS)] || ''))) sh.getRange(i + 1, col).setValue(IENN_PROMO_BOTTOM_DEFAULT);
  }
  return sh;
}
