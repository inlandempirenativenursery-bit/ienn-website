/**
 * IENN website backend: inventory feed + order intake + team email + reply template.
 * READY TO PASTE — NOT DEPLOYED. Paste into the existing IENN Apps Script project (the one serving ?view=customer).
 *
 * ===== SHEET ASSUMPTIONS (Eric still confirming — edit the constants below if the sheet differs) =====
 *  - Tab "Inventory": ONE ROW PER PLANT.
 *      Plant        plant name; may be "Common (Botanical)"
 *      Botanical    optional
 *      2-inch | 4-inch | Quarter tree | 1-gallon   one COUNT column per size (blank = size not offered)
 *      Priority     optional number, lower = shown first on the website
 *      Photo        optional public image URL
 *    Header matching is loose (case/spaces/punctuation ignored; 4", 4in, 4-inch, 1 gal, 1-gallon, 2", quarter, 1/4 tree, tree pot all work).
 *  - Tab "Orders": created automatically with the headers in ORDER_HEADERS if missing.
 *  - PRICES ARE BY SIZE ONLY (authoritative, ignores any price column): 2-inch $3, 4-inch $6, Quarter tree $10, 1-gallon $15.
 *
 * ===== ROUTING (Apps Script allows only ONE doGet and ONE doPost per project) =====
 *  In the EXISTING doGet(e), add as the first line:
 *      var r = ienRouteGet_(e); if (r) return r;
 *  If the project has NO doPost, uncomment the doPost at the bottom. If it has one, add as its first line:
 *      var r = ienRoutePost_(e); if (r) return r;
 */

// ---------- CONFIG ----------
var INVENTORY_SHEET = 'Inventory';
var ORDERS_SHEET = 'Orders';
var COL_PLANT = 'Plant', COL_BOTANICAL = 'Botanical', COL_PRIORITY = 'Priority', COL_PHOTO = 'Photo';
var TEAM_EMAILS = [
  // TODO: fill in real addresses (Eric, Andrew, Keith, Raylene). Left empty on purpose — never guess.
  // 'eric@example.invalid',
];
var ADMIN_KEY = 'TODO-set-a-long-random-secret'; // required for ?view=order / ?view=reply links (they show customer details)
var PICKUP_ADDRESS = 'TODO: exact pickup address (shared with customer only after confirmation)';

