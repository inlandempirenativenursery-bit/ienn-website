/**
 * IENN website API — ADD-ON FILE for the EXISTING IENN Apps Script project (invoice app).
 * NOT deployed by this repo. Defines no top-level doGet/doPost; everything is prefixed `ienn_`.
 *
 * Install (see README "Live inventory + orders"):
 *   1. Add this file to the existing project as a new script file (e.g. ienn-api.gs).
 *   2. Add as the FIRST line inside the existing doGet(e):
 *        if (e && e.parameter && e.parameter.api) return ienn_api_doGet_(e);
 *   3. If the project has no doPost, add:
 *        function doPost(e) { return ienn_api_doPost_(e); }
 *      If it already has one, add as its FIRST line:
 *        if (e && e.parameter && e.parameter.api) return ienn_api_doPost_(e);
 *   4. Deploy → Manage deployments → Edit → New version (same /exec URL). Access must be "Anyone".
 *
 * Endpoints (site):
 *   GET  <exec>?api=inventory  -> {ok, updated, plants:[{name, botanical, rank, blurb, photo, sizes:[{key,label,qty,price}]}]}
 *   POST <exec>?api=order      body = JSON as text/plain -> {ok:true, orderId, subtotal} | {ok:false, error, short:[...]}
 *
 * SHEET ASSUMPTIONS (edit CFG_IENN if yours differ):
 *   - Inventory tab "Inventory", header row 1, ONE ROW PER PLANT.
 *   - Column "Plant" (required). Optional: Botanical, Rank, Active, Blurb, Photo.
 *   - One COUNT column per size, headers 2"  4"  Tree pot  1 gal (aliases accepted, see SIZES).
 *   - Blank count cell = size not offered; 0 = sold out.
 */
var CFG_IENN = {
  SPREADSHEET_ID: "",            // "" = the spreadsheet this project is bound to
  INVENTORY_SHEET: "Inventory",
  ORDERS_SHEET: "Orders",        // created automatically
  // Prices are by size only (site shows no tax; the invoice app adds 8.75% tax separately).
  SIZES: [
    { key: '2"',       label: "2-inch",           price: 3,  aliases: ['2"', "2 in", "2-inch", "2 inch", "2in"] },
    { key: '4"',       label: "4-inch",           price: 6,  aliases: ['4"', "4 in", "4-inch", "4 inch", "4in"] },
    { key: "Tree pot", label: "Quarter tree pot", price: 10, aliases: ["tree pot", "quarter tree pot", "1/4 tree pot", "treepot"] },
    { key: "1 gal",    label: "1-gallon",         price: 15, aliases: ["1 gal", "1-gallon", "1 gallon", "1gal", "gallon"] }
  ],
  HEADERS: {
    name:      ["plant", "plant name", "name", "common name"],
    botanical: ["botanical", "botanical name", "scientific name"],
    rank:      ["rank", "popularity"],
    active:    ["active", "show", "list online"],
    blurb:     ["blurb", "description"],
    photo:     ["photo", "photo url", "image", "image url"]
  },
  // Fallback team recipients if getSettings() has no team emails. Fill in REAL addresses:
  TEAM_EMAILS: [
    // "",  // Eric
    // "",  // Andrew
    // "",  // Keith
    // ""   // Raylene
  ],
  CACHE_SECONDS: 60,
  MAX_QTY_PER_LINE: 200
};

var IENN_ORDER_HEADERS = ["Order ID", "Received", "Name", "Phone", "Email", "Fulfillment", "Items", "Subtotal", "Notes",
  "Status", "Paid", "Payment method", "Pickup address sent", "Our response", "Claimed by"];

