/**
 * Customer reply drafts (NEVER sent automatically). Template mirrors templates/order-response-email.md.
 * Use: in IENN Invoices click the order row, set Status = Claimed, your name in "Handled by", type the reply in
 * "Our response", then IENN menu > Draft reply for selected order. The draft lands in YOUR Gmail Drafts; you send it.
 * If the project already has onOpen(), delete the one below and call iennAddMenu_() from yours.
 */
var RESPONSE_TEMPLATE =
  'Hi {{CUSTOMER_NAME}},\n\n' +
  'Thanks for your order! Please look it over below and let us know if anything needs to change.\n\n' +
  'Order number: {{ORDER_ID}}\n\n' +
  'Items:\n{{ITEMS}}\n\n' +
  'Total: ${{TOTAL}} (taxes included)\n\n' +
  'Payment: {{PAYMENT_METHOD}}\nPayment status: {{PAID_STATUS}}\n\n' +
  'Pickup location: {{PICKUP_ADDRESS}}, {{PICKUP_CITY}}\n' +
  'Pickup hours: {{PICKUP_SCHEDULE}}\n' +
  '{{PICKUP_FINE_PRINT}}\n\n' +
  'Your notes: {{CUSTOMER_NOTES}}\n\n' +
  'Our notes: {{OUR_RESPONSE}}\n\n' +
  'Questions? Call or text {{OWNER}}: {{PHONE}}\n\n' +
  '{{SIGN_OFF}}\n';

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
  var note = String(inv.note || ''), m = /^Website order — ([^·\n]+)/.exec(note);
  var map = { CUSTOMER_NAME: m ? m[1].trim() : 'there', ORDER_ID: inv.id, ITEMS: items, TOTAL: sub.toFixed(2), OWNER: IENN_ORDER_OWNER, PHONE: IENN_CONTACT_PHONE,
    PAID_STATUS: /^(yes|y|true|paid)$/i.test(String(inv.paid)) || /paid/i.test(String(inv.status)) ? 'Paid — thank you!' : 'Not paid yet (pay at pickup)',
    PAYMENT_METHOD: inv.payment || DEFAULT_PAYMENT_METHOD, PICKUP_ADDRESS: PICKUP_ADDRESS, PICKUP_CITY: PICKUP_CITY, PICKUP_SCHEDULE: PICKUP_SCHEDULE, PICKUP_FINE_PRINT: PICKUP_FINE_PRINT.join('\n'),
    CUSTOMER_NOTES: note.replace(/^Website order — [^\n]*\n?/, '') || '(none)', OUR_RESPONSE: inv.response || '(none)', SIGN_OFF: SIGN_OFF };
  var body = RESPONSE_TEMPLATE.replace(/\{\{([A-Z_]+)\}\}/g, function (x, k) { return map[k] != null && map[k] !== '' ? String(map[k]) : x; });
  return { to: inv.email, subject: 'Your Inland Empire Native Nursery order ' + inv.id, body: body };
}

/** Creates a Gmail DRAFT for the order (not sent). */
function iennDraftReply(orderId) {
  var d = iennBuildReply_(orderId);
  GmailApp.createDraft(d.to, d.subject, d.body);
  return d;
}
