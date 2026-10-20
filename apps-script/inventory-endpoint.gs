/**
 * IENN public inventory + order intake endpoint (drop-in, NOT deployed yet).
 *
 * Use as a SEPARATE Apps Script project so the existing invoice/inventory web app
 * (which already has its own doGet) is not changed. Point SPREADSHEET_ID at the
 * existing IENN Inventory Google Sheet.
 *
 * GET  <web-app-url>            -> {"updated": ISO, "plants": [ {name, botanical, blurb, photo, rank, sizes:[{size, qty, price}]} ]}
 * POST <web-app-url> (JSON body) -> appends one row per line item to the "Orders" sheet, returns {"ok":true,"orderId":...}
 *
 * Columns are found by HEADER NAME (row 1), so column order doesn't matter.
 * Either one row per plant+size (Plant | Size | Qty | Price ...) or one row per plant
 * with size columns (e.g. headers `4"` and `1 gal` holding counts). Rows sharing a name are merged.
 */
var CFG = {
  SPREADSHEET_ID: "",           // leave "" if this script is bound to the inventory spreadsheet
  INVENTORY_SHEET: "Inventory", // tab name holding counts
  ORDERS_SHEET: "Orders",       // created automatically if missing
  // If the sheet has one column per size (counts), list those header names here:
  SIZE_COLUMNS: ['2"', '4"', '1 gal', 'Tree pot'],
  // Header aliases (case/space-insensitive). Add your sheet's header names if different.
  HEADERS: {
    name:      ["plant", "name", "common name", "plant name"],
    botanical: ["botanical", "botanical name", "scientific name", "latin"],
    size:      ["size", "container", "pot size"],
    qty:       ["qty", "quantity", "count", "available", "stock", "on hand"],
    price:     ["price", "unit price", "cost"],
    active:    ["active", "show", "visible", "list online", "online"],
    rank:      ["rank", "popularity", "sort", "order"],
    blurb:     ["blurb", "description", "notes for customers"],
    photo:     ["photo", "photo url", "image", "image url"]
  },
  CACHE_SECONDS: 60
};

function ss_() { return CFG.SPREADSHEET_ID ? SpreadsheetApp.openById(CFG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function norm_(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").trim(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function numOrNull_(v) { if (v === "" || v == null) return null; var n = Number(String(v).replace(/[$,]/g, "")); return isFinite(n) ? n : null; }

function doGet(e) {
  var cache = CacheService.getScriptCache(), hit = cache.get("inventory");
  if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  try {
    var out = JSON.stringify(readInventory_());
    cache.put("inventory", out, CFG.CACHE_SECONDS);
    return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function readInventory_() {
  var sh = ss_().getSheetByName(CFG.INVENTORY_SHEET);
  if (!sh) throw new Error("Sheet not found: " + CFG.INVENTORY_SHEET);
  var values = sh.getDataRange().getValues();
  var head = values.shift().map(norm_), col = {};
  Object.keys(CFG.HEADERS).forEach(function (k) {
    col[k] = -1;
    CFG.HEADERS[k].some(function (alias) { var i = head.indexOf(norm_(alias)); if (i >= 0) { col[k] = i; return true; } });
  });
  if (col.name < 0) throw new Error("No plant name column found. Headers: " + head.join(", "));
  var sizeCols = CFG.SIZE_COLUMNS.map(function (s) { return { size: s, i: head.indexOf(norm_(s)) }; }).filter(function (c) { return c.i >= 0; });
  var byName = {}, list = [];
  values.forEach(function (r) {
    var name = String(r[col.name] || "").trim(); if (!name) return;
    if (col.active >= 0) { var a = r[col.active]; if (a === false || /^(no|n|false|0|hide)$/i.test(String(a).trim())) return; }
    var p = byName[name.toLowerCase()];
    if (!p) { p = byName[name.toLowerCase()] = { name: name, botanical: "", blurb: "", photo: "", rank: null, sizes: [] }; list.push(p); }
    function get(k) { return col[k] >= 0 ? r[col[k]] : ""; }
    p.botanical = p.botanical || String(get("botanical") || "");
    p.blurb = p.blurb || String(get("blurb") || "");
    p.photo = p.photo || String(get("photo") || "");
    if (numOrNull_(get("rank")) != null) p.rank = numOrNull_(get("rank"));
    var price = numOrNull_(get("price"));
    if (sizeCols.length && col.size < 0) {
      sizeCols.forEach(function (c) { var q = numOrNull_(r[c.i]); if (q != null) p.sizes.push({ size: c.size, qty: q, price: price }); });
    } else {
      p.sizes.push({ size: String(get("size") || "Standard"), qty: numOrNull_(get("qty")) || 0, price: price });
    }
  });
  return { updated: new Date().toISOString(), plants: list.filter(function (p) { return p.sizes.length; }) };
}

/** Order intake stub: one row per line item in the Orders sheet. Does not change inventory counts. */
function doPost(e) {
  try {
    var o = JSON.parse(e.postData.contents);
    if (!o || !o.name || !o.items || !o.items.length) return json_({ ok: false, error: "missing name or items" });
    var ss = ss_(), sh = ss.getSheetByName(CFG.ORDERS_SHEET) || ss.insertSheet(CFG.ORDERS_SHEET);
    if (sh.getLastRow() === 0) sh.appendRow(["Order ID", "Received", "Name", "Phone", "Email", "Fulfillment", "Plant", "Size", "Qty", "Notes", "Status"]);
    var id = "WEB-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      o.items.forEach(function (l) {
        sh.appendRow([id, new Date(), String(o.name), String(o.phone || ""), String(o.email || ""), String(o.fulfillment || ""),
          String(l.name), String(l.size || ""), Number(l.qty) || 0, String(o.notes || ""), "New"]);
      });
    } finally { lock.releaseLock(); }
    // Optional: MailApp.sendEmail("hello@inlandempirenativenursery.com", "New web order " + id, JSON.stringify(o, null, 2));
    return json_({ ok: true, orderId: id });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}
