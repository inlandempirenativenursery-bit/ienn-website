/**
 * Website endpoints.
 *  GET  ?view=print / ?view=hub -> see IENN_Print.gs
 *  GET  ?view=inventory  -> JSON (or JSONP with &callback=) built from getInitial()/getAvailableStock() + Catalog + prices
 *  POST (text/plain JSON) -> website order, through iennSubmitInvoiceChecked -> existing submitInvoice
 *
 * WHY doPost + text/plain: a static site can send a "simple" POST (no custom headers) without a CORS preflight,
 * which Apps Script cannot answer. Apps Script redirects to googleusercontent.com and that reply carries
 * Access-Control-Allow-Origin: *, so the page can read the invoice number. Customer details stay out of URLs.
 *
 * ONE EDIT to the existing doGet(e), as its first line:   var ienn = iennRoute_(e); if (ienn) return ienn;
 * If the project already has a doPost, call iennWebsitePost_(e) from it and delete doPost below.
 */
function iennJson_(obj, cb) {
  var s = JSON.stringify(obj);
  if (cb && /^[A-Za-z_$][\w$]*$/.test(cb)) return ContentService.createTextOutput(cb + '(' + s + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

function iennRoute_(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'confirm') return iennConfirmRoute_(p);
  if (p.view === 'confirm') return iennConfirmRoute_({ id: p.orderId || p.id, t: p.t });   // alias ?view=confirm&orderId=…&t=…; same signed HMAC check, bad/missing token = generic page, nothing changed    // one-tap Confirm link in Andrew's alert (IENN_Confirm.gs)
  if (p.view === 'customer') return iennCustomerClosed_();     // public orders now go through the website only
  if (p.view === 'print' || p.view === 'printlist') return iennPrintRoute_(p);
  if (p.view === 'hub') return HtmlService.createHtmlOutput(iennHubHtml_()).setTitle('IENN team home');
  if (p.view !== 'inventory') return null;
  try { return iennJson_(iennInventory(), p.callback); } catch (err) { return iennJson_({ ok: false, error: String(err.message || err) }, p.callback); }
}

/** {version:3, taxPct, sizes:[{key,label,price,tracked}], plants:[{name, fullName, botanical, image, sizes:[{key,size,price,qty}]}]}
    qty = READY count left (0 = not available), extra = smaller on-hand not retail-ready (null without a count), canRequest = extra>0; qty: number for tracked sizes once a count exists; null when no count yet (countDate null), null for untracked sizes (= "Available on request"). Prices include tax. */
function iennInventory() {
  var baseline = iennBaselineDate_(), init = getInitial() || {}, avail = iennAvailable_(baseline), known = !!baseline, photos = iennCatalogPhotos_(), seen = {}, names = [];
  (init.plants || []).concat(iennCatalogNames_()).forEach(function (n) { var k = iennKey_(n); if (k && !seen[k]) { seen[k] = 1; names.push(n); } });
  var plants = names.map(function (full) {
    var nb = iennSplit_(full), a = avail[iennKey_(full)] || {};
    return { name: nb[0], fullName: full, botanical: nb[1], image: photos[iennKey_(full)] || photos[iennKey_(nb[0])] || '',
      sizes: IENN_SIZES.map(function (s) { var q = s.tracked && known ? (a[s.key] || 0) : null, x = s.tracked && known ? ((a.__extra || {})[s.key] || 0) : null;
        return { key: s.key, size: s.label, price: s.price, qty: q, extra: x, canRequest: x !== null && x > 0 }; }) };
  });
  return { version: 3, updated: new Date().toISOString(), countDate: baseline ? baseline.toISOString() : null, taxIncluded: true, onRequestLabel: IENN_ON_REQUEST_LABEL, contactPhone: IENN_CONTACT_PHONE,
    sizes: IENN_SIZES.map(function (s) { return { key: s.key, label: s.label, price: s.price, tracked: s.tracked }; }), plants: iennSortPlants_(plants), sortedBy: 'pin,popularity' + IENN_POPULAR_DAYS + 'd',
    promo: iennPromo_() };
}

function doPost(e) { return iennWebsitePost_(e); }
function iennWebsitePost_(e) {
  var b; try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { b = null; }
  return iennJson_(iennWebsiteOrder_(b));
}

function iennMoney_(n) { return (Math.round(n * 100) / 100).toFixed(2); }

/** Website body {name,email,phone,notes,items:[{plant (fullName), sizeKey, qty}]} -> existing submitInvoice data shape. */
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
    lines.push({ plant: String(it.plant), size: s.key, qty: String(q), amt: iennMoney_(q * s.price) });   // server prices, never client prices
  }
  var total = lines.reduce(function (a, l) { return a + Number(l.amt); }, 0), sub = total / (1 + IENN_TAX_PCT / 100);   // prices include tax
  var phone = String(b.phone || '').trim().slice(0, 40), notes = String(b.notes || '').trim().slice(0, 1000);
  var pickup = String(b.pickup || '').trim().slice(0, 100), pay = String(b.payment || '').trim().slice(0, 40);
  var data = { date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'), paid: 'unpaid', payment: pay,
    customerEmail: email, discType: 'none', discAmt: '',
    note: 'Website order — ' + name + (phone ? ' · ' + phone : '') + (pickup ? '\nPickup: ' + pickup : '') + (pay ? '\nPays by: ' + pay : '') + (notes ? '\n' + notes : ''),
    customerNote: (pickup ? 'Pickup preference: ' + pickup + (notes ? '\n' : '') : '') + notes,
    lines: lines, subtotal: iennMoney_(sub), tax: iennMoney_(total - Number(iennMoney_(sub))), grand: iennMoney_(total) };
  var r = iennSubmitInvoiceChecked(data, { source: 'website', name: name });
  if (!r.ok) return r;
  return { ok: true, orderId: r.orderId, notices: r.notices || [], total: Number(data.grand), taxIncluded: true,
    items: lines.map(function (l) { var s = iennSize_(l.size); return { plant: iennSplit_(l.plant)[0], size: s.label, qty: Number(l.qty), price: s.price, lineTotal: Number(l.amt) }; }) };
}

