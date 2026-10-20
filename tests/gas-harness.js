// Loads apps-script/*.gs into a Node VM with in-memory stubs (SpreadsheetApp, MailApp, GmailApp, LockService, ...)
// plus a FAKE of the existing invoice tool (getInitial, getAvailableStock, submitInvoice) shaped as assumed in IENN_Config.gs.
const fs = require('fs'), path = require('path'), vm = require('vm');

function makeSheet(name, rows, id, ss) {
  return {
    rows, getName: () => name, getSheetId: () => id, getParent: () => ss,
    getDataRange() { const r = this.rows; return { getValues: () => r.map(x => x.slice()) }; },
    getRange(row, col, nr = 1, nc = 1) {
      const sh = this;
      return {
        setValue(v) { while (sh.rows.length < row) sh.rows.push([]); sh.rows[row - 1][col - 1] = v; },
        setValues(vals) { vals.forEach((r, i) => r.forEach((v, j) => { while (sh.rows.length < row + i) sh.rows.push([]); sh.rows[row - 1 + i][col - 1 + j] = v; })); },
        getValues() { const out = []; for (let i = 0; i < nr; i++) { const r = sh.rows[row - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) o.push(r[col - 1 + j] === undefined ? '' : r[col - 1 + j]); out.push(o); } return out; },
        getRow: () => row
      };
    },
    appendRow(r) { this.rows.push(r.slice()); }, getLastRow() { return this.rows.length; }, setFrozenRows() {}
  };
}

// Fake existing tool. getAvailableStock: latest week's Submissions JSON counts {plantId:{four, gal1}} summed by person, mapped via Catalog.
const FAKE_EXISTING = `
function getAvailableStock() {
  var ss = SpreadsheetApp.getActive(), cat = {}, sub = ss.getSheetByName('Submissions').getDataRange().getValues();
  ss.getSheetByName('Catalog').getDataRange().getValues().slice(1).forEach(function (r) { cat[r[0]] = r[1]; });
  var latest = sub.slice(1).reduce(function (a, r) { return !a || r[0] > a ? r[0] : a; }, null), out = {};
  sub.slice(1).filter(function (r) { return +r[0] === +latest; }).forEach(function (r) {
    var c = JSON.parse(r[2]); Object.keys(c).forEach(function (id) { var n = cat[id]; out[n] = out[n] || { '4"': 0, '1 gal': 0 };
      out[n]['4"'] += c[id].four || 0; out[n]['1 gal'] += c[id].gal1 || 0; }); });
  return out;
}
function getInitial() {
  var names = SpreadsheetApp.getActive().getSheetByName('Catalog').getDataRange().getValues().slice(1).map(function (r) { return r[1]; });
  return { plants: names, sizes: ['2"', '4"', 'Tree pot', '1 gal'], defaultPrices: { '2"': 3, '4"': 6, 'Tree pot': 10, '1 gal': 15, taxPct: 8.75 }, stock: getAvailableStock() };
}
var __invoiceSeq = 100;
function submitInvoice(data) {
  var sh = SpreadsheetApp.getActive().getSheetByName('IENN Invoices'), no = 'INV-' + (++__invoiceSeq);
  sh.appendRow([no, new Date(__now()), data.customerEmail, data.note, JSON.stringify(data.lines), data.subtotal, data.tax, data.grand, data.paid, data.payment]);
  MailApp.sendEmail({ to: 'team@existing.tool', subject: 'Invoice ' + no, body: 'existing team email' });
  return { invoiceNumber: no };
}`;

function load(opts = {}) {
  let now = opts.now || Date.parse('2026-10-20T17:00:00Z');
  const ss = { sheets: {}, getSheetByName(n) { return this.sheets[n] || null; }, insertSheet(n) { if (n !== 'Promos') throw new Error('must not create sheets: ' + n); return (this.sheets[n] = makeSheet(n, [], 99, this)); },
    getUrl: () => 'https://docs.google.com/spreadsheets/d/TEST_SHEET_ID/edit' };
  const add = (n, rows, id) => (ss.sheets[n] = makeSheet(n, rows, id, ss));
  add('Catalog', [['id', 'name'], ['p1', 'White Sage (Salvia apiana)'], ['p2', 'Sticky Monkeyflower (Diplacus aurantiacus)'], ['p3', 'Yarrow'], ['p4', 'Blue Pyramid Cypress'], ['p5', 'Toyon (Heteromeles arbutifolia)']], 1);
  add('Submissions', [['Week', 'Person', 'Counts'],
    [new Date('2026-10-05'), 'Keith', JSON.stringify({ p1: { four: 9, gal1: 9 } })],
    [new Date('2026-10-12'), 'Keith', JSON.stringify({ p1: { four: 2, gal1: 6 }, p2: { four: 0, gal1: 4 }, p3: { four: 0, gal1: 0 } })],
    [new Date('2026-10-12'), 'Raylene', JSON.stringify({ p1: { four: 1, gal1: 4 }, p5: { gal1: 2 } })]], 2);
  add('IENN Invoices', [['Invoice #', 'Timestamp', 'Customer email', 'Note', 'Lines', 'Subtotal', 'Tax', 'Grand', 'Paid', 'Payment'],
    ['INV-090', new Date('2026-10-10'), 'old@x.co', '', JSON.stringify([{ plant: 'White Sage (Salvia apiana)', size: '4"', qty: '5' }]), '30.00', '', '', 'paid', 'Cash'],
    ['INV-091', new Date('2026-10-14'), 'c@x.co', '', JSON.stringify([{ plant: 'White Sage (Salvia apiana)', size: '1 gal', qty: '2' }]), '30.00', '', '', 'unpaid', '']], 3);
  const sent = [], drafts = [], lockState = { held: false, calls: 0 };
  const ctx = {
    __now: () => now,
    SpreadsheetApp: { getActive: () => ss, openById: () => ss, flush() {}, create: () => { throw new Error('not in tests'); } },
    MailApp: { sendEmail: m => sent.push(m) },
    GmailApp: { createDraft: (to, s, b) => drafts.push({ to, subject: s, body: b }) },
    LockService: { getScriptLock: () => ({ tryLock() { if (lockState.held) return false; lockState.held = true; lockState.calls++; return true; }, releaseLock() { lockState.held = false; } }) },
    ContentService: { MimeType: { JSON: 'json', JAVASCRIPT: 'js', CSV: 'csv' }, createTextOutput: s => ({ s, setMimeType() { return this; }, downloadAsFile() { return this; }, getContent() { return s; } }) },
    HtmlService: { createHtmlOutput: h => ({ h, setTitle() { return this; }, getContent() { return h; } }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }) },
    Utilities: { formatDate: (d, tz, f) => f === 'MMMM d, yyyy' ? 'October 20, 2026' : new Date(d).toISOString().slice(0, 10), base64Encode: () => '' },
    Session: { getScriptTimeZone: () => 'America/Los_Angeles', getActiveUser: () => ({ getEmail: () => 'keith@test.local' }) },
    Logger: { log() {} }, console, Date
  };
  vm.createContext(ctx);
  vm.runInContext(FAKE_EXISTING, ctx, { filename: 'existing-tool-fake.gs' });
  const dir = path.join(__dirname, '..', 'apps-script');
  fs.readdirSync(dir).filter(f => f.endsWith('.gs')).sort().forEach(f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  return { ctx, ss, sent, drafts, lockState, setNow: t => (now = t) };
}
module.exports = { load };
