/**
 * IENN bench inventory — one link, shared totals.
 * Deploy: Execute as Me, access Anyone with the link.
 * Project settings timezone: America/Los_Angeles.
 */
var TZ = 'America/Los_Angeles';
var PEOPLE = [
  { id: 'keith', name: 'Keith', role: 'CPO' },
  { id: 'andrew', name: 'Andrew', role: 'CFO' },
  { id: 'eric', name: 'Eric', role: 'CEO' }
];
var SEED = [
  ['apiana', 'White sage', 'Salvia apiana', 'active'],
  ['mellifera', 'Black sage', 'Salvia mellifera', 'active'],
  ['diplacus', 'Sticky monkeyflower', 'Diplacus aurantiacus', 'active'],
  ['milkweed', 'Narrowleaf milkweed', 'Asclepias fascicularis', 'active'],
  ['buckwheat', 'California buckwheat', 'Eriogonum fasciculatum', 'active'],
  ['datura', 'Sacred datura', 'Datura wrightii', 'active'],
  ['encelia-ca', 'California brittlebush', 'Encelia californica', 'active'],
  ['marigold', 'Desert marigold', 'Baileya multiradiata', 'active'],
  ['penstemon', 'Showy penstemon', 'Penstemon spectabilis', 'active'],
  ['sugarbush', 'Sugarbush', 'Rhus ovata', 'active'],
  ['yucca', 'Chaparral yucca', 'Hesperoyucca whipplei', 'active'],
  ['deergrass', 'Deergrass', 'Muhlenbergia rigens', 'active'],
  ['clevelandii', 'Cleveland sage', 'Salvia clevelandii', 'back'],
  ['leuco', 'Purple sage', 'Salvia leucophylla', 'back'],
  ['californica', 'California sagebrush', 'Artemisia californica', 'back'],
  ['spathacea', 'Hummingbird sage', 'Salvia spathacea', 'back'],
  ['farinosa', 'Brittlebush', 'Encelia farinosa', 'back'],
  ['yarrow', 'Yarrow', 'Achillea millefolium', 'back'],
  ['woolly', 'Woolly blue curls', 'Trichostema lanatum', 'back'],
  ['baccharis', 'Coyote brush', 'Baccharis pilularis', 'back'],
  ['fuchsia', 'California fuchsia', 'Epilobium canum', 'back'],
  ['cypress', 'Arizona cypress, Blue Pyramid', 'Hesperocyparis arizonica', 'back'],
  ['romneya', 'Matilija poppy', 'Romneya coulteri', 'back'],
  ['dendromecon', 'Bush poppy', 'Dendromecon rigida', 'back']
];

// Count keys per plant in Submissions.counts JSON. two/tree (+Ready) were added Oct 2026;
// older submissions without them simply read as no count (0).
var COUNT_KEYS = ['two', 'twoReady', 'four', 'fourReady', 'tree', 'treeReady', 'gal1', 'gal1Ready'];
function blankCounts_() { var o = {}; COUNT_KEYS.forEach(function (k) { o[k] = 0; }); return o; }
function addCounts_(into, c) { c = c || {}; COUNT_KEYS.forEach(function (k) { into[k] = (into[k] || 0) + (Number(c[k]) || 0); }); return into; }

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('IENN Inventory')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function setup() {
  db_();
  return 'IENN sheet ready';
}

function db_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DB_ID');
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('IENN Inventory');
    props.setProperty('DB_ID', ss.getId());
    var first = ss.getSheets()[0];
    first.setName('Submissions');
    first.getRange(1, 1, 1, 4).setValues([['week', 'person', 'at', 'counts']]);
    var cat = ss.insertSheet('Catalog');
    cat.getRange(1, 1, 1, 4).setValues([['id', 'common', 'latin', 'band']]);
    cat.getRange(2, 1, SEED.length, 4).setValues(SEED);
    var settings = ss.insertSheet('Settings');
    settings.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
    settings.appendRow(['emails', '{}']);
  }
  return ss;
}

function sheet_(name) {
  return db_().getSheetByName(name);
}