// ---------- SHARED SIZE / PRICE LOGIC (mirrors inventory.js; keep both in sync) ----------
var IENN_SIZES = ['2-inch', '4-inch', 'Quarter tree', '1-gallon'];
var IENN_SIZE_PRICES = { '2-inch': 3, '4-inch': 6, 'Quarter tree': 10, '1-gallon': 15 };
function ienNormSize(s) {
  var t = String(s == null ? '' : s).toLowerCase().replace(/[”″]/g, '"').replace(/\s+/g, ' ').trim();
  if (/quarter|1\/4|¼|tree/.test(t)) return 'Quarter tree';
  if (/^1 ?(-| )?(gal|gallon)s?\b|^1g$|^#1$|one gallon/.test(t)) return '1-gallon';
  if (/^2 ?(-| )?("|in\b|inch|inches)|^2$/.test(t)) return '2-inch';
  if (/^4 ?(-| )?("|in\b|inch|inches)|^4$/.test(t)) return '4-inch';
  return null;
}
function ienPrice(size) { var z = ienNormSize(size); return z ? IENN_SIZE_PRICES[z] : null; }
function ienKey_(h) { return String(h).toLowerCase().replace(/[^a-z0-9]/g, ''); }

/** Pure: rows = 2D array incl. header. Returns { plants:[{name,botanical,row,priority,photo,stock:{size:qty},cols:{size:colIndex}}] } */
function ienParseInventory(rows) {
  var head = rows[0].map(ienKey_), ci = function (n) { return head.indexOf(ienKey_(n)); };
  var pc = ci(COL_PLANT), bc = ci(COL_BOTANICAL), prc = ci(COL_PRIORITY), phc = ci(COL_PHOTO), sizeCols = {};
  rows[0].forEach(function (h, i) { var z = ienNormSize(h); if (z && !(z in sizeCols)) sizeCols[z] = i; });
  var out = [];
  for (var r = 1; r < rows.length; r++) {
    var raw = String(rows[r][pc] || '').trim(); if (!raw) continue;
    var m = raw.match(/^(.*?)\s*\((.*)\)\s*$/), name = m ? m[1] : raw, bot = (bc >= 0 && rows[r][bc]) || (m ? m[2] : '');
    var stock = {};
    for (var z in sizeCols) { var v = rows[r][sizeCols[z]]; if (v !== '' && v != null && !isNaN(v)) stock[z] = Number(v); }
    out.push({ name: name, botanical: String(bot || ''), row: r + 1, stock: stock, cols: sizeCols,
      priority: prc >= 0 && rows[r][prc] !== '' ? Number(rows[r][prc]) : null, photo: phc >= 0 ? String(rows[r][phc] || '') : '' });
  }
  return { plants: out };
}
function ienSlug(s) { return String(s).toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/** Pure: validate order items against parsed inventory. Returns {ok, lines, total} or {ok:false, error, problems}. */
function ienCheckOrder(inv, items) {
  if (!items || !items.length) return { ok: false, error: 'No items in order.' };
  var lines = [], problems = [], need = {};
  items.forEach(function (it) {
    var q = parseInt(it.qty, 10), z = ienNormSize(it.size), id = ienSlug(it.id || it.name || '');
    var p = inv.plants.filter(function (x) { return ienSlug(x.name) === id; })[0];
    if (!p || !z || !(q > 0)) { problems.push((it.name || it.id) + ' (' + it.size + '): not available'); return; }
    var k = p.row + '|' + z; need[k] = (need[k] || 0) + q;
    var have = p.stock[z] == null ? 0 : p.stock[z];
    if (need[k] > have) problems.push(p.name + ' (' + z + '): only ' + have + ' left');
    lines.push({ plant: p, name: p.name, size: z, qty: q, price: IENN_SIZE_PRICES[z], line: q * IENN_SIZE_PRICES[z] });
  });
  if (problems.length) return { ok: false, error: 'Not enough stock: ' + problems.join('; '), problems: problems };
  return { ok: true, lines: lines, total: lines.reduce(function (a, l) { return a + l.line; }, 0) };
}

// ---------- GET ----------
function ienRouteGet_(e) {
  var v = e && e.parameter && e.parameter.view;
  if (v === 'inventory') return ienInventoryJson_(e);
  if (v === 'order' || v === 'reply') {
    if (e.parameter.key !== ADMIN_KEY || /^TODO/.test(ADMIN_KEY)) return HtmlService.createHtmlOutput('Not authorized.');
    var o = ienFindOrder_(e.parameter.id); if (!o) return HtmlService.createHtmlOutput('Order not found.');
    return HtmlService.createHtmlOutput('<pre style="white-space:pre-wrap;font:14px system-ui">' +
      ienEsc_(v === 'reply' ? ienReplyText_(o) : JSON.stringify(o, null, 2)) + '</pre>').setTitle('IENN order ' + o.orderId);
  }
  return null;
}
function ienInventoryJson_(e) {
  var inv = ienParseInventory(SpreadsheetApp.getActive().getSheetByName(INVENTORY_SHEET).getDataRange().getValues());
  var out = { updated: new Date().toISOString(), sizes: IENN_SIZES, defaultPrices: IENN_SIZE_PRICES, plants: [], stock: {}, sort: {}, photos: {} };
  inv.plants.forEach(function (p) {
    var full = p.botanical ? p.name + ' (' + p.botanical + ')' : p.name;
    out.plants.push(full); out.stock[full] = p.stock;
    if (p.priority != null) out.sort[full] = p.priority; if (p.photo) out.photos[full] = p.photo;
  });
  var body = JSON.stringify(out), cb = e.parameter.callback;
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) return ContentService.createTextOutput(cb + '(' + body + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ---------- POST (order intake) ----------
var ORDER_HEADERS = ['Order ID', 'Timestamp', 'Name', 'Email', 'Phone', 'Items', 'Sizes', 'Qty', 'Line prices', 'Total',
  'Pickup', 'Payment method', 'Paid status', 'Customer notes', 'Status', 'Our response'];

function ienRoutePost_(e) {
  var body; try { body = JSON.parse(e.postData.contents); } catch (x) { return null; }
  if (!body || body.action !== 'order') return null;
  return ienJson_(ienPlaceOrder_(body));
}
function ienPlaceOrder_(b) {
  if (!b.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || '')) return { ok: false, error: 'Name and a valid email are required.' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'Busy — please try again in a moment.' };
  try {
    var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(INVENTORY_SHEET), rows = sh.getDataRange().getValues();
    var inv = ienParseInventory(rows), chk = ienCheckOrder(inv, b.items);
    if (!chk.ok) return chk;
    chk.lines.forEach(function (l) {             // decrement counts
      var cell = sh.getRange(l.plant.row, l.plant.cols[l.size] + 1);
      cell.setValue(Number(cell.getValue()) - l.qty);
    });
    var os = ss.getSheetByName(ORDERS_SHEET) || ss.insertSheet(ORDERS_SHEET);
    if (os.getLastRow() === 0) os.appendRow(ORDER_HEADERS);
    var id = 'IENN-' + Utilities.formatDate(new Date(), 'America/Los_Angeles', 'yyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000);
    os.appendRow([id, new Date(), b.name, b.email, b.phone || '',
      chk.lines.map(function (l) { return l.name; }).join('\n'), chk.lines.map(function (l) { return l.size; }).join('\n'),
      chk.lines.map(function (l) { return l.qty; }).join('\n'), chk.lines.map(function (l) { return '$' + l.line; }).join('\n'),
      chk.total, b.pickup || '', b.payment || '', 'Unpaid', b.notes || '', 'New', '']);
    SpreadsheetApp.flush();
    var row = os.getLastRow();
    try { ienNotifyTeam_(id, b, chk, ss.getUrl() + '#gid=' + os.getSheetId() + '&range=A' + row); } catch (x) {}
    return { ok: true, orderId: id, total: chk.total };
  } finally { lock.releaseLock(); }
}
function ienNotifyTeam_(id, b, chk, sheetLink) {
  if (!TEAM_EMAILS.length) return; // TODO: add addresses above
  var url = ScriptApp.getService().getUrl();
  var body = 'New order ' + id + ' — $' + chk.total + '\n' + b.name + ' <' + b.email + '> ' + (b.phone || '') + '\n\n' +
    chk.lines.map(function (l) { return l.qty + ' × ' + l.name + ' (' + l.size + ') $' + l.line; }).join('\n') +
    '\n\nPickup: ' + (b.pickup || '-') + '\nPayment: ' + (b.payment || '-') + '\nNotes: ' + (b.notes || '-') +
    '\n\nOrders sheet row: ' + sheetLink +
    '\nReply template: ' + url + '?view=reply&id=' + encodeURIComponent(id) + '&key=' + encodeURIComponent(ADMIN_KEY) +
    '\n\nOne person handles the reply — mark Status in the sheet when you take it.';
  MailApp.sendEmail({ to: TEAM_EMAILS.join(','), subject: 'New IENN order #' + id, body: body, replyTo: b.email });
}

// ---------- REPLY TEMPLATE (never auto-sent to customers) ----------
function ienFindOrder_(id) {
  var os = SpreadsheetApp.getActive().getSheetByName(ORDERS_SHEET); if (!os || !id) return null;
  var v = os.getDataRange().getValues(), h = v[0];
  for (var i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) { var o = {}; h.forEach(function (k, j) { o[k] = v[i][j]; }); o.orderId = id; return o; }
  return null;
}
function ienReplyText_(o) {
  var items = String(o['Items']).split('\n'), sz = String(o['Sizes']).split('\n'), q = String(o['Qty']).split('\n'), lp = String(o['Line prices']).split('\n');
  return 'Subject: Your IENN order #' + o.orderId + ' is confirmed\n\n' +
    'Hi ' + o['Name'] + ',\n\nThanks for your order! Here are the details:\n\n' +
    'Order number: ' + o.orderId + '\n' +
    items.map(function (n, i) { return '  ' + q[i] + ' × ' + n + ' (' + sz[i] + ') ' + (lp[i] || ''); }).join('\n') +
    '\nTotal: $' + o['Total'] + '\n\n' +
    'Payment: ' + (o['Paid status'] || 'Unpaid') + ' — pay by ' + (o['Payment method'] || 'cash or Zelle') + ' at pickup.\n' +
    'Pickup address: ' + PICKUP_ADDRESS + '\n' +
    'Pickup time: ' + (o['Pickup'] || 'Saturdays 10 AM – 2 PM') + '\n\n' +
    'Your notes: ' + (o['Customer notes'] || '-') + '\n' +
    'Our response: ' + (o['Our response'] || '[write response here]') + '\n\n' +
    '— Inland Empire Native Nursery';
}
/** Optional sheet menu: select a row in Orders, then IENN > Reply template for selected order. */
function ienReplyForSelected() {
  var sh = SpreadsheetApp.getActiveSheet(), id = sh.getRange(sh.getActiveRange().getRow(), 1).getValue();
  var o = ienFindOrder_(id);
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<textarea style="width:100%;height:420px">' + ienEsc_(o ? ienReplyText_(o) : 'Select a row in the Orders tab first.') + '</textarea>'), 'Reply template — copy & send yourself');
}
// To add the menu, put this in your existing onOpen() (or create one):
//   SpreadsheetApp.getUi().createMenu('IENN').addItem('Reply template for selected order', 'ienReplyForSelected').addToUi();

function ienEsc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function ienJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// Uncomment ONLY if the project has no doPost yet:
// function doPost(e) { var r = ienRoutePost_(e); return r || ienJson_({ ok: false, error: 'Unknown request' }); }

if (typeof module !== 'undefined') module.exports = { ienNormSize: ienNormSize, ienPrice: ienPrice, ienParseInventory: ienParseInventory, ienCheckOrder: ienCheckOrder, IENN_SIZE_PRICES: IENN_SIZE_PRICES };
