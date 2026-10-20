/**
 * IENN website + stock-decrement add-on for the EXISTING Apps Script project
 * (spreadsheet "IENN Inventory": sheets Submissions + Catalog; invoices in "IENN Invoices").
 * Existing functions: doGet, getSettings, saveTeamEmails, nextInvoiceNumber,
 * getAvailableStock, getInitial, submitInvoice, buildReceiptText.
 *
 * Goal: one system. Weekly Submissions counts stay untouched; every sale (website OR
 * internal Index invoice) is logged to a new "Sold" sheet, and
 *     available = latest-week aggregate (existing logic) - sold since that week.
 *
 * INSTALL (3 small edits, no logic rewritten):
 *  1. Paste this file as a new script file "website.gs".
 *  2. Rename the existing  function getAvailableStock(  ->  function getAvailableStockRaw_(
 *     and the existing     function submitInvoice(      ->  function submitInvoiceRaw_(
 *     The wrappers below take over those names, so the Index view, the customer view,
 *     getInitial() and the website all use the decremented stock automatically.
 *  3. First lines of the existing doGet:
 *        var web = ienWebsiteGet_(e); if (web) return web;
 *  doPost below is new. Then Deploy > Manage deployments > Edit > New version,
 *  Execute as "Me", access "Anyone".
 *
 * [TODO confirm] items (all in IENN_CFG):
 *  T1. getAvailableStockRaw_() returns { "<common name>": { '4"': n, '1 gal': n } }.
 *  T2. Submissions has a "Week" column (latest = max value); JSON keys four / gal1.
 *  T3. submitInvoiceRaw_(payload) takes { customer:{name,email,phone}, items:[{plant,size,qty,price}],
 *      notes, source } and returns { invoiceNo } (or the number) - adapt ienToInvoicePayload_ if not.
 *  T4. IENN Invoices column names used by buildResponseEmail (INVOICE_COLS).
 *  T5. 2" and Tree pot have no weekly counts -> shown as "available on request" (not orderable online).
 *  T6. TAXES: all prices INCLUDE sales tax (Eric). Nothing is added. If tax must be reported, back it
 *      out of the total (tax = total - total / (1 + rate)) at reporting time [TODO Eric: rate + method].
 *
 * CHANNELS: ONE public order path = the website (order.html -> doPost). The Index invoice tool is
 * team-only (phone orders, FB Marketplace, walk-ins). Both go through submitInvoice, so both land in
 * IENN Invoices and the Sold log. Source = "Website" or "Internal".
 * The old public customer view (?view=customer) should be retired or redirected to the website,
 * e.g. in doGet:  if (e.parameter.view === 'customer') return HtmlService.createHtmlOutput(
 *   '<script>window.top.location.href="' + IENN_CFG.WEBSITE_ORDER_URL + '"</script>');   [TODO Eric]
 *
 * ORDER-TO-PICKUP: Andrew owns it. Status flow New -> Claimed -> Confirmed -> Ready -> Picked up;
 * "Claimed by" defaults to Andrew. The team email goes to everyone and says Andrew claims it.
 */
var IENN_CFG = {
  SUBMISSIONS_SHEET: 'Submissions',
  CATALOG_SHEET: 'Catalog',
  SOLD_SHEET: 'Sold',                       // new; created automatically
  WEEK_COLUMN: 'Week',                      // [TODO confirm T2]
  CATALOG_ID_COL: 'id', CATALOG_NAME_COL: 'Common name', // [TODO confirm]
  COUNTED_SIZES: ['4"', '1 gal'],           // from Submissions JSON keys four / gal1
  ON_REQUEST_SIZES: ['2"', 'Tree pot'],     // [TODO confirm T5]
  PRICES: { '2"': 3, '4"': 6, 'Tree pot': 10, '1 gal': 15 },
  TAXES_INCLUDED: true,                     // prices include tax (T6)
  WEBSITE_ORDER_URL: '',                    // [TODO Eric] public URL of order.html (for redirecting ?view=customer)
  ORDER_OWNER: 'Andrew',
  OWNER_PHONE: '(909) 609-9373',
  STATUS_FLOW: ['New', 'Claimed', 'Confirmed', 'Ready', 'Picked up'],
  INVOICES_SPREADSHEET_ID: '',              // [TODO fill] IENN Invoices file id (for the team link + response email)
  INVOICES_SHEET: '',                       // [TODO fill] tab name inside IENN Invoices ('' = first tab)
  INVOICE_COLS: { id: 'Invoice #', name: 'Name', email: 'Email', items: 'Items', total: 'Total',
    notes: 'Notes', status: 'Status', claimedBy: 'Claimed by', source: 'Source', paid: 'Paid', method: 'Payment method',
    address: 'Pickup address', window: 'Pickup window', response: 'Our response' }, // [TODO confirm T4]
  WEBSITE_TEAM_NOTICE: true,  // extra short "New IENN order #id" email with link (existing submitInvoice email still sends)
  TEAM_EMAILS: []             // [TODO fill] only if getSettings() has none. No addresses invented.
};

