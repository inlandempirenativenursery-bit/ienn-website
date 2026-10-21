/**
 * Available stock = latest weekly counts (existing getAvailableStock) minus units sold since that count.
 * "Sold since" comes from IENN Invoices rows dated after the latest Submissions date (no new sheets).
 * A new weekly count moves the baseline forward, so earlier sales stop being subtracted (the count already reflects them).
 * Invoices with Status "Cancelled" are not subtracted.
 */
function iennSs_() { return IENN_INVENTORY_SPREADSHEET_ID ? SpreadsheetApp.openById(IENN_INVENTORY_SPREADSHEET_ID) : SpreadsheetApp.getActive(); }
function iennNorm_(h) { return String(h == null ? '' : h).toLowerCase().replace(/[^a-z0-9#]/g, ''); }
function iennCol_(head, aliases) { var w = aliases.map(iennNorm_); for (var i = 0; i < head.length; i++) if (w.indexOf(iennNorm_(head[i])) >= 0) return i; return -1; }
function iennSplit_(full) { var m = /^(.*?)\s*\((.*)\)\s*$/.exec(String(full)); return m ? [m[1].trim(), m[2].trim()] : [String(full).trim(), '']; }
function iennKey_(name) { return iennSplit_(name)[0].toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function iennDate_(v) { var d = v instanceof Date ? v : (v ? new Date(v) : null); return d && !isNaN(d) ? d : null; }
/** Forgiving size match: 4" / 4 inch / 4in / 4-inch pot -> '4"'; 1 gallon -> '1 gal'; quarter tree pot -> 'Tree pot'. */
function iennSize_(s) {
  for (var i = 0; i < IENN_SIZES.length; i++) if (IENN_SIZES[i].key === s) return IENN_SIZES[i];
  var n = String(s == null ? '' : s).toLowerCase().replace(/[\u201c\u201d\u2033"]|''/g, 'in').replace(/inch(es)?/g, 'in')
    .replace(/gallons?|gal\.?/g, 'gal').replace(/quarter|qtr|1\/4/g, '').replace(/pots?/g, '').replace(/[^a-z0-9]/g, '');
  var key = { '2in': '2"', '4in': '4"', 'tree': 'Tree pot', '1gal': '1 gal', 'onegal': '1 gal' }[n];
  for (var j = 0; j < IENN_SIZES.length; j++) if (IENN_SIZES[j].key === key) return IENN_SIZES[j];
  return null;
}

/** Is size s stock-tracked for this availability map? Always-tracked sizes (4", 1 gal) yes; optional sizes (2", Tree pot)
    only when the newest count has data for them (avail.__counted). */
function iennTracked_(s, avail) { return !!(s && (s.tracked || (avail && avail.__counted && avail.__counted[s.key]))); }

/** Latest count date in Submissions (Date or null). */
function iennBaselineDate_() {
  var sh = iennSs_().getSheetByName(IENN_SUBMISSIONS_SHEET); if (!sh) return null;
  var v = sh.getDataRange().getValues(), head = v[0] || [];
  for (var a = 0; a < SUBMISSION_DATE_HEADERS.length; a++) {            // alias priority: first column with readable dates wins
    var c = iennCol_(head, [SUBMISSION_DATE_HEADERS[a]]), best = null; if (c < 0) continue;
    for (var i = 1; i < v.length; i++) { var x = v[i][c], d = typeof x === 'number' ? new Date(x) : iennDate_(x); if (d && (!best || d > best)) best = d; }
    if (best) return best;
  }
  return null;
}

function iennInvoicesSheet_() {
  var ss = IENN_INVOICES_SPREADSHEET_ID ? SpreadsheetApp.openById(IENN_INVOICES_SPREADSHEET_ID) : iennSs_();
  var sh = ss.getSheetByName(IENN_INVOICES_SHEET);
  if (!sh) throw new Error('Tab "' + IENN_INVOICES_SHEET + '" not found');
  return sh;
}

/** Reads IENN Invoices into [{row, id, date, email, note, paid, payment, status, handledBy, response, lines:[{plant,size,qty}]}].
    Adds the Status / Handled by / Our response columns if missing (only change to existing sheets). */
function iennInvoices_() {
  var sh = iennInvoicesSheet_(), v = sh.getDataRange().getValues(), head = (v[0] || []).slice();
  var add = IENN_STATUS_COLUMNS.filter(function (h) { return iennCol_(head, [h]) < 0; });
  if (add.length && head.length) { sh.getRange(1, head.length + 1, 1, add.length).setValues([add]); head = head.concat(add); }
  var c = { id: iennCol_(head, INVOICE_ID_HEADERS), date: iennCol_(head, INVOICE_DATE_HEADERS), email: iennCol_(head, INVOICE_EMAIL_HEADERS),
    note: iennCol_(head, INVOICE_NOTE_HEADERS), lines: iennCol_(head, INVOICE_LINES_HEADERS), plant: iennCol_(head, INVOICE_PLANT_HEADERS),
    size: iennCol_(head, INVOICE_SIZE_HEADERS), qty: iennCol_(head, INVOICE_QTY_HEADERS), paid: iennCol_(head, INVOICE_PAID_HEADERS),
    payment: iennCol_(head, INVOICE_PAYMENT_HEADERS), status: iennCol_(head, ['Status']), handled: iennCol_(head, ['Handled by']), response: iennCol_(head, ['Our response']) };
  var g = function (r, k) { return c[k] >= 0 ? r[c[k]] : ''; }, byId = {}, out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i], lines = [];
    if (c.lines >= 0 && r[c.lines]) { try { lines = JSON.parse(r[c.lines]).map(function (l) { return { plant: l.plant, size: l.size, qty: Number(l.qty || 0), amt: l.amt }; }); } catch (e) { lines = []; } }
    else if (c.plant >= 0 && r[c.plant]) lines = [{ plant: r[c.plant], size: g(r, 'size'), qty: Number(g(r, 'qty') || 0) }];
    var id = String(g(r, 'id') || 'row' + (i + 1)), inv = byId[id];
    if (!inv) { inv = byId[id] = { row: i + 1, id: id, date: iennDate_(g(r, 'date')), email: g(r, 'email'), note: g(r, 'note'), paid: g(r, 'paid'),
      payment: g(r, 'payment'), status: g(r, 'status') || 'New', handledBy: g(r, 'handled'), response: g(r, 'response'), lines: [] }; out.push(inv); }
    inv.lines = inv.lines.concat(lines);
  }
  out.cols = c; out.sheet = sh;
  return out;
}

/** { plantKey|sizeKey : units on invoices dated after the baseline, excluding Cancelled } */
function iennSoldSince_(baseline) {
  var out = {};
  iennInvoices_().forEach(function (inv) {
    if (/cancel/i.test(String(inv.status))) return;
    if (baseline && !(inv.date && inv.date > baseline)) return;
    inv.lines.forEach(function (l) { var s = iennSize_(l.size); if (!s) return; var k = iennKey_(l.plant) + '|' + s.key; out[k] = (out[k] || 0) + l.qty; });
  });
  return out;
}

/** { plantKey: { '4"': readyLeft, '1 gal': readyLeft, ['2"', 'Tree pot' when counted,] __extra: { sizeKey: n } } }.
    Ready = <size>Ready (missing key -> on hand) minus units sold since the latest count. out.__counted (non-enumerable) lists optional sizes the newest count covers.
    __extra = on hand minus ready, floored at 0 (smaller plants not retail-ready yet). */
function iennAvailable_(baseline) {
  if (baseline === undefined) baseline = iennBaselineDate_();
  var out = {}; if (!baseline) { out.__noBaseline = true; return out; }   // no count yet: every tracked qty is unknown (null), never 0
  var base = (typeof iennStockDetail_ === 'function' ? iennStockDetail_() : null), sold = iennSoldSince_(baseline), counted = (base && base.__counted) || {};
  Object.defineProperty(out, '__counted', { value: counted, enumerable: false });
  var tracked = function (s) { return s.tracked || !!counted[s.key]; };
  if (!base) { base = {}; var g = getAvailableStock() || {}; Object.keys(g).forEach(function (n) { base[n] = {}; Object.keys(g[n]).forEach(function (z) { base[n][z] = { ready: Number(g[n][z]) || 0, onHand: Number(g[n][z]) || 0 }; }); }); }
  Object.keys(base).forEach(function (name) {
    var k = iennKey_(name); out[k] = out[k] || { __extra: {} };
    IENN_SIZES.forEach(function (s) { if (!tracked(s)) return; var c = (base[name] || {})[s.key] || { ready: 0, onHand: 0 };
      out[k][s.key] = (out[k][s.key] || 0) + c.ready; out[k].__extra[s.key] = (out[k].__extra[s.key] || 0) + Math.max(0, c.onHand - c.ready); });
  });
  Object.keys(out).forEach(function (k) { IENN_SIZES.forEach(function (s) { if (tracked(s)) out[k][s.key] = Math.max(0, out[k][s.key] - (sold[k + '|' + s.key] || 0)); }); });
  return out;
}

/** Checks order lines against iennAvailable_ output. Returns {problems:[...], notices:[...], message}.
    qty <= ready ok; ready < qty <= ready+extra accepted as a partial request (notice); more -> problem. */
function iennStockCheck_(lines, avail) {
  var need = {}, problems = [], notices = [];
  if (!avail || avail.__noBaseline) return { problems: problems, notices: notices, message: '' };
  (lines || []).forEach(function (l) {
    var s = iennSize_(l.size); if (!iennTracked_(s, avail)) return;
    var k = iennKey_(l.plant) + '|' + s.key; need[k] = need[k] || { plant: iennSplit_(l.plant)[0], s: s, qty: 0 }; need[k].qty += Number(l.qty || 0);
  });
  Object.keys(need).forEach(function (k) {
    var n = need[k], row = avail[k.split('|')[0]], have = row ? row[n.s.key] : 0;
    if (row && (have === null || have === undefined)) return;
    var ready = Number(have) || 0, extra = row && row.__extra ? Number(row.__extra[n.s.key]) || 0 : 0;
    if (n.qty <= ready) return;
    if (n.qty <= ready + extra) { notices.push({ plant: n.plant, sizeKey: n.s.key, size: n.s.label, requested: n.qty, ready: ready, extra: extra,
      message: 'We have ' + ready + ' ready now. We may have a few smaller ones; Andrew will reach out about the extra.' }); return; }
    problems.push({ plant: n.plant, sizeKey: n.s.key, size: n.s.label, requested: n.qty, available: ready, ready: ready, extra: extra,
      message: (ready === 0 && extra === 0) ? n.plant + ' (' + n.s.label + ') is not available.'
        : 'Only ' + ready + ' ' + n.plant + ' (' + n.s.label + ') available' + (extra > 0 ? ' plus a few smaller ones' : '') + ' — you asked for ' + n.qty + '.' });
  });
  return { problems: problems, notices: notices, message: problems.map(function (p) { return p.message; }).join(' ') };
}
/** Internal invoice/alert note lines for partial requests. */
function iennRequestNote_(notices) {
  return (notices || []).map(function (n) { return 'REQUEST: ' + n.plant + ' (' + n.size + ') customer wants ' + n.requested + ', only ' + n.ready +
    ' retail-ready; up to ' + n.extra + ' smaller ones on hand. Offer the smaller ones.'; }).join('\n');
}

function iennCatalogNames_() {
  var sh = iennSs_().getSheetByName(IENN_CATALOG_SHEET); if (!sh) return [];
  var v = sh.getDataRange().getValues(), c = iennCol_(v[0] || [], CATALOG_NAME_HEADERS), l = iennCol_(v[0] || [], CATALOG_LATIN_HEADERS); if (c < 0) return [];
  return v.slice(1).map(function (r) { var n = String(r[c] || '').trim(), b = l >= 0 ? String(r[l] || '').trim() : '';
    return n && b && !/\(/.test(n) ? n + ' (' + b + ')' : n; }).filter(String);
}
/** Optional Photo column in Catalog: { plantKey: url }. Missing column -> {} (website uses assets/plants/<id>.jpg). */
function iennCatalogPhotos_() {
  var sh = iennSs_().getSheetByName(IENN_CATALOG_SHEET); if (!sh) return {};
  var v = sh.getDataRange().getValues(), h = v[0] || [], c = iennCol_(h, CATALOG_NAME_HEADERS), ph = iennCol_(h, CATALOG_PHOTO_HEADERS), out = {};
  if (c < 0 || ph < 0) return out;
  v.slice(1).forEach(function (r) { var n = String(r[c] || '').trim(), u = String(r[ph] || '').trim(); if (n && u) out[iennKey_(n)] = u; });
  return out;
}

/** Pin column in Catalog: { plantKey: { num: Number|null, row: i } }. Missing column -> {}. */
function iennPinValue_(x) {
  var t = String(x == null ? '' : x).trim(); if (!t || /^(no|n|false)$/i.test(t)) return null;
  var n = Number(t); return { num: isFinite(n) ? n : null };
}
function iennCatalogPins_() {
  var sh = iennSs_().getSheetByName(IENN_CATALOG_SHEET); if (!sh) return {};
  var v = sh.getDataRange().getValues(), h = v[0] || [], c = iennCol_(h, CATALOG_NAME_HEADERS), pc = iennCol_(h, CATALOG_PIN_HEADERS), out = {};
  if (c < 0 || pc < 0) return out;
  v.slice(1).forEach(function (r, i) { var n = String(r[c] || '').trim(), p = iennPinValue_(r[pc]); if (n && p && !out[iennKey_(n)]) { p.row = i; out[iennKey_(n)] = p; } });
  return out;
}
/** Badge column in Catalog: { plantKey: 'trimmed text' } (non-blank only). Missing column -> {}. */
function iennCatalogBadges_() {
  var sh = iennSs_().getSheetByName(IENN_CATALOG_SHEET); if (!sh) return {};
  var v = sh.getDataRange().getValues(), h = v[0] || [], c = iennCol_(h, CATALOG_NAME_HEADERS), bc = iennCol_(h, CATALOG_BADGE_HEADERS), out = {};
  if (c < 0 || bc < 0) return out;
  v.slice(1).forEach(function (r) { var n = String(r[c] || '').trim(), b = String(r[bc] == null ? '' : r[bc]).trim(); if (n && b && !(iennKey_(n) in out)) out[iennKey_(n)] = b; });
  return out;
}
/** Adds `header` to the right of Catalog if no column matching `aliases` exists. Changes nothing else. */
function iennEnsureCatalogCol_(aliases, header) {
  var sh = iennSs_().getSheetByName(IENN_CATALOG_SHEET); if (!sh) return false;
  var head = sh.getDataRange().getValues()[0] || [];
  if (!head.length || iennCol_(head, aliases) >= 0) return false;
  var last = head.length; while (last > 0 && String(head[last - 1]) === '') last--;
  sh.getRange(1, last + 1).setValue(header); return true;
}
/** Adds the "Pin" header to the right of Catalog if no Pin/Featured column exists. Changes nothing else. */
function iennEnsureCatalogPin_() { return iennEnsureCatalogCol_(CATALOG_PIN_HEADERS, IENN_PIN_HEADER); }
/** Adds the "Badge" header to the right of Catalog if missing. Changes nothing else. */
function iennEnsureCatalogBadge_() { return iennEnsureCatalogCol_(CATALOG_BADGE_HEADERS, IENN_BADGE_HEADER); }
/** { plantKey: units ordered in the last IENN_POPULAR_DAYS days }, Cancelled excluded, all sizes. */
function iennPopularity_() {
  var since = new Date(Date.now() - IENN_POPULAR_DAYS * 86400000), out = {};
  iennInvoices_().forEach(function (inv) {
    if (/cancel/i.test(String(inv.status)) || !(inv.date && inv.date >= since)) return;
    inv.lines.forEach(function (l) { var k = iennKey_(l.plant), q = Number(l.qty) || 0; if (k && q > 0) out[k] = (out[k] || 0) + q; });
  });
  return out;
}
/** Pinned (pin number, then text pins in Catalog order), then by 90-day units desc, then current order (stable). Adds rank/popularity/pinned. */
function iennSortPlants_(plants) {
  var pins = iennCatalogPins_(), pop = iennPopularity_(), badges = iennCatalogBadges_();
  var rows = plants.map(function (p, i) { var k = iennKey_(p.fullName), pin = pins[k] || pins[iennKey_(p.name)] || null;
    return { p: p, i: i, pin: pin, pop: pop[k] || 0 }; });
  rows.sort(function (a, b) {
    if (!!a.pin !== !!b.pin) return a.pin ? -1 : 1;
    if (a.pin) { var an = a.pin.num, bn = b.pin.num;
      if ((an === null) !== (bn === null)) return an === null ? 1 : -1;
      if (an !== null && an !== bn) return an - bn;
      if (a.pin.row !== b.pin.row) return a.pin.row - b.pin.row; return a.i - b.i; }
    if (a.pop !== b.pop) return b.pop - a.pop;
    return a.i - b.i;
  });
  return rows.map(function (r, n) { r.p.rank = n + 1; r.p.popularity = r.pop; r.p.pinned = !!r.pin;
    var bk = iennKey_(r.p.fullName); r.p.badge = (bk in badges) ? badges[bk] : (badges[iennKey_(r.p.name)] || ''); return r.p; });
}
