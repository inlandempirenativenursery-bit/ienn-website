/**
 * IENN printable plant list — ?view=printlist (print / Save as PDF), ?view=printlist&format=csv, and a "Plant List" sheet export.
 * READY TO PASTE (new file in the existing project) — NOT DEPLOYED. Requires ienn-stock-ledger.gs.
 * Route: ienRouteGet_ (inventory-endpoint.gs) already forwards view=printlist here.
 * Logo: the EXISTING locked sage logo from the website repo (no new graphics). Change LOGO_URL if the site is hosted elsewhere.
 */
var LOGO_URL = 'https://raw.githubusercontent.com/inlandempirenativenursery-bit/ienn-website/main/images/ienn-logo-sage.png';
var PLANT_LIST_SHEET = 'Plant List';

/** Pure: available stock {name:{size:n}} + botanical map -> rows [{name, botanical, sizes:[{size,qty,price}]}] (in-stock only, A–Z) */
function ienPlantListRows(stock, botanical) {
  return Object.keys(stock || {}).map(function (full) {
    var common = String(full).split(' (')[0].trim(), m = String(full).match(/\((.*)\)/);
    var sizes = Object.keys(stock[full]).map(function (z) { var s = ienNormSize(z); return { size: s, qty: Number(stock[full][z]) || 0, price: IENN_SIZE_PRICES[s] }; })
      .filter(function (x) { return x.size && x.qty > 0; }).sort(function (a, b) { return IENN_SIZES.indexOf(a.size) - IENN_SIZES.indexOf(b.size); });
    return { name: common, botanical: (botanical || {})[common.toLowerCase()] || (m ? m[1] : ''), sizes: sizes };
  }).filter(function (r) { return r.sizes.length; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
}
function ienH_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
/** Pure: rows -> print-friendly HTML. opt: { showQty, date, week, logo } */
function ienPrintHtml(rows, opt) {
  opt = opt || {};
  var price = IENN_SIZES.map(function (z) { return z + ' $' + IENN_SIZE_PRICES[z]; }).join(' · ');
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>IENN Plant List ' + ienH_(opt.date) + '</title><style>' +
    'body{font:14px system-ui,sans-serif;color:#2c2c2c;margin:24px}header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #6b7c6a;padding-bottom:10px}' +
    'header img{height:56px}h1{font-size:20px;margin:0;color:#4a5a4a}.meta{font-size:12px;color:#555}table{width:100%;border-collapse:collapse;margin-top:12px}' +
    'th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;vertical-align:top}th{background:#f8f6f3}.bot{font-style:italic;color:#666}' +
    '.bar{margin:12px 0}.bar button,.bar a{font:inherit;padding:8px 14px;margin-right:8px;border:1px solid #4a5a4a;border-radius:6px;background:#fff;color:#4a5a4a;text-decoration:none}' +
    'footer{margin-top:14px;font-size:12px;color:#555}@media print{.bar{display:none}body{margin:10mm}tr{break-inside:avoid}}</style></head><body>' +
    '<header>' + (opt.logo ? '<img src="' + ienH_(opt.logo) + '" alt="IENN logo">' : '') + '<div><h1>Inland Empire Native Nursery — Plant List</h1>' +
    '<div class="meta">Available as of ' + ienH_(opt.date) + (opt.week ? ' (count week ' + ienH_(opt.week) + ')' : '') + ' · Pickup only, Fontana area · Cash or Zelle</div></div></header>' +
    '<div class="bar"><button onclick="window.print()">Print / Save as PDF</button>' + (opt.csvUrl ? '<a href="' + ienH_(opt.csvUrl) + '">Download CSV</a>' : '') + '</div>' +
    '<table><thead><tr><th>Plant</th><th>Sizes available</th></tr></thead><tbody>' +
    (rows.length ? rows.map(function (r) {
      return '<tr><td><b>' + ienH_(r.name) + '</b>' + (r.botanical ? '<br><span class="bot">' + ienH_(r.botanical) + '</span>' : '') + '</td><td>' +
        r.sizes.map(function (s) { return ienH_(s.size) + ' $' + s.price + ' — ' + (opt.showQty ? s.qty + ' available' : 'Available'); }).join('<br>') + '</td></tr>';
    }).join('') : '<tr><td colspan="2">No plants in stock right now.</td></tr>') +
    '</tbody></table><footer>Prices by pot size: ' + price + '. Prices include ' + IENN_TAX_PCT + '% CA sales tax. Availability changes weekly; we confirm every order.</footer></body></html>';
}
function ienPlantListCsv(rows) {
  var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; }, out = ['Plant,Botanical,Size,Qty,Price'];
  rows.forEach(function (r) { r.sizes.forEach(function (s) { out.push([q(r.name), q(r.botanical), q(s.size), s.qty, s.price].join(',')); }); });
  return out.join('\n');
}

// ---------- Apps Script glue ----------
function ienPlantListNow_() {
  var now = ienAvailableNow_(), bot = {};
  try { bot = ienCatalogBotanical(ienSS_().getSheetByName(CATALOG_SHEET).getDataRange().getValues()); } catch (x) {}
  return { rows: ienPlantListRows(now.stock, bot), week: now.week };
}
function ienPrintListView_(e) {
  var d = ienPlantListNow_(), date = Utilities.formatDate(new Date(), IENN_TZ, 'MMM d, yyyy');
  if (e.parameter.format === 'csv') return ContentService.createTextOutput(ienPlantListCsv(d.rows)).setMimeType(ContentService.MimeType.CSV).downloadAsFile('IENN-plant-list.csv');
  var url = ScriptApp.getService().getUrl();
  return HtmlService.createHtmlOutput(ienPrintHtml(d.rows, { date: date, week: d.week, logo: LOGO_URL, showQty: e.parameter.qty === '1', csvUrl: url + '?view=printlist&format=csv' }))
    .setTitle('IENN Plant List').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
/** Export: (re)writes the "Plant List" sheet in the tool's spreadsheet. Callable from the Index nav or the sheet menu. */
function exportPlantListSheet() {
  var d = ienPlantListNow_(), ss = ienSS_(), sh = ss.getSheetByName(PLANT_LIST_SHEET) || ss.insertSheet(PLANT_LIST_SHEET);
  var rows = [['Plant', 'Botanical', 'Size', 'Qty', 'Price']];
  d.rows.forEach(function (r) { r.sizes.forEach(function (s) { rows.push([r.name, r.botanical, s.size, s.qty, s.price]); }); });
  sh.clearContents(); sh.getRange(1, 1, rows.length, 5).setValues(rows); sh.setFrozenRows(1);
  return ss.getUrl() + '#gid=' + sh.getSheetId();
}
if (typeof module !== 'undefined') module.exports = { ienPlantListRows: ienPlantListRows, ienPrintHtml: ienPrintHtml, ienPlantListCsv: ienPlantListCsv };