/* ---------- helpers ---------- */
function ienHeaderIndex_(head) { var idx = {}; head.forEach(function (h, i) { idx[String(h).trim().toLowerCase()] = i; });
  return function (n) { var k = String(n).trim().toLowerCase(); return idx.hasOwnProperty(k) ? idx[k] : -1; }; }
function ienNum_(v) { var n = parseInt(String(v == null ? '' : v).replace(/[^0-9-]/g, ''), 10); return isNaN(n) || n < 0 ? 0 : n; }
function ienJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ienRound_(n) { return Math.round(n * 100) / 100; }
function ienKey_(name, size) { return String(name).trim().toLowerCase() + '|' + size; }

/* ---------- week + sold ledger ---------- */
function ienLatestWeek_() {
  var v = SpreadsheetApp.getActive().getSheetByName(IENN_CFG.SUBMISSIONS_SHEET).getDataRange().getValues();
  var c = ienHeaderIndex_(v[0])(IENN_CFG.WEEK_COLUMN), best = '';
  for (var r = 1; r < v.length; r++) { var w = v[r][c]; w = w instanceof Date ? w.toISOString().slice(0, 10) : String(w); if (w > best) best = w; }
  return best;
}
function ienSoldSheet_() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(IENN_CFG.SOLD_SHEET);
  if (!sh) { sh = ss.insertSheet(IENN_CFG.SOLD_SHEET); sh.appendRow(['Timestamp', 'Order/Invoice #', 'Plant', 'Size', 'Qty', 'Week', 'Source']); }
  return sh;
}
function ienSoldThisWeek_(week) {
  var v = ienSoldSheet_().getDataRange().getValues(), sold = {};
  for (var r = 1; r < v.length; r++) if (String(v[r][5]) === String(week)) { var k = ienKey_(v[r][2], v[r][3]); sold[k] = (sold[k] || 0) + ienNum_(v[r][4]); }
  return sold;
}

/* ---------- WRAPPER: getAvailableStock = raw latest-week counts - sold this week ---------- */
function getAvailableStock() {
  var raw = getAvailableStockRaw_() || {}, sold = ienSoldThisWeek_(ienLatestWeek_()), out = {};
  Object.keys(raw).forEach(function (name) {
    out[name] = {};
    Object.keys(raw[name] || {}).forEach(function (size) { out[name][size] = Math.max(0, ienNum_(raw[name][size]) - (sold[ienKey_(name, size)] || 0)); });
  });
  return out;
}

