/**
 * IENN website endpoints: inventory feed (GET ?view=inventory), website order intake (POST), reply template.
 * READY TO PASTE (new file in the existing IENN Apps Script project) — NOT DEPLOYED. Requires ienn-stock-ledger.gs.
 *
 * Orders go through the EXISTING invoice path: website POST -> submitInvoice(data) (wrapped by ienn-stock-ledger.gs)
 * -> existing code writes "IENN Invoices" and emails the team (unchanged, not duplicated) -> Sold ledger decrements stock.
 *
 * ROUTING (Apps Script allows one doGet / one doPost):
 *   In the EXISTING doGet(e), first line:   var r = ienRouteGet_(e); if (r) return r;
 *   The project has no doPost today (not in the live function list) -> the doPost below is active.
 */
var ADMIN_KEY = 'TODO-set-a-long-random-secret';   // protects ?view=reply (shows customer details)
var PICKUP_ADDRESS = 'TODO: exact pickup address (share only after confirmation)';

function ienRouteGet_(e) {
  var v = e && e.parameter && e.parameter.view;
  if (v === 'inventory') return ienInventoryJson_(e);
  if (v === 'printlist') return ienPrintListView_(e);
  if (v === 'reply') {
    if (/^TODO/.test(ADMIN_KEY) || e.parameter.key !== ADMIN_KEY) return HtmlService.createHtmlOutput('Not authorized.');
    return HtmlService.createHtmlOutput('<textarea style="width:100%;height:90vh;font:14px system-ui">' +
      ienEsc_(ienReplyText_(e.parameter.id)) + '</textarea>').setTitle('IENN reply ' + e.parameter.id);
  }
  return null;
}

/** Live available stock (after Sold deductions) + names, sizes, prices, tax. */
function ienInventoryJson_(e) {
  var init = getInitial(), now = ienAvailableNow_(), sizes = ['4"', '1 gal'];
  Object.keys(now.stock).forEach(function (n) { Object.keys(now.stock[n]).forEach(function (z) { var s = ienNormSize(z); if (s && sizes.indexOf(s) < 0 && now.stock[n][z] > 0) sizes.push(s); }); });
  sizes.sort(function (a, b) { return IENN_SIZES.indexOf(a) - IENN_SIZES.indexOf(b); });
  var prices = {}; sizes.forEach(function (s) { prices[s] = IENN_SIZE_PRICES[s]; }); prices.taxPct = IENN_TAX_PCT;
  var out = { updated: new Date().toISOString(), week: now.week, plants: init.plants || Object.keys(now.stock), sizes: sizes,
              defaultPrices: prices, taxPct: IENN_TAX_PCT, taxIncluded: true, stock: now.stock };
  var body = JSON.stringify(out), cb = e.parameter.callback;
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) return ContentService.createTextOutput(cb + '(' + body + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

/** Website order: body (text/plain JSON) {action:'order', name, email, phone, pickup, payment, notes, items:[{name,size,qty}]} */
function ienRoutePost_(e) {
  var b; try { b = JSON.parse(e.postData.contents); } catch (x) { return null; }
  if (!b || b.action !== 'order') return null;
  try {
    if (!b.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || '')) throw new Error('Name and a valid email are required.');
    var full = {}; (getInitial().plants || []).forEach(function (p) { full[ienCommon_(p)] = p; });
    var lines = (b.items || []).map(function (it) {
      var z = ienNormSize(it.size), q = parseInt(it.qty, 10);
      if (!z || !(q > 0) || !full[ienCommon_(it.name)]) throw new Error((it.name || '?') + ' (' + it.size + ') is not available.');
      return { plant: full[ienCommon_(it.name)], size: z, qty: String(q), amt: String(IENN_SIZE_PRICES[z] * q) };
    });
    if (!lines.length) throw new Error('No items in order.');
    var grand = lines.reduce(function (a, l) { return a + Number(l.amt); }, 0), t = ienTax(grand);
    var note = ['WEBSITE ORDER', 'Name: ' + b.name, 'Phone: ' + (b.phone || '-'), 'Pickup: ' + (b.pickup || '-'),
                'Payment: ' + (b.payment || '-'), 'Notes: ' + (b.notes || '-')].join('\n');
    var data = { date: Utilities.formatDate(new Date(), IENN_TZ, 'yyyy-MM-dd'), paid: 'unpaid', payment: b.payment || '', customerEmail: b.email,
                 discType: 'none', discAmt: '', note: note, lines: lines, subtotal: t.subtotal.toFixed(2), tax: t.tax.toFixed(2), grand: grand.toFixed(2) };
    var res = submitInvoice(data, { source: 'website', customer: { name: b.name, email: b.email, phone: b.phone || '', pickup: b.pickup || '', payment: b.payment || '', notes: b.notes || '' } });
    return ienJson_({ ok: true, orderId: String((res && res.orderId) || res), total: grand, subtotal: t.subtotal, tax: t.tax });
  } catch (err) { return ienJson_({ ok: false, error: String(err && err.message || err) }); }
}
function doPost(e) { var r = ienRoutePost_(e); return r || ienJson_({ ok: false, error: 'Unknown request' }); }

/** Reply template for an order id, built from the Sold ledger. Never sent automatically. */
function ienReplyText_(id) {
  var v = ienSoldSheet_().getDataRange().getValues(), h = v[0].map(ienHdr_), rows = v.slice(1).filter(function (r) { return String(r[0]) === String(id); });
  if (!rows.length) return 'Order ' + id + ' not found in the Sold sheet.';
  var cust = {}; try { cust = JSON.parse(rows[0][h.indexOf('customer')] || '{}'); } catch (x) {}
  var total = 0, items = rows.map(function (r) {
    var z = ienNormSize(r[h.indexOf('sizekey')]), q = Number(r[h.indexOf('qty')]), lp = (IENN_SIZE_PRICES[z] || 0) * q; total += lp;
    return '  ' + q + ' × ' + String(r[h.indexOf('plant')]).split(' (')[0] + ' (' + z + ') $' + lp.toFixed(2);
  }).join('\n'), t = ienTax(total);
  return 'Subject: Your IENN order #' + id + ' is confirmed\n\nHi ' + (cust.name || '') + ',\n\nThanks for your order!\n\n' +
    'Order number: ' + id + '\n' + items + '\nSubtotal: $' + t.subtotal.toFixed(2) + '\nTax ' + IENN_TAX_PCT + '% (included): $' + t.tax.toFixed(2) +
    '\nTotal: $' + total.toFixed(2) + '\n\nPayment: Unpaid — pay by ' + (cust.payment || 'cash or Zelle') + ' at pickup. [update if paid]\n' +
    'Pickup address: ' + PICKUP_ADDRESS + '\nPickup time: ' + (cust.pickup || 'Saturdays 10 AM – 2 PM') + '\n\n' +
    'Your notes: ' + (cust.notes || '-') + '\nOur response: [write response here]\n\n— Inland Empire Native Nursery';
}
/** Optional menu (add to onOpen): SpreadsheetApp.getUi().createMenu('IENN').addItem('Reply template for selected Sold row','ienReplyForSelected').addToUi(); */
function ienReplyForSelected() {
  var sh = SpreadsheetApp.getActiveSheet(), id = sh.getRange(sh.getActiveRange().getRow(), 1).getValue();
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<textarea style="width:100%;height:420px">' + ienEsc_(ienReplyText_(id)) + '</textarea>'), 'Reply template — copy & send yourself');
}
function ienEsc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function ienJson_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
