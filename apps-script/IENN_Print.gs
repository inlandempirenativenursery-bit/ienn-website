/**
 * Printable plant list + team hub. Routes (handled by iennRoute_ in IENN_Website.gs):
 *   ?view=print            print-friendly HTML (browser Print / Save as PDF)
 *   ?view=print&format=pdf PDF download (HTML converted by Apps Script)
 *   ?view=print&format=csv CSV download
 *   ?view=hub              internal home: Counts, Orders/Invoices, Print list, Website
 * Logo: uses the locked logo file from the website as-is (IENN_LOGO_URL); not redrawn or recoloured.
 */
var IENN_LOGO_URL = 'https://inlandempirenativenursery-bit.github.io/ienn-website/images/ienn-logo-sage.png'; // set to where the site is hosted
var IENN_WEBSITE_URL = 'https://inlandempirenativenursery-bit.github.io/ienn-website/order.html';             // set to the live order page
var IENN_APPEAL_KEYWORDS = ['white sage', 'salvia apiana', 'monkeyflower', 'mimulus', 'diplacus', 'poppy', 'eschscholzia', 'penstemon',
  'sage', 'salvia', 'buckwheat', 'eriogonum', 'milkweed', 'asclepias', 'lupine', 'woolly blue curls', 'ceanothus', 'yarrow', 'achillea',
  'verbena', 'aster', 'fuchsia', 'epilobium', 'coreopsis', 'encelia'];

function iennEsc_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function iennAppeal_(p) { var t = (p.name + ' ' + p.botanical).toLowerCase(); for (var i = 0; i < IENN_APPEAL_KEYWORDS.length; i++) if (t.indexOf(IENN_APPEAL_KEYWORDS[i]) >= 0) return i; return 999; }
function iennAvailText_(z) { return z.qty == null ? 'On request' : z.qty > 0 ? String(z.qty) : 'Sold out'; }

/** Plants sorted: anything available first, then appeal keywords, then A–Z. */
function iennPrintRows_() {
  var inv = iennInventory();
  var rank = function (p) { return p.sizes.some(function (z) { return z.qty > 0; }) ? 0 : 1; };
  return { inv: inv, plants: inv.plants.slice().sort(function (a, b) { return rank(a) - rank(b) || iennAppeal_(a) - iennAppeal_(b) || a.name.localeCompare(b.name); }) };
}

function iennPrintHtml_() {
  var d = iennPrintRows_(), date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy');
  var head = d.inv.sizes.map(function (s) { return '<th>' + iennEsc_(s.label) + '<br><small>$' + s.price + '</small></th>'; }).join('');
  var rows = d.plants.map(function (p) {
    return '<tr><td><b>' + iennEsc_(p.name) + '</b>' + (p.botanical ? '<br><i>' + iennEsc_(p.botanical) + '</i>' : '') + '</td>' +
      p.sizes.map(function (z) { var t = iennAvailText_(z); return '<td class="' + (t === 'Sold out' ? 'out' : '') + '">' + t + '</td>'; }).join('') + '</tr>';
  }).join('');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>IENN plant list ' + date + '</title><style>' +
    'body{font-family:system-ui,Arial,sans-serif;color:#2c2c2c;margin:24px}header{display:flex;align-items:center;gap:12px;margin-bottom:8px}' +
    'header img{height:56px}h1{font-size:20px;color:#4a5a4a;margin:0}.sub{color:#555;font-size:12px}' +
    'table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}' +
    'th{background:#f8f6f3;color:#4a5a4a}td.out{color:#999}.btns{margin:8px 0}.btns a{margin-right:12px}@media print{.btns{display:none}}' +
    '</style></head><body><header><img src="' + iennEsc_(IENN_LOGO_URL) + '" alt="Inland Empire Native Nursery logo"><div><h1>Inland Empire Native Nursery — Plant list</h1>' +
    '<div class="sub">' + date + ' · Prices by size, taxes included · Numbers = available now · "On request" = ask us</div></div></header>' +
    '<div class="btns"><a href="javascript:window.print()">Print</a><a href="?view=print&format=pdf">Export PDF</a><a href="?view=print&format=csv">Export CSV</a></div>' +
    '<table><thead><tr><th>Plant</th>' + head + '</tr></thead><tbody>' + rows + '</tbody></table>' +
    '<p class="sub">Pickup only · Fontana area · Saturdays 10 AM – 2 PM · Cash or Zelle · Call or text Andrew: <a href="tel:' + IENN_CONTACT_TEL + '">' + IENN_CONTACT_PHONE + '</a></p><p class="sub" style="font-size:10px">Grand Terrace pickup available upon request.</p></body></html>';
}

