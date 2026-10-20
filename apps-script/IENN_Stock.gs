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

/** Latest count date in Submissions (Date or null). */
function iennBaselineDate_() {
  var sh = iennSs_().getSheetByName(IENN_SUBMISSIONS_SHEET); if (!sh) return null;
  var v = sh.getDataRange().getValues(), c = iennCol_(v[0] || [], SUBMISSION_DATE_HEADERS); if (c < 0) return null;
  var best = null;
  for (var i = 1; i < v.length; i++) { var d = iennDate_(v[i][c]); if (d && (!best || d > best)) best = d; }
  return best;
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

/** { plantKey: { '4"': n, '1 gal': n } } after subtracting sales since the latest count. */
function iennAvailable_() {
  var base = getAvailableStock() || {}, sold = iennSoldSince_(iennBaselineDate_()), out = {};
  Object.keys(base).forEach(function (name) {
    var k = iennKey_(name); out[k] = out[k] || {};
    IENN_SIZES.forEach(function (s) { if (s.tracked) out[k][s.key] = (out[k][s.key] || 0) + Number((base[name] || {})[s.key] || 0); });
  });
  Object.keys(out).forEach(function (k) { IENN_SIZES.forEach(function (s) { if (s.tracked) out[k][s.key] = Math.max(0, out[k][s.key] - (sold[k + '|' + s.key] || 0)); }); });
  return out;
}

function iennCatalogNames_() {
  var sh = iennSs_().getSheetByName(IENN_CATALOG_SHEET); if (!sh) return [];
  var v = sh.getDataRange().getValues(), c = iennCol_(v[0] || [], CATALOG_NAME_HEADERS); if (c < 0) return [];
  return v.slice(1).map(function (r) { return String(r[c] || '').trim(); }).filter(String);
}
/** Optional Photo column in Catalog: { plantKey: url }. Missing column -> {} (website uses assets/plants/<id>.jpg). */
function iennCatalogPhotos_() {
  var sh = iennSs_().getSheetByName(IENN_CATALOG_SHEET); if (!sh) return {};
  var v = sh.getDataRange().getValues(), h = v[0] || [], c = iennCol_(h, CATALOG_NAME_HEADERS), ph = iennCol_(h, CATALOG_PHOTO_HEADERS), out = {};
  if (c < 0 || ph < 0) return out;
  v.slice(1).forEach(function (r) { var n = String(r[c] || '').trim(), u = String(r[ph] || '').trim(); if (n && u) out[iennKey_(n)] = u; });
  return out;
}