/**
 * Stock-checked wrapper around the EXISTING submitInvoice(data). Use it for every order path:
 * the website calls it via doPost, and the customer view can too (change `.submitInvoice(data)` to
 * `.iennSubmitInvoiceChecked(data)` in its HTML). Takes a script lock, re-checks available stock,
 * calls submitInvoice (which writes IENN Invoices, so the sale is then subtracted automatically). Throws for google.script.run callers on failure.
 */
function iennSubmitInvoiceChecked(data, meta) {
  meta = meta || {};
  var fromCustomerView = !meta.source;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return iennFail_(fromCustomerView, { ok: false, error: 'busy', message: 'We are busy processing another order. Please try again in a moment.' });
  try {
    var chk = iennStockCheck_(data.lines, iennAvailable_()), problems = chk.problems;
    if (problems.length) return iennFail_(fromCustomerView, { ok: false, error: 'stock', problems: problems,
      message: chk.message +
               ' Your cart has been updated; please review and submit again.' });

    var res = submitInvoice(data), notices = (res && res.notices) || data.notices || chk.notices;                                         // existing: writes IENN Invoices + emails team
    var id = (res != null && (typeof res === 'string' || typeof res === 'number')) ? String(res)
           : (res && (res.invoiceNumber || res.invoiceNo || res.invno || res.number || res.id));
    if (!id) { var all = iennInvoices_(); id = all.length ? all[all.length - 1].id : ''; }   // newest invoice row
    if (SpreadsheetApp.flush) SpreadsheetApp.flush();
    iennMarkNew_(id);
    if (IENN_EXTRA_TEAM_EMAIL) iennTeamEmail_(id, data, meta);
    return fromCustomerView ? res : { ok: true, orderId: String(id), notices: notices };
  } finally { lock.releaseLock(); }
}
/** New invoice: Status = New, Handled by = Andrew (if blank). */
function iennMarkNew_(id) {
  try {
    var all = iennInvoices_(), inv = all.filter(function (x) { return x.id === String(id); })[0]; if (!inv) return;
    if (!inv.status || inv.status === 'New') all.sheet.getRange(inv.row, all.cols.status + 1).setValue('New');
    if (!inv.handledBy) all.sheet.getRange(inv.row, all.cols.handled + 1).setValue(IENN_ORDER_OWNER);
  } catch (e) { /* never fail an order over status columns */ }
}

