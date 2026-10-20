/**
 * Customer reply drafts (NEVER sent automatically). Template mirrors templates/order-response-email.md.
 * Use: in IENN Invoices click the order row, set Status = Claimed, your name in "Handled by", type the reply in
 * "Our response", then IENN menu > Draft reply for selected order. The draft lands in YOUR Gmail Drafts; you send it.
 * If the project already has onOpen(), delete the one below and call iennAddMenu_() from yours.
 */
/* One uniform "look, verify, confirm" reply. Everything is filled from the order; the team only checks it and sends.
   Anything still in {{...}} (for example {{PICKUP_ADDRESS}}) must be filled in by hand before sending. */
var RESPONSE_TEMPLATE =
  'Hi {{CUSTOMER_NAME}},\n\n' +
  'Thanks for your order with Inland Empire Native Nursery! Please look it over and reply to confirm (or tell us what to change).\n\n' +
  'Order number: {{ORDER_ID}}\n\n' +
  'Your plants:\n{{ITEMS}}\n\n' +
  'Total: ${{TOTAL}} (taxes included)\n\n' +
  'Pickup location: {{PICKUP_ADDRESS}} ({{PICKUP_AREA}})\n' +
  'Pickup schedule: {{PICKUP_SCHEDULE}}\n' +
  'Your pickup date: {{PICKUP_DATE}}\n\n' +
  'Payment: {{PAYMENT_TERMS}}{{PAYMENT_CHOICE}}\n' +
  'Payment status: {{PAID_STATUS}}\n\n' +
  'Your notes: {{CUSTOMER_NOTES}}\n\n' +
  'Our notes: {{OUR_RESPONSE}}\n\n' +
  'Questions or changes? Call or text {{OWNER}}: {{PHONE}}\n\n' +
  '{{SIGN_OFF}}\n\n' +
  '{{PICKUP_FINE_PRINT}}\n';

/** 'Saturday, October 24, 2026': the first Saturday on or after the order date (Pacific). The team verifies it before sending. */
function iennNextSaturday_(d) {
  var ymd = Utilities.formatDate(d || new Date(), IENN_PROMO_TZ, 'yyyy-MM-dd').split('-').map(Number), t = new Date(Date.UTC(ymd[0], ymd[1] - 1, ymd[2]));
  t.setUTCDate(t.getUTCDate() + (6 - t.getUTCDay() + 7) % 7);
  var M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return 'Saturday, ' + M[t.getUTCMonth()] + ' ' + t.getUTCDate() + ', ' + t.getUTCFullYear();
}

function onOpen() { iennAddMenu_(); }
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
function iennBuildReply_(orderId) {
  var inv = iennInvoices_().filter(function (x) { return String(x.id) === String(orderId); })[0];
  if (!inv) throw new Error('Order ' + orderId + ' not found in ' + IENN_INVOICES_SHEET);
  var sub = 0, items = inv.lines.map(function (l) { var s = iennSize_(l.size), p = s ? s.price : Number(l.amt) / l.qty; sub += l.qty * p;
    return '  - ' + l.qty + ' × ' + iennSplit_(l.plant)[0] + ' (' + (s ? s.label : l.size) + ') @ $' + p + ' = $' + (l.qty * p).toFixed(2); }).join('\n');
  var note = String(inv.note || ''), m = /^Website order — ([^·\n]+)/.exec(note), pays = /^Pays by: (.+)$/m.exec(note);
  var notes = note.replace(/^Website order — [^\n]*\n?/, '').replace(/^Pickup: .*\n?/m, '').replace(/^Pays by: .*\n?/m, '').trim();
  var choice = String(inv.payment || (pays ? pays[1] : '')).trim();
  var confirmed = IENN_CONFIRMED_STATUSES.indexOf(String(inv.status)) >= 0;   // exact address only after Andrew confirms
  var map = { CUSTOMER_NAME: m ? m[1].trim() : 'there', ORDER_ID: inv.id, ITEMS: items, TOTAL: sub.toFixed(2), OWNER: IENN_ORDER_OWNER, PHONE: IENN_CONTACT_PHONE,
    PAID_STATUS: /^(yes|y|true|paid)$/i.test(String(inv.paid)) || /paid/i.test(String(inv.status)) ? 'Paid, thank you!' : 'Not paid yet (pay at pickup)',
    PAYMENT_TERMS: PAYMENT_TERMS, PAYMENT_CHOICE: choice ? ' (you chose ' + choice + ')' : ' ',
    PICKUP_ADDRESS: confirmed ? PICKUP_ADDRESS : PICKUP_UNCONFIRMED_TEXT, PICKUP_AREA: PICKUP_AREA, PICKUP_SCHEDULE: PICKUP_SCHEDULE, PICKUP_DATE: iennNextSaturday_(inv.date),
    PICKUP_FINE_PRINT: PICKUP_FINE_PRINT.concat(confirmed && PICKUP_ALT_ADDRESS && !/\{\{/.test(PICKUP_ALT_ADDRESS) ? ['Alternate pickup (available upon request): ' + PICKUP_ALT_ADDRESS] : []).join('\n'),
    CUSTOMER_NOTES: notes || '(none)', OUR_RESPONSE: inv.response || '(none)', SIGN_OFF: SIGN_OFF };
  var body = RESPONSE_TEMPLATE.replace(/\{\{([A-Z_]+)\}\}/g, function (x, k) { return map[k] != null && map[k] !== '' ? String(map[k]) : x; });
  return { to: inv.email, subject: 'Your Inland Empire Native Nursery order ' + inv.id, body: body };
}

/** Andrew confirms an order: Status = Confirmed, then a Gmail DRAFT with the exact pickup address (not sent).
    Works in a standalone project too: run from the editor, e.g. iennConfirmAndDraft('IEN-2026-004'). */
function iennConfirmAndDraft(orderId) {
  var all = iennInvoices_(), inv = all.filter(function (x) { return String(x.id) === String(orderId); })[0];
  if (!inv) throw new Error('Order ' + orderId + ' not found in ' + IENN_INVOICES_SHEET);
  if (/cancel/i.test(String(inv.status))) throw new Error('Order ' + orderId + ' is Cancelled.');
  if (IENN_CONFIRMED_STATUSES.indexOf(String(inv.status)) < 0) all.sheet.getRange(inv.row, all.cols.status + 1).setValue('Confirmed');
  return iennDraftReply(orderId);
}
/** Editor helper: confirm + draft the newest order that is still New or Claimed. */
function iennConfirmAndDraftLatest() {
  var open = iennInvoices_().filter(function (x) { return /^(new|claimed)$/i.test(String(x.status || 'New')); });
  if (!open.length) throw new Error('No New or Claimed orders.');
  var d = iennConfirmAndDraft(open[open.length - 1].id); Logger.log('Draft saved (not sent): ' + d.subject + ' to ' + d.to); return d;
}

/** Creates a Gmail DRAFT for the order (not sent). */
function iennDraftReply(orderId) {
  var d = iennBuildReply_(orderId);
  GmailApp.createDraft(d.to, d.subject, d.body);
  return d;
}
