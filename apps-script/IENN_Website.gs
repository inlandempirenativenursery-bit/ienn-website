/**
 * Website endpoints.
 *  GET  ?view=print / ?view=hub -> see IENN_Print.gs
 *  GET  ?view=inventory  -> JSON (or JSONP with &callback=) built from getInitial()/getAvailableStock() + Catalog + prices
 *  GET  ?view=confirm&orderId=XXX -> mark Confirmed + create Gmail draft
 *  POST (text/plain JSON) -> website order, through iennSubmitInvoiceChecked -> existing submitInvoice
 *
 * ONE EDIT to the existing doGet(e), as its first line:   var ienn = iennRoute_(e); if (ienn) return ienn;
 */
function iennJson_(obj, cb) {
  var s = JSON.stringify(obj);
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) return ContentService.createTextOutput(cb + '(' + s + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function iennRoute_(e) {
  var p = (e && e.parameter) || {};
  if (p.view === 'customer') return iennCustomerClosed_();
  if (p.view === 'print' || p.view === 'printlist') return iennPrintRoute_(p);
  if (p.view === 'hub') return HtmlService.createHtmlOutput(iennHubHtml_()).setTitle('IENN team home');
  if (p.view === 'confirm') return iennConfirmOrder_(p.orderId);
  if (p.view !== 'inventory') return null;
  try { return iennJson_(iennInventory(), p.callback); } catch (err) { return iennJson_({ ok: false, error: String(err.message || err) }, p.callback); }
}

function iennInventory() {
  var init = getInitial() || {}, avail = iennAvailable_(), photos = iennCatalogPhotos_(), seen = {}, names = [];
  (init.plants || []).concat(iennCatalogNames_()).forEach(function (n) { var k = iennKey_(n); if (k && !seen[k]) { seen[k] = 1; names.push(n); } });
  var plants = names.map(function (full) {
    var nb = iennSplit_(full), a = avail[iennKey_(full)] || {};
    return { name: nb[0], fullName: full, botanical: nb[1], image: photos[iennKey_(full)] || photos[iennKey_(nb[0])] || '',
      sizes: IENN_SIZES.map(function (s) { return { key: s.key, size: s.label, price: s.price, qty: s.tracked ? (a[s.key] || 0) : null }; }) };
  });
  return { version: 3, updated: new Date().toISOString(), taxIncluded: true, onRequestLabel: IENN_ON_REQUEST_LABEL, contactPhone: IENN_CONTACT_PHONE,
    sizes: IENN_SIZES.map(function (s) { return { key: s.key, label: s.label, price: s.price, tracked: s.tracked }; }), plants: plants,
    promo: iennPromo_() };
}

function doPost(e) { return iennWebsitePost_(e); }
function iennWebsitePost_(e) {
  var b; try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { b = null; }
  return iennJson_(iennWebsiteOrder_(b));
}

function iennMoney_(n) { return (Math.round(n * 100) / 100).toFixed(2); }

function iennWebsiteOrder_(b) {
  if (!b || typeof b !== 'object') return { ok: false, error: 'invalid', message: 'Could not read the order.' };
  var name = String(b.name || '').trim().slice(0, 100), email = String(b.email || '').trim().slice(0, 200);
  if (!name) return { ok: false, error: 'invalid', message: 'Please enter your name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'invalid', message: 'Please enter a valid email.' };
  if (!Array.isArray(b.items) || !b.items.length) return { ok: false, error: 'invalid', message: 'Please add at least one plant.' };
  var lines = [];
  for (var i = 0; i < b.items.length; i++) {
    var it = b.items[i], s = iennSize_(it.sizeKey), q = Math.floor(Number(it.qty));
    if (!it.plant || !s || !(q >= 1 && q <= IENN_MAX_QTY_PER_LINE)) return { ok: false, error: 'invalid', message: 'One of the items is not valid. Please refresh and try again.' };
    lines.push({ plant: String(it.plant), size: s.key, qty: String(q), amt: iennMoney_(q * s.price) });
  }
  var total = lines.reduce(function (a, l) { return a + Number(l.amt); }, 0), sub = total / (1 + IENN_TAX_PCT / 100);
  var phone = String(b.phone || '').trim().slice(0, 40), notes = String(b.notes || '').trim().slice(0, 1000);
  var pickup = String(b.pickup || '').trim().slice(0, 100), pay = String(b.payment || '').trim().slice(0, 40);
  var data = { date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'), paid: 'unpaid', payment: '',
    customerEmail: email, discType: 'none', discAmt: '',
    note: 'Website order — ' + name + (phone ? ' · ' + phone : '') + (pickup ? '\nPickup: ' + pickup : '') + (pay ? '\nPays by: ' + pay : '') + (notes ? '\n' + notes : ''),
    lines: lines, subtotal: iennMoney_(sub), tax: iennMoney_(total - Number(iennMoney_(sub))), grand: iennMoney_(total) };
  var r = iennSubmitInvoiceChecked(data, { source: 'website', name: name });
  if (!r.ok) return r;
  return { ok: true, orderId: r.orderId, total: Number(data.grand), taxIncluded: true,
    items: lines.map(function (l) { var s = iennSize_(l.size); return { plant: iennSplit_(l.plant)[0], size: s.label, qty: Number(l.qty), price: s.price, lineTotal: Number(l.amt) }; }) };
}

function iennSubmitInvoiceChecked(data, meta) {
  meta = meta || {};
  var fromCustomerView = !meta.source;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return iennFail_(fromCustomerView, { ok: false, error: 'busy', message: 'We are busy processing another order. Please try again in a moment.' });
  try {
    var avail = iennAvailable_(), need = {}, problems = [];
    (data.lines || []).forEach(function (l) {
      var s = iennSize_(l.size); if (!s || !s.tracked) return;
      var k = iennKey_(l.plant) + '|' + s.key; need[k] = need[k] || { plant: iennSplit_(l.plant)[0], s: s, qty: 0 }; need[k].qty += Number(l.qty || 0);
    });
    Object.keys(need).forEach(function (k) {
      var n = need[k], have = (avail[k.split('|')[0]] || {})[n.s.key] || 0;
      if (n.qty > have) problems.push({ plant: n.plant, sizeKey: n.s.key, size: n.s.label, requested: n.qty, available: have });
    });
    if (problems.length) return iennFail_(fromCustomerView, { ok: false, error: 'stock', problems: problems,
      message: problems.map(function (p) { return p.available > 0 ? 'Only ' + p.available + ' ' + p.plant + ' (' + p.size + ') left — you asked for ' + p.requested + '.' : p.plant + ' (' + p.size + ') just sold out.'; }).join(' ') +
               ' Your cart has been updated; please review and submit again.' });
    var res = submitInvoice(data);
    var id = (res != null && (typeof res === 'string' || typeof res === 'number')) ? String(res)
           : (res && (res.invoiceNumber || res.invoiceNo || res.number || res.id));
    if (!id) { var all = iennInvoices_(); id = all.length ? all[all.length - 1].id : ''; }
    if (SpreadsheetApp.flush) SpreadsheetApp.flush();
    iennMarkNew_(id);
    if (IENN_EXTRA_TEAM_EMAIL) iennTeamEmail_(id, data, meta);
    return fromCustomerView ? res : { ok: true, orderId: String(id) };
  } finally { lock.releaseLock(); }
}

function iennMarkNew_(id) {
  try {
    var all = iennInvoices_(), inv = all.filter(function (x) { return x.id === String(id); })[0]; if (!inv) return;
    if (!inv.status || inv.status === 'New') all.sheet.getRange(inv.row, all.cols.status + 1).setValue('New');
    if (!inv.handledBy) all.sheet.getRange(inv.row, all.cols.handled + 1).setValue(IENN_ORDER_OWNER);
  } catch (e) {}
}

function iennCustomerClosed_() {
  var u = iennEsc_(IENN_WEBSITE_URL);
  return HtmlService.createHtmlOutput('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:40px auto;padding:0 16px;color:#2c2c2c">' +
    '<h1 style="color:#4a5a4a;font-size:22px">Orders have moved to our website</h1>' +
    '<p>Please place your order in our online shop:</p><p><a href="' + u + '" target="_top" style="display:inline-block;padding:12px 18px;background:#c0392b;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Go to the IENN shop</a></p>' +
    '<p>Questions? Call or text Andrew: <a href="tel:' + IENN_CONTACT_TEL + '">' + IENN_CONTACT_PHONE + '</a> · <a href="sms:' + IENN_CONTACT_TEL + '">Text</a></p>' +
    '<script>setTimeout(function(){ window.top.location.href = "' + u + '"; }, 4000);</script></body></html>').setTitle('IENN — order on our website');
}

function iennFail_(throwIt, r) { if (throwIt) throw new Error(r.message); return r; }

function iennTeamEmail_(id, data, meta) {
  var ok = function (a) { return a && !/PLACEHOLDER/i.test(a); };
  var to = ok(TEAM_EMAIL_TO) ? TEAM_EMAIL_TO : '', cc = TEAM_EMAIL_CC.filter(ok); if (!to && !cc.length) return false;
  if (!to) { to = cc.shift(); }
  var confirmUrl = ScriptApp.getService().getUrl() + '?view=confirm&orderId=' + encodeURIComponent(id);
  var sheetUrl = iennInvoicesSheet_().getParent().getUrl() + '#gid=' + iennInvoicesSheet_().getSheetId();
  var linesHtml = data.lines.map(function (l) { return '<li>' + l.qty + ' × ' + iennEsc_(l.plant) + ' (' + iennEsc_(l.size) + ') = $' + l.amt + '</li>'; }).join('');
  var html = '<div style="font-family:system-ui,Arial,sans-serif;color:#2c2c2c;max-width:520px">' +
    '<p>A new order came in (' + iennEsc_(meta.source || 'website') + ').</p>' +
    '<p><b>Order:</b> ' + iennEsc_(id) + '<br><b>Customer:</b> ' + iennEsc_(meta.name || '') + ' <' + iennEsc_(data.customerEmail) + '></p>' +
    '<ul>' + linesHtml + '</ul>' +
    '<p><b>Total:</b> $' + data.grand + ' (taxes included)</p>' +
    '<p><b>Notes:</b><br>' + iennEsc_(data.note || '').replace(/\n/g, '<br>') + '</p>' +
    '<p style="margin:1.5rem 0"><a href="' + confirmUrl + '" style="display:inline-block;background:#c0392b;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">Confirm order</a></p>' +
    '<p style="font-size:14px;color:#555">One tap: marks it Confirmed and saves the thank-you email (with the pickup address) in Gmail Drafts. Nothing is sent until you press Send there.</p>' +
    '<p>' + IENN_ORDER_OWNER + ' is handling this order (order-to-pickup).<br><a href="' + sheetUrl + '">View details</a>. If someone else takes it, change Handled by in IENN Invoices.</p>' +
    '</div>';
  MailApp.sendEmail({ to: to, cc: cc.join(','), subject: 'New IENN order ' + id + ' — ' + (meta.name || data.customerEmail), htmlBody: html });
  return true;
}

/** Confirm-order endpoint. GET ?view=confirm&orderId=IEN-2026-001
 * Marks Status = Confirmed and creates the customer thank-you draft in Gmail (never sends). */
function iennConfirmOrder_(orderId) {
  if (!orderId) return HtmlService.createHtmlOutput('<p>Missing order ID.</p>');
  var all = iennInvoices_();
  var inv = all.filter(function (x) { return String(x.id) === String(orderId); })[0];
  if (!inv) return HtmlService.createHtmlOutput('<p>Order ' + iennEsc_(orderId) + ' not found.</p>');
  all.sheet.getRange(inv.row, all.cols.status + 1).setValue('Confirmed');
  var draft = null;
  try { draft = iennDraftReply(orderId); } catch (e) {}
  var sheetUrl = iennInvoicesSheet_().getParent().getUrl() + '#gid=' + iennInvoicesSheet_().getSheetId();
  var html = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:40px auto;padding:0 16px;color:#2c2c2c">' +
    '<h1 style="color:#4a5a4a">Order ' + iennEsc_(orderId) + ' confirmed</h1>' +
    '<p>Status set to <b>Confirmed</b>.</p>' +
    (draft ? '<p>Thank-you email saved as a <b>draft</b> in your Gmail (not sent). Open Gmail Drafts to review and send.</p>' : '<p>Could not create the draft automatically. Use the IENN menu in the spreadsheet to draft the reply.</p>') +
    '<p><a href="' + iennEsc_(sheetUrl) + '" style="display:inline-block;padding:12px 18px;background:#6b7c6a;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">View in IENN Invoices</a></p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('Order confirmed — IENN');
}

function iennEsc_(s) { return String(s == null ? '' : s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"'); }

function iennSetup() {
  var inv = iennInventory(); iennInvoices_(); iennEnsurePromos_();
  Logger.log('Plants: ' + inv.plants.length + '; baseline count date: ' + iennBaselineDate_());
  if (false) { MailApp.getRemainingDailyQuota(); GmailApp.getDrafts(); }
}