function ienn_ss_() { return CFG_IENN.SPREADSHEET_ID ? SpreadsheetApp.openById(CFG_IENN.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function ienn_norm_(s) { return String(s == null ? "" : s).toLowerCase().replace(/[\u201c\u201d\u2033]/g, '"').replace(/\s+/g, " ").trim(); }
function ienn_json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ienn_num_(v) { if (v === "" || v == null) return null; var n = Number(String(v).replace(/[$,]/g, "")); return isFinite(n) ? n : null; }
function ienn_size_(s) {
  var n = ienn_norm_(s);
  for (var i = 0; i < CFG_IENN.SIZES.length; i++) {
    var z = CFG_IENN.SIZES[i];
    if (ienn_norm_(z.key) === n || ienn_norm_(z.label) === n || z.aliases.some(function (a) { return ienn_norm_(a) === n; })) return z;
  }
  return null;
}

/** Reads the inventory tab into {sheet, rows:[{row, name, ..., sizes:[{key,label,price,qty,col}]}]} */
function ienn_readInventory_() {
  var sh = ienn_ss_().getSheetByName(CFG_IENN.INVENTORY_SHEET);
  if (!sh) throw new Error("Inventory sheet not found: " + CFG_IENN.INVENTORY_SHEET);
  var values = sh.getDataRange().getValues();
  var head = (values.shift() || []).map(ienn_norm_), col = {}, sizeCols = [];
  Object.keys(CFG_IENN.HEADERS).forEach(function (k) {
    col[k] = -1;
    CFG_IENN.HEADERS[k].some(function (a) { var i = head.indexOf(ienn_norm_(a)); if (i >= 0) { col[k] = i; return true; } return false; });
  });
  if (col.name < 0) throw new Error("No 'Plant' column. Headers: " + head.join(", "));
  head.forEach(function (h, i) { var z = ienn_size_(h); if (z) sizeCols.push({ z: z, i: i }); });
  var rows = [];
  values.forEach(function (r, idx) {
    var name = String(r[col.name] || "").trim(); if (!name) return;
    var act = col.active >= 0 ? String(r[col.active]).trim() : "";
    var hidden = col.active >= 0 && (r[col.active] === false || /^(no|n|false|0|hide)$/i.test(act));
    var g = function (k) { return col[k] >= 0 ? r[col[k]] : ""; };
    var sizes = [];
    sizeCols.forEach(function (c) {
      var q = ienn_num_(r[c.i]);
      if (q != null) sizes.push({ key: c.z.key, label: c.z.label, price: c.z.price, qty: Math.max(0, Math.floor(q)), col: c.i + 1 });
    });
    rows.push({ row: idx + 2, name: name, hidden: hidden, botanical: String(g("botanical") || ""), rank: ienn_num_(g("rank")),
      blurb: String(g("blurb") || ""), photo: String(g("photo") || ""), sizes: sizes });
  });
  return { sheet: sh, rows: rows };
}

function ienn_publicInventory_() {
  var inv = ienn_readInventory_();
  return { ok: true, updated: new Date().toISOString(),
    plants: inv.rows.filter(function (p) { return !p.hidden && p.sizes.length; }).map(function (p) {
      return { name: p.name, botanical: p.botanical, rank: p.rank, blurb: p.blurb, photo: p.photo,
        sizes: p.sizes.map(function (s) { return { key: s.key, label: s.label, qty: s.qty, price: s.price }; }) };
    }) };
}

function ienn_api_doGet_(e) {
  try {
    var api = e.parameter.api;
    if (api === "inventory") {
      var cache = CacheService.getScriptCache(), hit = cache.get("ienn_inventory");
      if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
      var out = JSON.stringify(ienn_publicInventory_());
      cache.put("ienn_inventory", out, CFG_IENN.CACHE_SECONDS);
      return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
    }
    return ienn_json_({ ok: false, error: "unknown_api" });
  } catch (err) { return ienn_json_({ ok: false, error: String(err && err.message || err) }); }
}

function ienn_api_doPost_(e) {
  try {
    if (e.parameter.api !== "order") return ienn_json_({ ok: false, error: "unknown_api" });
    return ienn_json_(ienn_placeOrder_(JSON.parse(e.postData.contents)));
  } catch (err) { return ienn_json_({ ok: false, error: String(err && err.message || err) }); }
}

/** Validates against live counts under a lock, decrements, logs, notifies. Returns a plain object. */
function ienn_placeOrder_(o) {
  var s = function (v, max) { return String(v == null ? "" : v).trim().slice(0, max || 200); };
  if (!o || !s(o.name) || !(s(o.phone) || s(o.email)) || !Array.isArray(o.items) || !o.items.length)
    return { ok: false, error: "missing_fields", message: "Name, phone or email, and at least one plant are required." };
  var lines = [];
  for (var i = 0; i < o.items.length; i++) {
    var it = o.items[i], z = ienn_size_(it.size), q = Math.floor(Number(it.qty));
    if (!s(it.name) || !z || !(q > 0) || q > CFG_IENN.MAX_QTY_PER_LINE)
      return { ok: false, error: "bad_item", message: "Invalid item: " + s(it.name) + " " + s(it.size) };
    lines.push({ name: s(it.name), z: z, qty: q });
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: "busy", message: "Busy, please try again." };
  try {
    var inv = ienn_readInventory_(), byName = {};
    inv.rows.forEach(function (r) { if (!r.hidden) byName[ienn_norm_(r.name)] = r; });
    // merge duplicate lines, then check stock
    var need = {}, short = [];
    lines.forEach(function (l) { var k = ienn_norm_(l.name) + "|" + l.z.key; need[k] = need[k] || { name: l.name, z: l.z, qty: 0 }; need[k].qty += l.qty; });
    Object.keys(need).forEach(function (k) {
      var n = need[k], r = byName[ienn_norm_(n.name)], cell = r && r.sizes.filter(function (x) { return x.key === n.z.key; })[0];
      n.r = r; n.cell = cell;
      if (!cell || cell.qty < n.qty) short.push({ name: n.name, size: n.z.label, requested: n.qty, available: cell ? cell.qty : 0 });
    });
    if (short.length) return { ok: false, error: "insufficient_stock", short: short,
      message: "Not enough stock: " + short.map(function (x) { return x.name + " " + x.size + " (wanted " + x.requested + ", have " + x.available + ")"; }).join("; ") };
    var subtotal = 0, itemText = [];
    Object.keys(need).forEach(function (k) {
      var n = need[k];
      inv.sheet.getRange(n.r.row, n.cell.col).setValue(n.cell.qty - n.qty);
      subtotal += n.qty * n.z.price;
      itemText.push(n.qty + " x " + n.r.name + " (" + n.z.label + ") @ $" + n.z.price + " = $" + (n.qty * n.z.price));
    });
    var ss = ienn_ss_(), osh = ss.getSheetByName(CFG_IENN.ORDERS_SHEET) || ss.insertSheet(CFG_IENN.ORDERS_SHEET);
    if (osh.getLastRow() === 0) osh.appendRow(IENN_ORDER_HEADERS);
    var tz = Session.getScriptTimeZone(), now = new Date();
    var orderId = "W" + Utilities.formatDate(now, tz, "yyMMdd") + "-" + ("000" + osh.getLastRow()).slice(-4);
    osh.appendRow([orderId, now, s(o.name), s(o.phone, 40), s(o.email, 120), s(o.fulfillment, 120), itemText.join("\n"), subtotal,
      s(o.notes, 2000), "New", "No", "", "", "", ""]);
    var row = osh.getLastRow();
    SpreadsheetApp.flush();
    try { CacheService.getScriptCache().remove("ienn_inventory"); } catch (x) {}
    var link = ss.getUrl() + "#gid=" + osh.getSheetId() + "&range=A" + row;
    try { ienn_notifyTeam_(orderId, o, itemText, subtotal, link); } catch (mailErr) { console.error("notify failed: " + mailErr); }
    return { ok: true, orderId: orderId, subtotal: subtotal };
  } finally { lock.releaseLock(); }
}

/** Team recipients: existing app's getSettings() team emails if present, else CFG_IENN.TEAM_EMAILS. */
function ienn_teamEmails_() {
  var found = [];
  try {
    if (typeof getSettings === "function") {
      var st = getSettings(), txt = "";
      var walk = function (v, k) {
        if (v == null) return;
        if (typeof v === "string") { if (/email|team|recipient/i.test(k || "") || /@/.test(v)) txt += " " + v; }
        else if (Array.isArray(v)) v.forEach(function (x) { walk(x, k); });
        else if (typeof v === "object") Object.keys(v).forEach(function (kk) { walk(v[kk], kk); });
      };
      walk(st, "");
      found = txt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    }
  } catch (e) { found = []; }
  if (!found.length) found = CFG_IENN.TEAM_EMAILS.filter(function (x) { return /@/.test(x); });
  return found.filter(function (x, i, a) { return a.indexOf(x) === i; });
}

function ienn_notifyTeam_(orderId, o, itemText, subtotal, link) {
  var to = ienn_teamEmails_();
  if (!to.length) { console.warn("No team emails configured; order " + orderId + " logged only."); return; }
  var body = [
    "New website order " + orderId,
    "", "Customer: " + o.name, "Phone: " + (o.phone || "-"), "Email: " + (o.email || "-"), "Fulfillment: " + (o.fulfillment || "-"),
    "", "Items:", itemText.join("\n"), "Subtotal: $" + subtotal + " (no tax shown on site)",
    "", "Customer notes: " + (o.notes || "-"),
    "", "View details: " + link,
    "", "ONE person should claim this order: put your name in 'Claimed by' and reply to the customer.",
    "Reply text: run ienn_buildCustomerReply_(\"" + orderId + "\") in the script editor (copy/paste, not auto-sent)."
  ].join("\n");
  var msg = { to: to.join(","), subject: "New IENN order #" + orderId + " — " + o.name, body: body };
  if (o.email) msg.replyTo = String(o.email);
  MailApp.sendEmail(msg);
}

/** Copy/paste customer reply for an order (NOT sent). Keep in sync with templates/customer-response.md. */
function ienn_buildCustomerReply_(orderId) {
  var sh = ienn_ss_().getSheetByName(CFG_IENN.ORDERS_SHEET);
  if (!sh) throw new Error("No Orders sheet");
  var v = sh.getDataRange().getValues(), h = v[0], rec = null;
  for (var i = 1; i < v.length; i++) if (String(v[i][0]) === String(orderId)) { rec = {}; h.forEach(function (k, j) { rec[k] = v[i][j]; }); }
  if (!rec) throw new Error("Order not found: " + orderId);
  var paid = /^(yes|y|true)$/i.test(String(rec["Paid"]));
  var addr = String(rec["Pickup address sent"] || "").trim();
  var text = [
    "Hi " + String(rec["Name"]).split(" ")[0] + ",",
    "",
    "Thanks for your order with Inland Empire Native Nursery! Here are the details for order #" + rec["Order ID"] + ":",
    "",
    String(rec["Items"]),
    "Subtotal: $" + rec["Subtotal"],
    "",
    "Payment: " + (paid ? "Paid" + (rec["Payment method"] ? " (" + rec["Payment method"] + ")" : "") + " — thank you!" : "Not yet paid. We accept cash or Zelle at pickup."),
    "Fulfillment: " + rec["Fulfillment"],
    "Pickup: Saturdays 10 AM – 2 PM.",
    "Pickup address: " + (addr || "[CONFIRM ORDER FIRST, then paste the exact Fontana address near Sierra & Baseline here]"),
    "Grand Terrace delivery/service is handled case-by-case — we'll confirm with you directly if you requested it.",
    "",
    "Your notes: " + (rec["Notes"] || "-"),
    "Our response: " + (rec["Our response"] || "[write response here]"),
    "",
    "See you soon,",
    "Inland Empire Native Nursery"
  ].join("\n");
  console.log(text);
  return text;
}