/* ---------- WRAPPER: submitInvoice = lock + oversell check + existing submit + log sale ---------- */
function submitInvoice(payload) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Busy, please try again.');
  try {
    var check = ienCheckStock_(payload.items || []);
    if (check.problems.length) { var err = new Error('OUT_OF_STOCK'); err.items = check.problems; throw err; }
    var res = submitInvoiceRaw_(payload);
    var no = res && typeof res === 'object' ? (res.invoiceNo || res.invoiceNumber || res.id) : res;
    var source = payload.source === 'Website' ? 'Website' : 'Internal';
    var week = ienLatestWeek_(), sh = ienSoldSheet_();
    check.lines.forEach(function (it) { sh.appendRow([new Date(), String(no), it.plant, it.size, it.qty, week, source]); });
    try { ienTagInvoice_(no, source); } catch (e) {}
    SpreadsheetApp.flush();
    return res;
  } finally { lock.releaseLock(); }
}
function ienCheckStock_(items) {
  var stock = getAvailableStock(), lower = {}, merged = {}, problems = [];
  Object.keys(stock).forEach(function (n) { lower[n.toLowerCase()] = n; });
  items.forEach(function (i) { var k = ienKey_(i.plant || i.name, i.size); if (merged[k]) merged[k].qty += ienNum_(i.qty);
    else merged[k] = { plant: String(i.plant || i.name).trim(), size: String(i.size).trim(), qty: ienNum_(i.qty) }; });
  var lines = Object.keys(merged).map(function (k) { return merged[k]; }).filter(function (i) { return i.qty > 0; });
  lines.forEach(function (it) {
    if (IENN_CFG.COUNTED_SIZES.indexOf(it.size) < 0) return; // on-request sizes are not stock-tracked
    var real = lower[it.plant.toLowerCase()], have = real ? ienNum_((stock[real] || {})[it.size]) : 0;
    if (real) it.plant = real;
    if (have < it.qty) problems.push({ name: it.plant, size: it.size, requested: it.qty, available: have });
  });
  return { lines: lines, problems: problems };
}

/* Sets Source / Status=New / Claimed by=Andrew on the invoice row (adds those columns if missing). */
function ienTagInvoice_(no, source) {
  var hit = ienInvoiceRow_(no); if (!hit) return;
  var C = IENN_CFG.INVOICE_COLS, sh = hit.sheet, vals = { source: source, status: IENN_CFG.STATUS_FLOW[0], claimedBy: IENN_CFG.ORDER_OWNER };
  Object.keys(vals).forEach(function (k) {
    var c = hit.col(C[k]);
    if (c < 0) { c = sh.getLastColumn(); sh.getRange(1, c + 1).setValue(C[k]); hit = ienInvoiceRow_(no); }
    var cur = hit.row[c];
    if (k === 'source' || cur === '' || cur == null) sh.getRange(hit.rowNum, c + 1).setValue(vals[k]);
  });
}

/* ---------- inventory feed (?view=json) ---------- */
function ienCatalogNames_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(IENN_CFG.CATALOG_SHEET); if (!sh) return [];
  var v = sh.getDataRange().getValues(), c = ienHeaderIndex_(v[0])(IENN_CFG.CATALOG_NAME_COL);
  return c < 0 ? [] : v.slice(1).map(function (r) { return String(r[c]).trim(); }).filter(String);
}
function inventoryFeed_() {
  var stock = getAvailableStock(), names = ienCatalogNames_();
  Object.keys(stock).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
  var plants = names.filter(function (n) { return stock[n]; }).map(function (n) {
    return { name: n, sizes: IENN_CFG.COUNTED_SIZES.filter(function (s) { return stock[n][s] !== undefined; })
      .map(function (s) { return { size: s, stock: ienNum_(stock[n][s]), price: IENN_CFG.PRICES[s] }; }) };
  }).filter(function (p) { return p.sizes.length; });
  return { updated: new Date().toISOString(), week: ienLatestWeek_(), prices: IENN_CFG.PRICES, taxesIncluded: true,
    onRequestSizes: IENN_CFG.ON_REQUEST_SIZES, plants: plants };
}

