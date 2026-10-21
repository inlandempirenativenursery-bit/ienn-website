/**
 * Customer reply drafts (NEVER sent automatically). Template mirrors templates/order-response-email.md.
 * Use: in IENN Invoices click the order row, set Status = Claimed, your name in "Handled by", type the reply in
 * "Our response", then IENN menu > Draft reply for selected order. The draft lands in YOUR Gmail Drafts; you send it.
 * If the project already has onOpen(), delete the one below and call iennAddMenu_() from yours.
 */
/* One uniform "look, verify, confirm" reply. Everything is filled from the order; the team only checks it and sends.
   Anything still in {{...}} (for example {{PICKUP_ADDRESS}}) must be filled in by hand before sending. */
/* Warm thank-you + pickup confirmation (Eric's words). Saved as a Gmail DRAFT only; Andrew edits and sends. */
var RESPONSE_TEMPLATE =
  'Hi {{CUSTOMER_NAME}},\n\n' +
  'Thanks for ordering, and thanks for choosing us.\n\n' +
  'Order number: {{ORDER_ID}}\n\n' +
  '{{ITEMS}}\n\n' +
  'Total: ${{TOTAL}} (taxes included)\n\n' +
  'Pickup: Saturdays 10 a.m. – 2 p.m. in Fontana{{PICKUP_DATE_LINE}}\n\n' +
  "Here's the location: {{PICKUP_ADDRESS}}\n\n" +
  'Payment: Cash or Zelle at time of pickup.\n\n' +
  "If you have any questions, don't hesitate to reach out. Call or text {{OWNER}}: {{PHONE}}\n\n" +
  'Inland Empire Native Nursery\n';

/** 'Saturday, October 24, 2026': the first Saturday on or after the order date (Pacific). The team verifies it before sending. */
function iennNextSaturday_(d) {
  var ymd = Utilities.formatDate(d || new Date(), IENN_PROMO_TZ, 'yyyy-MM-dd').split('-').map(Number), t = new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2]));
  t.setUTCDate(t.getUTCDate() + (6 - t.getUTCDay() + 7) % 7);
  var M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return 'Saturday, ' + M[t.getUTCMonth()] + ' ' + t.getUTCDate() + ', ' + t.getUTCFullYear();
}

function onOpen() { try { iennAddMenu_(); } catch (e) { /* standalone project: no sheet UI; run iennConfirmAndDraftLatest() from the editor */ } }
function iennAddMenu_() {
  SpreadsheetApp.getUi().createMenu('IENN')
    .addItem('Draft reply for selected order', 'iennDraftReplyForSelection')
    .addItem('Claim selected order (Andrew)', 'iennClaimSelection')
    .addSeparator()
    .addItem('Printable plant list (open)', 'iennOpenPrintList')
    .addItem('Export plant list: PDF to Drive', 'iennExportPdfToDrive')
    .addItem('Export plant list: Google Sheet', 'iennExportSheet')
    .addToUi();
}

function iennSelectedInvoice_() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== IENN_INVOICES_SHEET) throw new Error('Open the ' + IENN_INVOICES_SHEET + ' tab and click the order row first.');
  var row = sh.getActiveRange().getRow(), all = iennInvoices_();
  for (var i = all.length - 1; i >= 0; i--) if (all[i].row <= row) return all[i];
  throw new Error('No order on that row.');
}

function iennClaimSelection() {
  var inv = iennSelectedInvoice_(), all = iennInvoices_(), me = IENN_ORDER_OWNER;   // Andrew owns order-to-pickup; edit the cell to hand off
  all.sheet.getRange(inv.row, all.cols.status + 1).setValue('Claimed');
  all.sheet.getRange(inv.row, all.cols.handled + 1).setValue(me);
  SpreadsheetApp.getUi().alert('Order ' + inv.id + ' claimed by ' + me + '.');
}

function iennDraftReplyForSelection() {
  var d = iennDraftReply(iennSelectedInvoice_().id);
  SpreadsheetApp.getUi().alert('Draft saved in your Gmail Drafts (not sent):\n' + d.subject);
}