function weekKey_(date) {
  var d = date || new Date();
  var ymd = Utilities.formatDate(d, TZ, 'yyyy-MM-dd').split('-');
  var dt = new Date(Date.UTC(Number(ymd[0]), Number(ymd[1]) - 1, Number(ymd[2])));
  var day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day + 3);
  var first = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  var week = 1 + Math.round(((dt - first) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
  return dt.getUTCFullYear() + '-W' + ('0' + week).slice(-2);
}

function norm_(h) { return String(h == null ? '' : h).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function col_(head, names) { for (var i = 0; i < head.length; i++) if (names.indexOf(norm_(head[i])) >= 0) return i; return -1; }
/** Catalog columns found by header (any order; extra columns like Photo/Pin/Badge are ignored).
    Falls back to the original id | common | latin | band positions when a header is missing. */
function catalogCols_(head) {
  var c = { id: col_(head, ['id', 'plantid']), common: col_(head, ['common', 'name', 'commonname', 'plant', 'plantname']),
    latin: col_(head, ['latin', 'botanical', 'botanicalname', 'scientificname']), band: col_(head, ['band', 'status']) };
  if (c.id < 0) c.id = 0;
  if (c.common < 0) c.common = 1;
  return c;
}
/** Every Catalog row is a plant in the count form (with all four pot sizes). "Name (Botanical)" is split for display. */
function catalog_() {
  var sh = sheet_('Catalog');
  var rows = sh.getDataRange().getValues();
  var c = catalogCols_(rows[0] || []);
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var id = String(rows[i][c.id] || '').trim(), name = String(rows[i][c.common] || '').trim();
    if (!id && !name) continue;
    var m = /^(.*?)\s*\((.*)\)\s*$/.exec(name), latin = c.latin >= 0 ? String(rows[i][c.latin] || '').trim() : '';
    if (m && !latin) { name = m[1].trim(); latin = m[2].trim(); }
    out.push({ id: id || ('row' + (i + 1)), common: name || id, latin: latin, band: c.band >= 0 ? String(rows[i][c.band] || 'popular') : 'popular' });
  }
  return out;
}

function emails_() {
  var sh = sheet_('Settings');
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'emails') {
      try { return JSON.parse(rows[i][1] || '{}'); } catch (e) { return {}; }
    }
  }
  return {};
}

function saveEmails_(emails) {
  var sh = sheet_('Settings');
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'emails') {
      sh.getRange(i + 1, 2).setValue(JSON.stringify(emails));
      return;
    }
  }
  sh.appendRow(['emails', JSON.stringify(emails)]);
}

function previousCounts_(week) {
  var sh = sheet_('Submissions');
  var rows = sh.getDataRange().getValues();
  var latest = {};
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === week) continue;
    var person = String(rows[i][1]);
    var at = Number(rows[i][2]) || 0;
    if (!latest[person] || latest[person].at < at) {
      var counts = {};
      try { counts = JSON.parse(rows[i][3] || '{}'); } catch (e) { counts = {}; }
      latest[person] = { person: person, at: at, week: String(rows[i][0]), counts: counts };
    }
  }
  return latest;
}

function submissions_(week) {
  var sh = sheet_('Submissions');
  var rows = sh.getDataRange().getValues();
  var latest = {};
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== week) continue;
    var person = String(rows[i][1]);
    var at = Number(rows[i][2]) || 0;
    if (!latest[person] || latest[person].at < at) {
      var counts = {};
      try { counts = JSON.parse(rows[i][3] || '{}'); } catch (e) { counts = {}; }
      latest[person] = { person: person, at: at, counts: counts };
    }
  }
  return latest;
}

function history_() {
  var sh = sheet_('Submissions');
  var rows = sh.getDataRange().getValues();
  var plants = catalog_();
  var latest = {};
  for (var i = 1; i < rows.length; i++) {
    var week = String(rows[i][0] || '');
    var person = String(rows[i][1] || '');
    if (!week || !person) continue;
    var at = Number(rows[i][2]) || 0;
    var key = week + '|' + person;
    if (!latest[key] || latest[key].at < at) {
      var counts = {};
      try { counts = JSON.parse(rows[i][3] || '{}'); } catch (e) { counts = {}; }
      latest[key] = { week: week, at: at, counts: counts };
    }
  }
  var byWeek = {};
  Object.keys(latest).forEach(function (key) {
    var row = latest[key];
    if (!byWeek[row.week]) { byWeek[row.week] = blankCounts_(); byWeek[row.week].week = row.week; }
    plants.forEach(function (p) { addCounts_(byWeek[row.week], row.counts && row.counts[p.id]); });
  });
  return Object.keys(byWeek).sort().map(function (week) { return byWeek[week]; });
}