/* ---------- website order -> existing invoice path ---------- */
function ienToInvoicePayload_(o, items) {  // [TODO confirm T3: match the Index form's payload]
  return { customer: { name: o.name, email: o.email, phone: o.phone || '' }, notes: o.notes || '', source: 'Website', taxIncluded: true,
    items: items.map(function (i) { return { plant: i.name, size: i.size, qty: i.qty, price: IENN_CFG.PRICES[i.size] }; }) };
}
function placeOrder_(o) {
  o = o || {};
  var name = String(o.name || '').trim(), email = String(o.email || '').trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'invalid', message: 'Name and a valid email are required.' };
  var items = (o.items || []).map(function (i) { return { name: String(i.name || '').trim(), size: String(i.size || '').trim(), qty: ienNum_(i.qty) }; })
    .filter(function (i) { return i.name && i.qty > 0; });
  if (!items.length) return { ok: false, error: 'empty', message: 'No plants in the order.' };
  var bad = items.filter(function (i) { return IENN_CFG.COUNTED_SIZES.indexOf(i.size) < 0; });
  if (bad.length) return { ok: false, error: 'out_of_stock', items: bad.map(function (i) { return { name: i.name, size: i.size, requested: i.qty, available: 0 }; }) };
  var subtotal = items.reduce(function (a, i) { return a + IENN_CFG.PRICES[i.size] * i.qty; }, 0);
  var res;
  try { res = submitInvoice(ienToInvoicePayload_({ name: name, email: email, phone: o.phone, notes: o.notes }, items)); }
  catch (e) { if (e.message === 'OUT_OF_STOCK') return { ok: false, error: 'out_of_stock', items: e.items }; throw e; }
  var id = String(res && typeof res === 'object' ? (res.invoiceNo || res.invoiceNumber || res.id) : res);
  var result = { ok: true, orderId: id, total: subtotal };  // taxes included, nothing added
  if (IENN_CFG.WEBSITE_TEAM_NOTICE) { try { ienNotifyTeam_(result, { name: name, email: email }, items); } catch (e) { result.notifyError = String(e); } }
  return result;
}

function ienTeamEmails_() {
  var list = [];
  try { var s = getSettings(); if (s && s.teamEmails) list = s.teamEmails; } catch (e) {}
  if (typeof list === 'string') list = list.split(/[,;\s]+/);
  if (!list || !list.length) list = IENN_CFG.TEAM_EMAILS;
  return (list || []).map(String).map(function (x) { return x.trim(); }).filter(function (x) { return /@/.test(x); });
}
function ienInvoicesSheet_() {
  if (!IENN_CFG.INVOICES_SPREADSHEET_ID) return null;
  var ss = SpreadsheetApp.openById(IENN_CFG.INVOICES_SPREADSHEET_ID);
  return IENN_CFG.INVOICES_SHEET ? ss.getSheetByName(IENN_CFG.INVOICES_SHEET) : ss.getSheets()[0];
}
function ienInvoiceRow_(id) {
  var sh = ienInvoicesSheet_(); if (!sh) return null;
  var v = sh.getDataRange().getValues(), c = ienHeaderIndex_(v[0]), ic = c(IENN_CFG.INVOICE_COLS.id);
  for (var r = v.length - 1; r >= 1; r--) if (String(v[r][ic]) === String(id)) return { sheet: sh, rowNum: r + 1, row: v[r], col: c };
  return null;
}
function ienNotifyTeam_(res, cust, items) {
  var to = ienTeamEmails_(); if (!to.length) return;
  var hit = ienInvoiceRow_(res.orderId), sh = hit ? hit.sheet : null;
  var link = hit ? sh.getParent().getUrl() + '#gid=' + sh.getSheetId() + '&range=A' + hit.rowNum : '(open IENN Invoices, invoice #' + res.orderId + ')';
  MailApp.sendEmail({ to: to.join(','), subject: 'New IENN order #' + res.orderId,
    body: 'A new website order came in from ' + cust.name + ' <' + cust.email + '>.\n' +
      items.map(function (i) { return '  ' + i.qty + ' x ' + i.name + ' (' + i.size + ')'; }).join('\n') +
      '\nTotal $' + res.total.toFixed(2) + ' (taxes included)\n\nView details: ' + link +
      '\n\n' + IENN_CFG.ORDER_OWNER + ' claims and handles this order (Claimed by = ' + IENN_CFG.ORDER_OWNER +
      '). Status: ' + IENN_CFG.STATUS_FLOW.join(' -> ') + '. Reply with buildResponseEmail("' + res.orderId + '").' });
}