/** Builds the reply for an invoice in IENN Invoices (by invoice/order ID). */
function iennBuildReply_(orderId, assumeConfirmed) {
  var inv = iennInvoices_().filter(function (x) { return String(x.id) === String(orderId); })[0];
  if (!inv) throw new Error('Order ' + orderId + ' not found in ' + IENN_INVOICES_SHEET);
  var sub = 0, items = inv.lines.map(function (l) { var s = iennSize_(l.size), p = s ? s.price : Number(l.amt) / l.qty; sub += l.qty * p;
    return iennSplit_(l.plant)[0] + ', ' + (s ? s.label : l.size) + ', qty ' + l.qty + ', $' + (l.qty * p).toFixed(2); }).join('\n');
  var note = String(inv.note || ''), m = /^Website order — ([^·\n]+)/.exec(note), pays = /^Pays by: (.+)$/m.exec(note);
  var notes = note.replace(/^Website order — [^\n]*\n?/, '').replace(/^Pickup: .*\n?/m, '').replace(/^Pays by: .*\n?/m, '').trim();
  var choice = String(inv.payment || (pays ? pays[1] : '')).trim();
  var confirmed = !!assumeConfirmed || IENN_CONFIRMED_STATUSES.indexOf(String(inv.status)) >= 0;   // exact address only after Andrew confirms
  var map = { CUSTOMER_NAME: m ? m[1].trim() : 'there', ORDER_ID: inv.id, ITEMS: items, TOTAL: sub.toFixed(2), OWNER: IENN_ORDER_OWNER, PHONE: IENN_CONTACT_PHONE,
    PAID_STATUS: /^(yes|y|true|paid)$/i.test(String(inv.paid)) || /paid/i.test(String(inv.status)) ? 'Paid, thank you!' : 'Not paid yet (pay at pickup)',
    PAYMENT_TERMS: PAYMENT_TERMS.replace(/\.$/, ''), PAYMENT_CHOICE: choice ? ' (you chose ' + choice + ').' : '.',
    PICKUP_ADDRESS: confirmed ? PICKUP_ADDRESS : PICKUP_UNCONFIRMED_TEXT, PICKUP_AREA: PICKUP_AREA, PICKUP_SCHEDULE: PICKUP_SCHEDULE, PICKUP_DATE: iennNextSaturday_(inv.date), PICKUP_DATE_LINE: inv.date ? ' (your pickup date: ' + iennNextSaturday_(inv.date) + ')' : '',
    PICKUP_FINE_PRINT: PICKUP_FINE_PRINT.join('\n'),
    CUSTOMER_NOTES: notes || '(none)', OUR_RESPONSE: inv.response || '(none)', SIGN_OFF: SIGN_OFF };
  var body = RESPONSE_TEMPLATE.replace(/\{\{([A-Z_]+)\}\}/g, function (x, k) { return map[k] != null && map[k] !== '' ? String(map[k]) : x; });
  var rows = inv.lines.map(function (l) { var s = iennSize_(l.size), p = s ? s.price : Number(l.amt) / l.qty; return { plant: iennSplit_(l.plant)[0], size: s ? s.label : l.size, qty: l.qty, amount: l.qty * p }; });
  return { to: inv.email, subject: 'Your Inland Empire Native Nursery order ' + inv.id, body: body, inv: inv, items: rows, total: sub, name: map.CUSTOMER_NAME, confirmed: confirmed };
}

/** Andrew confirms an order: Status = Confirmed, then a Gmail DRAFT with the exact pickup address (not sent).
    Works in a standalone project too: run from the editor, e.g. iennConfirmAndDraft('IEN-2026-004'). */
function iennConfirmAndDraft(orderId) {
  var all = iennInvoices_(), inv = all.filter(function (x) { return String(x.id) === String(orderId); })[0];
  if (!inv) throw new Error('Order ' + orderId + ' not found in ' + IENN_INVOICES_SHEET);
  if (/cancel/i.test(String(inv.status))) throw new Error('Order ' + orderId + ' is Cancelled.');
  if (all.cols.status < 0) throw new Error('Status column missing in ' + IENN_INVOICES_SHEET);
  var d = iennDraftReply(orderId, true);   // draft FIRST: if Gmail fails, the status is untouched
  if (IENN_CONFIRMED_STATUSES.indexOf(String(inv.status)) < 0) all.sheet.getRange(inv.row, all.cols.status + 1).setValue('Confirmed');
  try { PropertiesService.getScriptProperties().setProperty('IENN_DRAFT_' + orderId, d.draftId || new Date().toISOString()); } catch (e) { /* draft still saved */ }
  return d;
}
/** Editor helper: confirm + draft the newest order that is still New or Claimed. */
function iennConfirmAndDraftLatest() {
  var open = iennInvoices_().filter(function (x) { return /^(new|claimed)$/i.test(String(x.status || 'New')); });
  if (!open.length) throw new Error('No New or Claimed orders.');
  var d = iennConfirmAndDraft(open[open.length - 1].id); Logger.log('Draft saved (not sent): ' + d.subject + ' to ' + d.to); return d;
}

