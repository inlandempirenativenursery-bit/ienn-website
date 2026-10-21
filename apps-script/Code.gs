/**
 * IENN Invoice — matching the Netlify tool + team + customer emails
 * Deploy: Execute as Me, Anyone with the link
 * Timezone: America/Los_Angeles
 */
var TZ = 'America/Los_Angeles';
var TEAM = [
  { id: 'eric', name: 'Eric' },
  { id: 'andrew', name: 'Andrew' },
  { id: 'keith', name: 'Keith' }
];

function doGet(e) {
  var ienn = iennRoute_(e); if (ienn) return ienn;   // IENN website add-on (IENN_Website.gs)
  var view = (e && e.parameter && e.parameter.view) || 'internal';
  var file = (view === 'customer') ? 'Customer' : 'Index';
  return HtmlService.createHtmlOutputFromFile(file)
    .setTitle('Inland Empire Native Nursery — Invoice')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function db_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('INV_DB_ID');
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('IENN Invoices');
    props.setProperty('INV_DB_ID', ss.getId());
    var sh = ss.getSheets()[0];
    sh.setName('Invoices');
    sh.getRange(1, 1, 1, 8).setValues([['Timestamp', 'Invoice #', 'Date', 'Paid', 'Customer Email', 'Grand Total', 'Lines JSON', 'Note']]);
    sh.getRange('1:1').setFontWeight('bold').setBackground('#f3f6f3');
    sh.setFrozenRows(1);
    var set = ss.insertSheet('Settings');
    set.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
    set.appendRow(['teamEmails', '{}']);
    set.appendRow(['nextSeq', '0']);
  }
  return ss;
}

function sheet_(name) {
  return db_().getSheetByName(name);
}

function getSettings() {
  var sh = sheet_('Settings');
  var rows = sh.getDataRange().getValues();
  var out = { teamEmails: {}, nextSeq: 0 };
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'teamEmails') {
      try { out.teamEmails = JSON.parse(rows[i][1] || '{}'); } catch (e) {}
    }
    if (rows[i][0] === 'nextSeq') out.nextSeq = Number(rows[i][1]) || 0;
  }
  return out;
}

function saveTeamEmails(payload) {
  payload = payload || {};
  var emails = {
    eric: String(payload.eric || '').trim(),
    andrew: String(payload.andrew || '').trim(),
    keith: String(payload.keith || '').trim()
  };
  var sh = sheet_('Settings');
  var rows = sh.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'teamEmails') {
      sh.getRange(i + 1, 2).setValue(JSON.stringify(emails));
      found = true;
      break;
    }
  }
  if (!found) sh.appendRow(['teamEmails', JSON.stringify(emails)]);
  return { ok: true, emails: emails };
}

function nextInvoiceNumber() {
  var sh = sheet_('Settings');
  var rows = sh.getDataRange().getValues();
  var seq = 0;
  var rowIdx = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'nextSeq') {
      seq = Number(rows[i][1]) || 0;
      rowIdx = i + 1;
      break;
    }
  }
  var year = Utilities.formatDate(new Date(), TZ, 'yyyy');
  seq = Math.max(seq, maxInvoiceSeq_(year)) + 1;   // never reuse a number already in Invoices
  var invno = 'IEN-' + year + '-' + ('000' + seq).slice(-3);
  if (rowIdx > 0) {
    sh.getRange(rowIdx, 2).setValue(seq);
  } else {
    sh.appendRow(['nextSeq', seq]);
  }
  return invno;
}