/* ---------- uniform customer reply (docs/order-response-template.md) ---------- */
function buildResponseEmail(invoiceNo) {
  var hit = ienInvoiceRow_(invoiceNo); if (!hit) throw new Error('Invoice not found: ' + invoiceNo);
  var C = IENN_CFG.INVOICE_COLS;
  function g(k) { var i = hit.col(C[k]); return i < 0 ? '' : hit.row[i]; }
  function money(n) { return '$' + Number(n || 0).toFixed(2); }
  var total = Number(g('total') || 0);
  var paid = /^(y|yes|paid|true)$/i.test(String(g('paid')).trim());
  var confirmed = IENN_CFG.STATUS_FLOW.indexOf(String(g('status')).trim()) >= 2; // Confirmed or later
  var addr = String(g('address')).trim(), notes = String(g('notes')).trim();
  var body = ['Hi ' + String(g('name')).split(' ')[0] + ',', '',
    'Thanks for your order with Inland Empire Native Nursery! Here are the details for order #' + invoiceNo + ':', '',
    String(g('items')), '',
    'Total: ' + money(total) + ' (taxes included)', '',
    'Payment status: ' + (paid ? 'Paid' : 'Not yet paid'),
    'Payment form: ' + (String(g('method')).trim() || 'Cash or Zelle at pickup [TODO confirm accepted methods]'), '',
    'Pickup address (Fontana): ' + (confirmed && addr ? addr : '(We will send the exact address once your order is confirmed.)'),
    'Pickup date/time: ' + (String(g('window')).trim() || 'Saturdays 10 AM - 2 PM'), '',
    'Your notes:', notes ? notes.split('\n').map(function (l) { return '> ' + l; }).join('\n') : '> (none)', '',
    'Our response:', String(g('response')).trim() || '[write response here]', '',
    'Questions? Call or text me at ' + IENN_CFG.OWNER_PHONE + '.', '',
    'Thank you for planting natives!', IENN_CFG.ORDER_OWNER + ', for Inland Empire Native Nursery'].join('\n');
  return { to: String(g('email')), subject: 'Your IENN order #' + invoiceNo, body: body };
}

/* ---------- printable list (?view=print) + CSV export (?view=csv) ----------
 * Rows show Counted (latest week) / Sold since / Available, so the team can see why numbers changed.
 * Add to the internal Index view's menu (one line of HTML, same URL):
 *   <a href="?view=print" target="_top">Print plant list</a> | <a href="?view=csv" target="_top">Export CSV</a>
 */
var IENN_POPULAR = ['white sage', 'monkeyflower', 'california poppy', 'cleveland sage', 'penstemon',
  'ceanothus', 'buckwheat', 'woolly blue curls', 'milkweed', 'yarrow'];  // keep in sync with order.html POPULAR_DEFAULTS