/** The old public ?view=customer no longer takes orders: short message + link to the website shop. */
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
  var link = iennConfirmLink_(id), sheetUrl = iennInvoicesSheet_().getParent().getUrl() + '#gid=' + iennInvoicesSheet_().getSheetId();
  var reqs = iennRequestNote_(data.notices), notesOnly = String(data.note || '').replace(/^REQUEST: .*\n?/gm, '');
  var items = data.lines.map(function (l) { return l.qty + ' × ' + l.plant + ' (' + l.size + ') = $' + l.amt; });
  var body = 'A new order came in (' + (meta.source || 'customer view') + ').\n\nOrder: ' + id + '\nCustomer: ' + (meta.name || '') + ' <' + data.customerEmail + '>\n\n' +
    items.map(function (x) { return '  ' + x; }).join('\n') +
    '\n\nTotal: $' + data.grand + ' (taxes included)' + (reqs ? '\n\n' + reqs : '') + '\nNotes: ' + notesOnly + '\n\n' + IENN_ORDER_OWNER + ' is handling this order (order-to-pickup).' +
    (link ? '\n\nCONFIRM ORDER (one tap, saves the thank-you email to Gmail Drafts, sends nothing): ' + link : '') +
    '\n\nView details: ' + sheetUrl + '\nIf someone else takes it, change Handled by in IENN Invoices.';
  var E = iennEsc_, html = '<div style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#2c2c2c;max-width:560px">' +
    '<p>A new order came in (' + E(meta.source || 'customer view') + ').</p><p><b>Order:</b> ' + E(id) + '<br><b>Customer:</b> ' + E(meta.name || '') + ' &lt;' + E(data.customerEmail) + '&gt;</p>' +
    '<ul>' + items.map(function (x) { return '<li>' + E(x) + '</li>'; }).join('') + '</ul><p><b>Total: $' + E(data.grand) + '</b> (taxes included)</p>' +
    (reqs ? '<p style="background:#fdecea;border-left:4px solid #c0392b;padding:8px"><b>' + E(reqs).replace(/\n/g, '<br>') + '</b></p>' : '') + '<p><b>Notes:</b><br>' + E(notesOnly).replace(/\n/g, '<br>') + '</p>' +
    (link ? '<p><a href="' + E(link) + '" style="display:inline-block;padding:14px 22px;background:#c0392b;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:17px">Confirm order</a><br>' +
      '<small>One tap: marks it Confirmed and saves the thank-you email (with the pickup address) in Gmail Drafts. Nothing is sent until you press Send there.</small></p>' : '') +
    '<p>' + E(IENN_ORDER_OWNER) + ' is handling this order (order-to-pickup). <a href="' + E(sheetUrl) + '">View details</a>. If someone else takes it, change Handled by in IENN Invoices.</p></div>';
  MailApp.sendEmail({ to: to, cc: cc.join(','), subject: 'New IENN order ' + id + ' — ' + (meta.name || data.customerEmail), body: body, htmlBody: html });
  return true;
}

/** Run once from the editor: authorises scopes, adds Status/Handled by/Our response columns to IENN Invoices, logs what it found. */
function iennSetup() {
  var pinAdded = iennEnsureCatalogPin_(), badgeAdded = iennEnsureCatalogBadge_(); var inv = iennInventory(); iennInvoices_(); iennEnsurePromos_(); iennConfirmSecret_();
  Logger.log('Plants: ' + inv.plants.length + '; baseline count date: ' + iennBaselineDate_() + '; Catalog Pin column ' + (pinAdded ? 'added' : 'already there') + '; Badge column ' + (badgeAdded ? 'added' : 'already there'));
  if (false) { MailApp.getRemainingDailyQuota(); GmailApp.getDrafts(); ScriptApp.getService(); }
}