/** Creates a Gmail DRAFT for the order (not sent). */
function iennDraftReply(orderId, assumeConfirmed) {
  var d = iennBuildReply_(orderId, assumeConfirmed);
  if (!d.to || !/@/.test(String(d.to))) throw new Error('E_NO_EMAIL: order ' + orderId + ' has no customer email');
  var opts = {}, pdf = null;   // PDF invoice only on the post-confirmation draft; a PDF failure never blocks the draft
  if (d.confirmed) { try { pdf = iennInvoicePdf_(d); } catch (e) { pdf = null; try { Logger.log('IENN invoice PDF failed for ' + orderId + ': ' + (e && e.message || e)); } catch (x) {} } }
  if (pdf) opts.attachments = [pdf];
  d.pdfName = pdf ? 'IENN-Invoice-' + d.inv.id + '.pdf' : '';
  var g = GmailApp.createDraft(d.to, d.subject, d.body, opts);
  try { d.draftId = g && g.getId ? g.getId() : ''; } catch (e) { d.draftId = ''; }
  return d;
}

/** Per-order invoice (same style + locked logo as the print list). Attached only to the post-confirmation draft, so the exact address is allowed. */
function iennInvoiceHtml_(d) {
  var E = iennEsc_, date = d.inv.date ? Utilities.formatDate(new Date(d.inv.date), IENN_PROMO_TZ, 'MMMM d, yyyy') : '';
  var rows = d.items.map(function (x) { return '<tr><td>' + E(x.plant) + '</td><td>' + E(x.size) + '</td><td>' + E(x.qty) + '</td><td>$' + Number(x.amount).toFixed(2) + '</td></tr>'; }).join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>IENN invoice ' + E(d.inv.id) + '</title><style>' +
    'body{font-family:system-ui,Arial,sans-serif;color:#2c2c2c;margin:24px}header{display:flex;align-items:center;gap:12px;margin-bottom:8px}header img{height:64px}' +
    'h1{font-size:20px;color:#4a5a4a;margin:0}.sub{color:#555;font-size:12px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}' +
    'th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}th{background:#f8f6f3;color:#4a5a4a}.tot{font-weight:700;font-size:15px;margin-top:10px}' +
    '</style></head><body><header><img src="' + E(IENN_LOGO_URL) + '" alt="Inland Empire Native Nursery logo"><div><h1>Inland Empire Native Nursery — Invoice</h1>' +
    '<div class="sub">Order ' + E(d.inv.id) + (date ? ' · ' + E(date) : '') + ' · ' + E(d.name) + '</div></div></header>' +
    '<table><thead><tr><th>Plant</th><th>Size</th><th>Qty</th><th>Price</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<p class="tot">Total: $' + Number(d.total).toFixed(2) + ' (taxes included)</p>' +
    '<p class="sub">Pickup: Saturdays 10 a.m. – 2 p.m. · ' + E(PICKUP_ADDRESS) + '<br>Payment: Cash or Zelle at time of pickup · Call or text ' + E(IENN_ORDER_OWNER) + ': ' + E(IENN_CONTACT_PHONE) + '</p></body></html>';
}
function iennInvoicePdf_(d) {
  return Utilities.newBlob(iennInvoiceHtml_(d), 'text/html', 'invoice.html').getAs('application/pdf').setName('IENN-Invoice-' + d.inv.id + '.pdf');
}

/** Run ONCE from the editor (select it, Run): forces the Gmail authorization prompt for the web app's owner.
    Creates a draft to yourself and deletes it right away. Nothing is sent. */
function iennTestDraftAuth() {
  var me = Session.getEffectiveUser().getEmail() || IENN_DRAFTS_ACCOUNT;
  var d = GmailApp.createDraft(me, 'IENN draft auth test (auto-deleted)', 'Authorization test. Safe to ignore.');
  d.deleteDraft();
  Logger.log('Gmail drafts OK for ' + me + ' (test draft created and deleted). Now redeploy the web app as a New version.');
  return true;
}