var IENN_LOGO_URL = '';  // [TODO] public URL of the locked IENN logo (e.g. the site's images/ienn-logo-sage.png once hosted)
function ienPlantRows_() {
  var raw = getAvailableStockRaw_() || {}, sold = ienSoldThisWeek_(ienLatestWeek_()), names = ienCatalogNames_();
  Object.keys(raw).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
  function pop(n) { n = n.toLowerCase(); for (var i = 0; i < IENN_POPULAR.length; i++) if (n.indexOf(IENN_POPULAR[i]) >= 0) return i; return 999; }
  names = names.filter(function (n) { return raw[n]; }).sort(function (a, b) { return pop(a) - pop(b) || a.localeCompare(b); });
  var rows = [];
  names.forEach(function (n) { IENN_CFG.COUNTED_SIZES.forEach(function (s) {
    if (raw[n][s] === undefined) return;
    var c = ienNum_(raw[n][s]), so = sold[ienKey_(n, s)] || 0;
    rows.push({ plant: n, size: s, price: IENN_CFG.PRICES[s], counted: c, sold: so, available: Math.max(0, c - so) }); }); });
  return rows;
}
function ienCsv_() {
  function q(v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  var lines = [['Plant', 'Size', 'Price', 'Counted (week ' + ienLatestWeek_() + ')', 'Sold since', 'Available'].map(q).join(',')];
  ienPlantRows_().forEach(function (r) { lines.push([r.plant, r.size, r.price, r.counted, r.sold, r.available].map(q).join(',')); });
  IENN_CFG.ON_REQUEST_SIZES.forEach(function (s) { lines.push(['(any plant)', s, IENN_CFG.PRICES[s], '', '', 'Ask us (on request)'].map(q).join(',')); });
  return lines.join('\n');
}
function ienPrintHtml_() {
  function h(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  var date = Utilities.formatDate(new Date(), 'America/Los_Angeles', 'MMM d, yyyy');
  var body = ienPlantRows_().map(function (r) {
    return '<tr' + (r.available ? '' : ' class="out"') + '><td>' + h(r.plant) + '</td><td>' + h(r.size) + '</td><td>$' + r.price +
      '</td><td>' + r.counted + '</td><td>' + r.sold + '</td><td><b>' + (r.available ? r.available : 'Out') + '</b></td></tr>'; }).join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:system-ui,sans-serif;color:#2c2c2c;margin:24px}h1{color:#4a5a4a;font-size:20px;margin:0}' +
    '.sub{color:#6b7c6a;font-size:12px;letter-spacing:.08em}header{display:flex;gap:12px;align-items:center;border-bottom:3px solid #6b7c6a;padding-bottom:8px;margin-bottom:12px}' +
    'header img{height:56px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f8f6f3;color:#4a5a4a;text-align:left}' +
    'th,td{padding:5px 8px;border-bottom:1px solid #ddd}tr.out td{color:#999}.note{font-size:12px;color:#555;margin-top:10px}' +
    '.btn{background:#c0392b;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-weight:700;cursor:pointer;margin-right:8px;text-decoration:none;display:inline-block}' +
    '@media print{.noprint{display:none}body{margin:0}tr{break-inside:avoid}}</style></head><body>' +
    '<header>' + (IENN_LOGO_URL ? '<img src="' + h(IENN_LOGO_URL) + '" alt="IENN logo">' : '') +
    '<div><h1>Inland Empire Native Nursery</h1><div class="sub">PLANT LIST &bull; ' + h(date) + ' &bull; COUNT WEEK ' + h(ienLatestWeek_()) + '</div></div></header>' +
    '<p class="noprint"><button class="btn" onclick="window.print()">Print / Save as PDF</button><a class="btn" href="?view=csv" target="_top">Export CSV</a></p>' +
    '<table><thead><tr><th>Plant</th><th>Size</th><th>Price</th><th>Counted</th><th>Sold since count</th><th>Available</th></tr></thead><tbody>' + body + '</tbody></table>' +
    '<p class="note">Prices by size: 2" $3 &bull; 4" $6 &bull; Tree pot $10 &bull; 1 gal $15. 2" and Tree pot: Ask us, available on request. ' +
    'Available = latest weekly count minus orders/invoices since (see the Sold tab). Taxes included.</p></body></html>';
}

/* ---------- web entry points ---------- */
function ienWebsiteGet_(e) {
  var p = (e && e.parameter) || {};
  if (p.view === 'json') { try { return ienJson_(inventoryFeed_()); } catch (err) { return ienJson_({ ok: false, error: String(err) }); } }
  if (p.view === 'print') return HtmlService.createHtmlOutput(ienPrintHtml_()).setTitle('IENN plant list');
  if (p.view === 'csv') return ContentService.createTextOutput(ienCsv_()).setMimeType(ContentService.MimeType.CSV)
    .downloadAsFile('ienn-plant-list-' + Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyyy-MM-dd') + '.csv');
  return null;
}
function ienWebsitePost_(e) {
  var data;
  try { data = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return ienJson_({ ok: false, error: 'bad_json' }); }
  if (data.action && data.action !== 'order') return ienJson_({ ok: false, error: 'unknown_action' });
  try { return ienJson_(placeOrder_(data)); } catch (err) { return ienJson_({ ok: false, error: 'server', message: String(err) }); }
}
function doPost(e) { return ienWebsitePost_(e); }