function iennPrintCsv_() {
  var d = iennPrintRows_(), q = function (s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  var lines = [['Plant', 'Botanical'].concat(d.inv.sizes.map(function (s) { return s.label + ' ($' + s.price + ')'; })).map(q).join(',')];
  d.plants.forEach(function (p) { lines.push([p.name, p.botanical].concat(p.sizes.map(iennAvailText_)).map(q).join(',')); });
  return lines.join('\n');
}

function iennPdfBlob_() {
  return Utilities.newBlob(iennPrintHtml_(), 'text/html', 'plants.html').getAs('application/pdf')
    .setName('IENN plant list ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') + '.pdf');
}

function iennPrintRoute_(p) {
  if (p.format === 'csv') return ContentService.createTextOutput(iennPrintCsv_()).setMimeType(ContentService.MimeType.CSV).downloadAsFile('IENN-plant-list.csv');
  if (p.format === 'pdf') {   // web apps can't stream binary; hand back a data: link that downloads the PDF
    var b64 = Utilities.base64Encode(iennPdfBlob_().getBytes());
    return HtmlService.createHtmlOutput('<p><a download="IENN-plant-list.pdf" href="data:application/pdf;base64,' + b64 + '">Download the PDF</a></p>').setTitle('IENN plant list PDF');
  }
  return HtmlService.createHtmlOutput(iennPrintHtml_()).setTitle('IENN plant list');
}

/** One-click menu actions (spreadsheet IENN menu). */
function iennOpenPrintList() { SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(iennPrintHtml_()).setWidth(900).setHeight(650), 'IENN plant list'); }
function iennExportPdfToDrive() { var f = DriveApp.createFile(iennPdfBlob_()); SpreadsheetApp.getUi().alert('Saved to your Drive: ' + f.getName() + '\n' + f.getUrl()); return f.getUrl(); }
function iennExportSheet() {
  var rows = Utilities.parseCsv(iennPrintCsv_()), ss = SpreadsheetApp.create('IENN plant list ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
  ss.getSheets()[0].getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  try { SpreadsheetApp.getUi().alert('Created: ' + ss.getUrl()); } catch (e) { /* called from the web app nav */ }
  return ss.getUrl();
}
/** Alias used by IndexNav.html (google.script.run.exportPlantListSheet). */
function exportPlantListSheet() { return iennExportSheet(); }

/** Internal home: one page with the four things the team uses. */
function iennHubHtml_() {
  var exec = ScriptApp.getService().getUrl(), inv = iennInvoicesSheet_(), invUrl = inv.getParent().getUrl() + '#gid=' + inv.getSheetId();
  var open = iennInvoices_().filter(function (x) { return !/picked|cancel/i.test(String(x.status)); });
  var count = function (st) { return open.filter(function (x) { return String(x.status || 'New') === st; }).length; };
  var link = function (href, t, sub) { return '<a class="tile" href="' + iennEsc_(href) + '" target="_top"><b>' + t + '</b><span>' + sub + '</span></a>'; };
  return '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    'body{font-family:system-ui,Arial,sans-serif;margin:16px;color:#2c2c2c}h1{color:#4a5a4a;font-size:20px}.g{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}' +
    '.tile{display:block;padding:16px;border:1px solid #ddd;border-radius:10px;text-decoration:none;color:#2c2c2c;background:#f8f6f3;min-height:44px}.tile b{display:block;color:#4a5a4a}.tile span{font-size:13px;color:#555}' +
    '</style></head><body><img src="' + iennEsc_(IENN_LOGO_URL) + '" alt="Inland Empire Native Nursery logo" style="height:48px"><h1>IENN team home</h1><div class="g">' +
    link(exec, 'Counts &amp; invoices', 'Weekly counts (internal view)') +
    link(invUrl, 'Orders', count('New') + ' New · ' + count('Claimed') + ' Claimed · ' + count('Paid') + ' Paid, awaiting pickup') +
    link(exec + '?view=print', 'Print plant list', 'Print, PDF or CSV') +
    link(IENN_WEBSITE_URL, 'Website shop', 'What customers see') +
    '</div><p style="font-size:13px;color:#555">Andrew handles orders from New to Picked up: New → Claimed → Paid → Picked up. Reply with IENN menu › Draft reply.</p></body></html>';
}