function getBoard() {
  var week = weekKey_();
  var plants = catalog_();
  var by = submissions_(week);
  var compiled = {};
  plants.forEach(function (p) { compiled[p.id] = blankCounts_(); });
  Object.keys(by).forEach(function (person) {
    var counts = by[person].counts || {};
    plants.forEach(function (p) { addCounts_(compiled[p.id], counts[p.id]); });
  });
  var url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { url = ''; }
  return {
    week: week,
    plants: plants,
    people: PEOPLE,
    submitted: by,
    previous: previousCounts_(week),
    history: history_(),
    compiled: compiled,
    emails: emails_(),
    url: url,
    live: true
  };
}

function submitCount(payload) {
  payload = payload || {};
  var person = String(payload.person || '');
  var known = PEOPLE.some(function (p) { return p.id === person; });
  if (!known) throw new Error('Pick Eric, Andrew, or Keith.');
  var week = weekKey_();
  var counts = payload.counts || {};
  sheet_('Submissions').appendRow([week, person, Date.now(), JSON.stringify(counts)]);
  return getBoard();
}

function addPlant(payload) {
  payload = payload || {};
  var common = String(payload.common || '').trim();
  if (!common) throw new Error('Need a name.');
  var band = payload.band === 'active' ? 'active' : 'back';
  var id = 'p' + Date.now(), sh = sheet_('Catalog'), head = sh.getDataRange().getValues()[0] || [], c = catalogCols_(head);
  var latin = String(payload.latin || '').trim(), row = [];
  for (var i = 0; i < Math.max(head.length, 2); i++) row.push('');
  row[c.id] = id;
  if (c.latin >= 0) { row[c.common] = common; row[c.latin] = latin; } else row[c.common] = latin ? common + ' (' + latin + ')' : common;
  if (c.band >= 0) row[c.band] = band;
  sh.appendRow(row);
  return getBoard();
}

function saveAlertEmails(payload) {
  payload = payload || {};
  saveEmails_({
    eric: String(payload.eric || '').trim(),
    andrew: String(payload.andrew || '').trim(),
    keith: String(payload.keith || '').trim()
  });
  return getBoard();
}

function enableReminders() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'sendCheckIn' || fn === 'sendFollowUp') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendCheckIn').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(14).create();
  ScriptApp.newTrigger('sendFollowUp').timeBased().onWeekDay(ScriptApp.WeekDay.WEDNESDAY).atHour(19).create();
  return { ok: true, url: ScriptApp.getService().getUrl() };
}

function sendCheckIn() {
  var board = getBoard();
  var emails = emails_();
  var link = ScriptApp.getService().getUrl();
  PEOPLE.forEach(function (p) {
    var to = emails[p.id];
    if (!to) return;
    MailApp.sendEmail({
      to: to,
      subject: 'IENN count is open — ' + board.week,
      body: 'Wednesday bench count is open.\n\nTap this link, pick your name, enter 2-inch, 4-inch, tree pot and 1-gallon totals, hit submit.\n\n' + link + '\n\nOne follow-up at 7 PM only if yours is still missing.'
    });
  });
}

function sendFollowUp() {
  var board = getBoard();
  var emails = emails_();
  var link = ScriptApp.getService().getUrl();
  PEOPLE.forEach(function (p) {
    if (board.submitted[p.id]) return;
    var to = emails[p.id];
    if (!to) return;
    MailApp.sendEmail({
      to: to,
      subject: 'IENN count still open — ' + board.week,
      body: 'One follow-up. Your bench count is still open.\n\nTap, enter your pot counts, submit. Nothing else tonight.\n\n' + link
    });
  });
}