/** Highest NNN among 'IEN-<year>-NNN' in the Invoices sheet (any column header 'Invoice #'; falls back to column B). */
function maxInvoiceSeq_(year) {
  var sh = sheet_('Invoices'); if (!sh) return 0;
  var v = sh.getDataRange().getValues(), head = v[0] || [], c = -1;
  for (var h = 0; h < head.length; h++) if (/^invoice\s*(#|no|number|id)?\.?$/i.test(String(head[h]).trim())) { c = h; break; }
  if (c < 0) c = 1;
  var re = new RegExp('^IEN-' + year + '-(\\d+)$', 'i'), max = 0;
  for (var i = 1; i < v.length; i++) { var m = re.exec(String(v[i][c] || '').trim()); if (m && Number(m[1]) > max) max = Number(m[1]); }
  return max;
}

function inventoryDb_() {
  // IENN add-on: open the real IENN Inventory by ID (two files share that name in Drive).
  if (typeof IENN_INVENTORY_SPREADSHEET_ID !== 'undefined' && IENN_INVENTORY_SPREADSHEET_ID) {
    try { return SpreadsheetApp.openById(IENN_INVENTORY_SPREADSHEET_ID); } catch (e) {}
  }
  var files = DriveApp.getFilesByName('IENN Inventory');
  if (files.hasNext()) {
    try { return SpreadsheetApp.open(files.next()); } catch (e) {}
  }
  return null;
}

/** Retail-ready counts (fourReady/gal1Ready; missing key -> on hand), same shape as before. */
function getAvailableStock() {
  var d = iennStockDetail_(), out = {};
  Object.keys(d).forEach(function (n) { out[n] = { '4"': d[n]['4"'].ready, '1 gal': d[n]['1 gal'].ready }; });
  return out;
}
/** { name: { '4"': {ready, onHand}, '1 gal': {...} } } from the latest week's Submissions. */
function iennStockDetail_() {
  var ss = inventoryDb_();
  if (!ss) return {};
  var sub = ss.getSheetByName('Submissions');
  var cat = ss.getSheetByName('Catalog');
  if (!sub || !cat) return {};

  // Build plant id -> common name map
  var catRows = cat.getDataRange().getValues();
  var idToName = {};
  for (var i = 1; i < catRows.length; i++) {
    if (catRows[i][0]) idToName[String(catRows[i][0])] = String(catRows[i][1] || '');
  }

  // Find latest submission per person for the current week (or overall latest)
  var rows = sub.getDataRange().getValues();
  var latest = {};
  var currentWeek = '';
  for (var r = 1; r < rows.length; r++) {
    var week = String(rows[r][0] || '');
    var person = String(rows[r][1] || '');
    var at = Number(rows[r][2]) || 0;
    if (!week || !person) continue;
    if (!currentWeek || week > currentWeek) currentWeek = week;
    var key = person;
    if (!latest[key] || latest[key].at < at) {
      var counts = {};
      try { counts = JSON.parse(rows[r][3] || '{}'); } catch (e) { counts = {}; }
      latest[key] = { at: at, week: week, counts: counts };
    }
  }

  // Compile totals only from the most recent week
  var stock = {};
  Object.keys(latest).forEach(function (person) {
    var entry = latest[person];
    if (entry.week !== currentWeek) return;
    var counts = entry.counts || {};
    Object.keys(counts).forEach(function (plantId) {
      var name = idToName[plantId] || plantId;
      if (!stock[name]) stock[name] = { '4"': { ready: 0, onHand: 0 }, '1 gal': { ready: 0, onHand: 0 } };
      var c = counts[plantId] || {};
      [['4"', 'four', 'fourReady'], ['1 gal', 'gal1', 'gal1Ready']].forEach(function (z) {
        var oh = Number(c[z[1]]) || 0, rd = (c[z[2]] === undefined || c[z[2]] === null || c[z[2]] === '') ? oh : (Number(c[z[2]]) || 0);
        stock[name][z[0]].onHand += oh; stock[name][z[0]].ready += rd;
      });
    });
  });
  return stock;
}

function getInitial() {
  var s = getSettings();
  var year = Utilities.formatDate(new Date(), TZ, 'yyyy');
  var preview = 'IEN-' + year + '-' + ('000' + (Math.max(s.nextSeq, maxInvoiceSeq_(year)) + 1)).slice(-3);
  return {
    previewInv: preview,
    teamEmails: s.teamEmails,
    plants: [
      'White sage (Salvia apiana)',
      'Black sage (Salvia mellifera)',
      'California buckwheat (Eriogonum fasciculatum)',
      'California encelia (Encelia californica)',
      'California poppy (Eschscholzia californica)',
      'Chaparral yucca (Hesperoyucca whipplei)',
      'Deergrass (Muhlenbergia rigens)',
      'Desert marigold (Baileya multiradiata)',
      'Matilija poppy (Romneya coulteri)',
      'Morning glory (Calystegia macrostegia)',
      'Narrow-leaf milkweed (Asclepias fascicularis)',
      'Rock monkeyflower (Diplacus calycinus)',
      'Scarlet bugler (Penstemon centranthifolius)',
      'Showy milkweed (Asclepias speciosa)',
      'Showy penstemon (Penstemon spectabilis)',
      'Sticky monkeyflower (Diplacus aurantiacus)',
      'Sugarbush (Rhus ovata)',
      'Woollypod milkweed (Asclepias eriocarpa)',
      'Yarrow (Achillea millefolium)',
      'Other'
    ],
    sizes: ['1 gal', '4"', '2"', 'Tree pot', 'Other'],
    defaultPrices: { '2"': 3, '4"': 6, 'Tree pot': 10, '1 gal': 15, taxPct: 8.75 },
    stock: getAvailableStock()
  };
}

function submitInvoice(payload) {
  payload = payload || {};
  var stock = getAvailableStock();
  var lines = payload.lines || [];
  var noBaseline = typeof iennBaselineDate_ === 'function' && !iennBaselineDate_();   // no count yet: Andrew confirms availability
  var requests = [];
  if (!noBaseline && typeof iennAvailable_ === 'function') {
    var chk = iennStockCheck_(lines, iennAvailable_());
    if (chk.problems.length) throw new Error(chk.message);
    requests = chk.notices;
  }
  if (requests.length) payload.note = iennRequestNote_(requests) + (payload.note ? '\n' + payload.note : '');
  payload.notices = requests;
  var invno = nextInvoiceNumber();
  var now = new Date();
  var grand = payload.grand || '0';
  var customerEmail = String(payload.customerEmail || '').trim();
  var note = String(payload.note || '').trim();
  var date = payload.date || Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  var paid = payload.paid || 'unpaid';

  sheet_('Invoices').appendRow([
    now,
    invno,
    date,
    paid,
    customerEmail,
    grand,
    JSON.stringify(lines),
    note
  ]);

  var text = buildReceiptText(payload, invno);
  var settings = getSettings();
  var team = settings.teamEmails || {};

  // Email team
  TEAM.forEach(function (p) {
    var to = team[p.id];
    if (to) {
      MailApp.sendEmail({
        to: to,
        subject: 'IENN Order ' + invno + ' — $' + grand,
        body: text
      });
    }
  });

  // Email customer a clean receipt (no internal info, no exact address)
  if (customerEmail && customerEmail.indexOf('@') > 0) {
    MailApp.sendEmail({
      to: customerEmail,
      subject: 'Your Inland Empire Native Nursery order — ' + invno,
      body: buildCustomerReceiptText(payload, invno)
    });
  }

  return { ok: true, invno: invno, text: text, notices: requests };
}

function buildReceiptText(payload, invno) {
  var lines = (payload.lines || []).map(function (l) {
    return (l.qty || '1') + ' x ' + (l.plant || 'plant') + ' - ' + (l.size || 'size') + ' - $' + (l.amt || '0');
  });
  var disc = '';
  if (payload.discType && payload.discType !== 'none' && payload.discAmt) {
    disc = 'Discount: ' + (payload.discType === 'percent' ? payload.discAmt + '% off' : '$' + payload.discAmt + ' off');
  }
  return [
    'Inland Empire Native Nursery',
    'Established 2020',
    '1 (909) 609-9373 · Fontana, CA 92336',
    '',
    'Invoice #: ' + invno,
    'Date: ' + (payload.date || ''),
    'Status: ' + (payload.paid || 'unpaid'),
    payload.payment ? 'Payment: ' + payload.payment : '',
    '',
    lines.length ? lines.join('\n') : '(no lines)',
    '',
    disc,
    'Subtotal: $' + (payload.subtotal || '0'),
    'Tax: $' + (payload.tax || '0'),
    'TOTAL (tax included): $' + (payload.grand || '0'),
    payload.note ? '\nNote: ' + payload.note : '',
    '',
    'All sales are final. Plants are sold as-is. No returns, exchanges, or refunds after pickup.',
    'Identity is as marked on this receipt. No warranty beyond defects obvious at the time of pickup.'
  ].filter(function (x, i, a) { return x !== '' || a[i - 1] !== ''; }).join('\n');
}

/** Customer-safe note: payload.customerNote if given, else the note minus internal lines. */
function customerNoteOf_(payload) {
  if (payload.customerNote != null) return String(payload.customerNote).trim();
  return String(payload.note || '').replace(/^Website order — [^\n]*\n?/, '').replace(/^Pays by: .*\n?/m, '').replace(/^REQUEST: .*\n?/gm, '').trim();
}

/** Clean receipt for the customer. Never includes an exact street address or ZIP. */
function buildCustomerReceiptText(payload, invno) {
  var lines = (payload.lines || []).map(function (l) {
    return '  ' + (l.qty || '1') + ' x ' + (l.plant || 'plant') + ' - ' + (l.size || 'size') + ' - $' + (l.amt || '0');
  });
  var note = customerNoteOf_(payload);
  return [
    'Inland Empire Native Nursery',
    'Fontana, CA · 1 (909) 609-9373 · plants@inlandempirenativenursery.com',
    '',
    'Thanks for your order! Here is your copy.',
    '',
    'Order number: ' + invno,
    'Date: ' + (payload.date || ''),
    '',
    'Your plants:',
    lines.length ? lines.join('\n') : '  (no items)',
    '',
    'TOTAL (taxes included): $' + (payload.grand || '0'),
    note ? '\nYour notes: ' + note : '',
    (payload.notices || []).length ? '\n' + payload.notices.map(function (n) { return 'About your ' + n.plant + ' (' + n.size + '): ' + n.message; }).join('\n') : '',
    '',
    'PICKUP',
    'Saturdays 10 a.m. – 2 p.m., other times case by case on request.',
    'We\u2019ll email to confirm your pickup time.',
    '',
    'LOCATION',
    'Near Sierra & Baseline in Fontana, about 10 minutes from the 210. The exact address is sent after we confirm your order.',
    '',
    'PAYMENT',
    'Cash or Zelle at time of pickup.' + (payload.payment ? ' You chose: ' + payload.payment + '.' : ''),
    '',
    'Questions? Call or text Andrew: (909) 609-9373, or email plants@inlandempirenativenursery.com',
    '',
    'All sales are final. Plants are sold as-is. No returns, exchanges, or refunds after pickup.',
    'Identity is as marked on this receipt. No warranty beyond defects obvious at the time of pickup.'
  ].filter(function (x, i, a) { return x !== '' || a[i - 1] !== ''; }).join('\n');
}
