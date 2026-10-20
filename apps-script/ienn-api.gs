/**
 * IENN website + plant-list API — ADD-ON FILE for the EXISTING IENN inventory/invoice Apps Script project.
 * The inventory tool (Catalog + Submissions) is the single source of truth. This file:
 *   - never creates or points at a different spreadsheet (uses the tool's own spreadsheet, see ienn_ss_)
 *   - never edits people's weekly count JSON in Submissions
 *   - adds ONE ledger tab "Stock Adjustments" (+ a "Web Orders" tab for website contact/reply tracking)
 *   - defines no top-level doGet/doPost; all names are prefixed ienn_
 * NOT deployed by this repo. Install steps: README "Install into the existing Apps Script project".
 *
 * Live stock = getAvailableStock()   (existing: latest week's counts, by plant name, for '4"' and '1 gal')
 *            + sum(Stock Adjustments.Delta where Week key == latest week key)
 * A new weekly count changes the week key, so old adjustments stop applying (baseline resets).
 *
 * Routes (via the one-line patches in README):
 *   GET  <exec>?api=inventory                -> JSON for the website
 *   GET  <exec>?api=plantlist&format=csv     -> CSV download (add &instock=1 for in-stock only)
 *   GET  <exec>?view=plantlist               -> printable plant list (add &instock=1)
 *   POST <exec>?api=order  (text/plain JSON) -> validates live stock under lock, then calls existing submitInvoice()
 */
var CFG_IENN = {
  CATALOG_SHEET: "Catalog",
  SUBMISSIONS_SHEET: "Submissions",
  ADJUSTMENTS_SHEET: "Stock Adjustments",
  WEB_ORDERS_SHEET: "Web Orders",
  // Existing app constants (tax-INCLUSIVE prices: the invoice app computes subtotal = total / 1.0875).
  PRICES: { '2"': 3, '4"': 6, "Tree pot": 10, "1 gal": 15 },
  TAX_PCT: 8.75,
  SIZE_LABELS: { '2"': "2-inch", '4"': "4-inch", "Tree pot": "Quarter tree pot", "1 gal": "1-gallon" },
  TRACKED_SIZES: ['4"', "1 gal"],          // the only sizes the weekly count tracks
  // Name of an EXISTING function in the project that returns the tool's Spreadsheet, if it has one
  // (e.g. "getSpreadsheet_"). Leave "" to auto-detect; see ienn_ss_.
  SPREADSHEET_RESOLVER: "",
  SPREADSHEET_NAME: "IENN Inventory",      // last-resort lookup by name (must be unique in the owner's Drive)
  // submitInvoice() emails the customer a receipt when customerEmail is set. Web orders are unpaid
  // requests, so by default we DON'T pass the email (team replies with the template instead).
  SEND_CUSTOMER_RECEIPT: false,
  ORDER_OWNER: "Andrew",                   // owns order-to-pickup; default for Web Orders "Claimed by"
  CONTACT: "Andrew, call/text (909) 609-9373",
  WEBSITE_ORDER_URL: "",                   // public order.html URL; used by the optional ?view=customer redirect
  LOGO_URL: "",                            // public URL of the existing logo, if any (repo is private)
  CACHE_SECONDS: 30,
  MAX_QTY_PER_LINE: 200
};

var IENN_ADJ_HEADERS = ["Timestamp", "Week key", "Plant", "Size", "Delta", "Ref (invoice/order no)", "Source", "Note"];
var IENN_WEB_HEADERS = ["Invoice no", "Received", "Name", "Phone", "Email", "Fulfillment", "Items", "Total (tax incl.)",
  "Customer notes", "Status", "Paid", "Payment method", "Claimed by", "Pickup address sent", "Our response"];

// ---------------------------------------------------------------- helpers
function ienn_norm_(s) { return String(s == null ? "" : s).toLowerCase().replace(/[\u201c\u201d\u2033]/g, '"').replace(/\s+/g, " ").trim(); }
function ienn_key_(name) { return ienn_norm_(String(name || "").split(" (")[0]); }
function ienn_json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ienn_money_(n) { return (Number(n) || 0).toFixed(2); }
function ienn_size_(s) {
  var n = ienn_norm_(s), al = { '2"': ['2"', "2-inch", "2 inch", "2 in"], '4"': ['4"', "4-inch", "4 inch", "4 in"],
    "Tree pot": ["tree pot", "quarter tree pot", "1/4 tree pot"], "1 gal": ["1 gal", "1-gallon", "1 gallon", "1gal"] };
  for (var k in al) if (al[k].indexOf(n) >= 0) return k;
  return null;
}
function ienn_globalFn_(name) { var g = typeof globalThis !== "undefined" ? globalThis : this; var f = g && g[name]; return typeof f === "function" ? f : null; }

/** The inventory tool's own spreadsheet. Order: configured resolver, common existing helper names,
 *  bound spreadsheet, then the unique Drive file named CFG.SPREADSHEET_NAME. Never creates one. */
function ienn_ss_() {
  if (ienn_ss_.cached) return ienn_ss_.cached;
  var names = (CFG_IENN.SPREADSHEET_RESOLVER ? [CFG_IENN.SPREADSHEET_RESOLVER] : [])
    .concat(["getSpreadsheet_", "getSpreadsheet", "getSS_", "getSS", "getInventorySpreadsheet_", "openInventory_", "ss_"]);
  for (var i = 0; i < names.length; i++) {
    var f = ienn_globalFn_(names[i]);
    if (f) { try { var s = f(); if (s && s.getSheetByName) return (ienn_ss_.cached = s); } catch (e) {} }
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active && active.getSheetByName(CFG_IENN.CATALOG_SHEET)) return (ienn_ss_.cached = active);
  var it = DriveApp.getFilesByName(CFG_IENN.SPREADSHEET_NAME), found = [];
  while (it.hasNext()) found.push(it.next());
  if (found.length !== 1) throw new Error("Can't resolve the inventory tool's spreadsheet (" + found.length + " named '" +
    CFG_IENN.SPREADSHEET_NAME + "'). Set CFG_IENN.SPREADSHEET_RESOLVER to the existing lookup function.");
  return (ienn_ss_.cached = SpreadsheetApp.open(found[0]));
}
function ienn_sheet_(name, headers) {
  var ss = ienn_ss_(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function ienn_rows_(sh) {
  var v = sh.getDataRange().getValues(), h = (v.shift() || []).map(ienn_norm_);
  return { head: h, rows: v, col: function (aliases) { for (var i = 0; i < aliases.length; i++) { var j = h.indexOf(aliases[i]); if (j >= 0) return j; } return -1; } };
}

// ---------------------------------------------------------------- stock
/** Latest weekly-count key. Uses getAvailableStock()'s week if it returns one, else the newest week/date in Submissions. */
function ienn_latestWeekKey_(base) {
  if (base && (base.week || base.weekKey)) return String(base.week || base.weekKey);
  var sh = ienn_ss_().getSheetByName(CFG_IENN.SUBMISSIONS_SHEET); if (!sh) return "unknown";
  var t = ienn_rows_(sh), c = t.col(["week", "week key", "week of", "weekof", "weekkey", "date", "timestamp", "submitted"]);
  if (c < 0) c = 0;
  var best = null;
  t.rows.forEach(function (r) { var v = r[c]; if (v === "" || v == null) return;
    var k = v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd") : String(v);
    if (best == null || k > best) best = k; });
  return best || "unknown";
}
/** Existing getAvailableStock() normalized to {plantKey: {name, '4"': n, '1 gal': n}} (+ week). */
function ienn_baseStock_() {
  var f = ienn_globalFn_("getAvailableStock");
  if (!f) throw new Error("getAvailableStock() not found in this project");
  var raw = f() || {}, base = raw.stock && typeof raw.stock === "object" ? raw.stock : raw, out = {};
  Object.keys(base).forEach(function (name) {
    var v = base[name]; if (!v || typeof v !== "object") return;
    var e = out[ienn_key_(name)] = { name: name };
    Object.keys(v).forEach(function (s) { var k = ienn_size_(s) || s; e[k] = (Number(v[s]) || 0) + (e[k] || 0); });
  });
  return { stock: out, week: ienn_latestWeekKey_(raw) };
}
/** Live stock = base + adjustments for the current week key. */
function ienn_getLiveStock_() {
  var b = ienn_baseStock_(), live = JSON.parse(JSON.stringify(b.stock));
  var sh = ienn_ss_().getSheetByName(CFG_IENN.ADJUSTMENTS_SHEET);
  if (sh && sh.getLastRow() > 1) {
    sh.getDataRange().getValues().slice(1).forEach(function (r) {
      if (String(r[1]) !== String(b.week)) return;
      var k = ienn_key_(r[2]), s = ienn_size_(r[3]) || String(r[3]), d = Number(r[4]) || 0;
      var e = live[k] || (live[k] = { name: String(r[2]) }); e[s] = (e[s] || 0) + d;
    });
  }
  Object.keys(live).forEach(function (k) { CFG_IENN.TRACKED_SIZES.forEach(function (s) { if (live[k][s] != null) live[k][s] = Math.max(0, live[k][s]); }); });
  return { stock: live, week: b.week };
}
/** SHARED by website orders and in-person invoices. Appends one negative row per tracked-size line.
 *  Idempotent per (ref, source): calling twice for the same invoice does nothing the second time. */
function ienn_recordSale_(lines, ref, source, weekKey) {
  if (!lines || !lines.length) return 0;
  var sh = ienn_sheet_(CFG_IENN.ADJUSTMENTS_SHEET, IENN_ADJ_HEADERS);
  if (ref && sh.getLastRow() > 1) {
    var refs = sh.getRange(2, 6, sh.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < refs.length; i++) if (String(refs[i][0]) === String(ref)) return 0;
  }
  var wk = weekKey || ienn_baseStock_().week, now = new Date(), n = 0;
  lines.forEach(function (l) {
    var s = ienn_size_(l.size), q = Math.floor(Number(l.qty) || 0);
    if (!s || CFG_IENN.TRACKED_SIZES.indexOf(s) < 0 || q <= 0) return;
    sh.appendRow([now, wk, String(l.plant || l.name), s, -q, String(ref || ""), source || "", ""]); n++;
  });
  try { CacheService.getScriptCache().remove("ienn_inventory"); } catch (e) {}
  return n;
}

// ---------------------------------------------------------------- catalog / public inventory
function ienn_catalog_() {
  var sh = ienn_ss_().getSheetByName(CFG_IENN.CATALOG_SHEET), list = [];
  if (!sh) return list;
  var t = ienn_rows_(sh);
  var cName = t.col(["common name", "name", "plant", "plant name", "common"]), cBot = t.col(["botanical", "botanical name", "scientific name", "latin"]);
  var cId = t.col(["id", "plant id", "plantid"]), cAct = t.col(["active", "show", "list online"]), cRank = t.col(["rank", "popularity"]);
  var cBlurb = t.col(["blurb", "description"]), cPhoto = t.col(["photo", "photo url", "image"]);
  if (cName < 0) cName = cId >= 0 ? (cId === 0 ? 1 : 0) : 0;
  t.rows.forEach(function (r) {
    var name = String(r[cName] || "").trim(); if (!name) return;
    if (cAct >= 0 && (r[cAct] === false || /^(no|n|false|0|hide)$/i.test(String(r[cAct]).trim()))) return;
    var bot = cBot >= 0 ? String(r[cBot] || "") : ((/\(([^)]+)\)/.exec(name) || [])[1] || "");
    list.push({ id: cId >= 0 ? String(r[cId]) : "", name: name.split(" (")[0].trim(), botanical: bot,
      rank: cRank >= 0 && r[cRank] !== "" ? Number(r[cRank]) : null, blurb: cBlurb >= 0 ? String(r[cBlurb] || "") : "", photo: cPhoto >= 0 ? String(r[cPhoto] || "") : "" });
  });
  return list;
}
function ienn_plants_(inStockOnly) {
  var live = ienn_getLiveStock_(), seen = {}, out = [];
  var add = function (p) {
    var k = ienn_key_(p.name); if (seen[k]) return; seen[k] = 1;
    var st = live.stock[k] || {};
    var sizes = Object.keys(CFG_IENN.PRICES).map(function (s) {
      var tracked = CFG_IENN.TRACKED_SIZES.indexOf(s) >= 0;
      return { key: s, label: CFG_IENN.SIZE_LABELS[s], price: CFG_IENN.PRICES[s], qty: tracked ? (st[s] || 0) : null };
    });
    var inStock = sizes.some(function (z) { return z.qty > 0; });
    if (inStockOnly && !inStock) return;
    out.push({ name: p.name, botanical: p.botanical || "", rank: p.rank, blurb: p.blurb || "", photo: p.photo || "", inStock: inStock, sizes: sizes });
  };
  ienn_catalog_().forEach(add);
  Object.keys(live.stock).forEach(function (k) { add({ name: String(live.stock[k].name).split(" (")[0] }); }); // counted but not in Catalog
  return { ok: true, updated: new Date().toISOString(), week: live.week, taxIncluded: true, taxPct: CFG_IENN.TAX_PCT, plants: out };
}

// ---------------------------------------------------------------- routes
function ienn_api_doGet_(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.view === "plantlist") return ienn_plantListHtml_(p.instock === "1");
    if (p.api === "inventory") {
      var c = CacheService.getScriptCache(), hit = c.get("ienn_inventory");
      if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
      var out = JSON.stringify(ienn_plants_(false)); c.put("ienn_inventory", out, CFG_IENN.CACHE_SECONDS);
      return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
    }
    if (p.api === "plantlist" && p.format === "csv")
      return ContentService.createTextOutput(ienn_exportPlantListCsv_(p.instock === "1")).setMimeType(ContentService.MimeType.CSV).downloadAsFile("ienn-plant-list.csv");
    return ienn_json_({ ok: false, error: "unknown_api" });
  } catch (err) { return ienn_json_({ ok: false, error: String(err && err.message || err) }); }
}
function ienn_api_doPost_(e) {
  try {
    if (!e || !e.parameter || e.parameter.api !== "order") return ienn_json_({ ok: false, error: "unknown_api" });
    return ienn_json_(ienn_placeOrder_(JSON.parse(e.postData.contents)));
  } catch (err) { return ienn_json_({ ok: false, error: String(err && err.message || err) }); }
}

// ---------------------------------------------------------------- website order -> existing invoice flow
function ienn_placeOrder_(o) {
  var s = function (v, max) { return String(v == null ? "" : v).trim().slice(0, max || 200); };
  if (!o || !s(o.name) || !(s(o.phone) || s(o.email)) || !Array.isArray(o.items) || !o.items.length)
    return { ok: false, error: "missing_fields", message: "Name, phone or email, and at least one plant are required." };
  var need = {}, order = [];
  for (var i = 0; i < o.items.length; i++) {
    var it = o.items[i], z = ienn_size_(it.size), q = Math.floor(Number(it.qty));
    if (!s(it.name) || !z || !(q > 0) || q > CFG_IENN.MAX_QTY_PER_LINE)
      return { ok: false, error: "bad_item", message: "Invalid item: " + s(it.name) + " " + s(it.size) };
    var k = ienn_key_(it.name) + "|" + z;
    if (!need[k]) { need[k] = { name: s(it.name), size: z, qty: 0 }; order.push(need[k]); }
    need[k].qty += q;
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: "busy", message: "Busy, please try again in a moment." };
  try {
    var live = ienn_getLiveStock_(), short = [];
    order.forEach(function (n) {
      if (CFG_IENN.TRACKED_SIZES.indexOf(n.size) < 0) { short.push({ name: n.name, size: CFG_IENN.SIZE_LABELS[n.size], requested: n.qty, available: null, reason: "not_tracked" }); return; }
      var st = live.stock[ienn_key_(n.name)], have = st ? (st[n.size] || 0) : 0;
      n.plant = st ? st.name : n.name;   // exact name the invoice app knows
      if (have < n.qty) short.push({ name: n.name, size: CFG_IENN.SIZE_LABELS[n.size], requested: n.qty, available: have });
    });
    if (short.length) return { ok: false, error: "insufficient_stock", short: short,
      message: "Not enough stock: " + short.map(function (x) { return x.name + " " + x.size + (x.available == null ? " (available on request — ask us)" : " (wanted " + x.requested + ", have " + x.available + ")"); }).join("; ") };

    var lines = order.map(function (n) { return { plant: n.plant, size: n.size, qty: String(n.qty), amt: ienn_money_(n.qty * CFG_IENN.PRICES[n.size]) }; });
    var grand = order.reduce(function (t, n) { return t + n.qty * CFG_IENN.PRICES[n.size]; }, 0);
    var sub = grand / (1 + CFG_IENN.TAX_PCT / 100), tax = grand - sub;
    var itemsText = order.map(function (n) { return n.qty + " x " + n.plant + " (" + CFG_IENN.SIZE_LABELS[n.size] + ") = $" + ienn_money_(n.qty * CFG_IENN.PRICES[n.size]); }).join("\n");

    // Web Orders row first so the team email (inside submitInvoice) can link to it.
    var ss = ienn_ss_(), wsh = ienn_sheet_(CFG_IENN.WEB_ORDERS_SHEET, IENN_WEB_HEADERS);
    wsh.appendRow(["(pending)", new Date(), s(o.name), s(o.phone, 40), s(o.email, 120), "Pickup – Fontana", itemsText, ienn_money_(grand),
      s(o.notes, 2000), "New", "No", "", CFG_IENN.ORDER_OWNER, "", ""]);
    var row = wsh.getLastRow(), link = ss.getUrl() + "#gid=" + wsh.getSheetId() + "&range=A" + row;
    var note = ["WEBSITE ORDER — " + s(o.name) + " • " + s(o.phone, 40) + " • " + s(o.email, 120), "Fulfillment: Pickup – Fontana" + (/grand terrace/i.test(String(o.notes || "")) ? " (customer asked about Grand Terrace pickup — see notes)" : ""),
      "Customer notes: " + (s(o.notes, 2000) || "-"), "Order details / claim: " + link,
      CFG_IENN.ORDER_OWNER + " claims & handles this order (Web Orders → Claimed by) and replies using ienn_buildCustomerReply_."].join("\n");
    var data = { date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"), paid: "unpaid", payment: "",
      customerEmail: CFG_IENN.SEND_CUSTOMER_RECEIPT ? s(o.email, 120) : "", discType: "none", discAmt: "", note: note,
      lines: lines, subtotal: ienn_money_(sub), tax: ienn_money_(tax), grand: ienn_money_(grand), source: "website" };

    var invno, submit = ienn_globalFn_("submitInvoice");
    try {
      if (!submit) throw new Error("submitInvoice() not found");
      var res = submit(data) || {}; invno = res.invno || res.invoiceNo || res.id;
      if (!invno) throw new Error("submitInvoice returned no invno");
    } catch (subErr) {
      wsh.getRange(row, 10).setValue("FAILED: " + String(subErr && subErr.message || subErr));
      return { ok: false, error: "invoice_failed", message: "We couldn't record your order. Please contact " + CFG_IENN.CONTACT + "." };
    }
    wsh.getRange(row, 1).setValue(invno);
    ienn_recordSale_(lines, invno, "website", live.week);   // no-op if the patched submitInvoice already recorded it
    return { ok: true, orderId: invno, total: grand, subtotal: Number(ienn_money_(sub)), tax: Number(ienn_money_(tax)) };
  } finally { lock.releaseLock(); }
}

// ---------------------------------------------------------------- printable list + CSV
function ienn_esc_(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function ienn_avail_(q) { return q == null ? "Available on request — ask us" : (q > 0 ? q + " available" : "sold out"); }
function ienn_sorted_(inStockOnly) {
  return ienn_plants_(inStockOnly).plants.sort(function (a, b) { return (b.inStock - a.inStock) || a.name.localeCompare(b.name); });
}
function ienn_plantListHtml_(inStockOnly) {
  var plants = ienn_sorted_(inStockOnly), tz = Session.getScriptTimeZone();
  var base = ScriptApp.getService().getUrl();
  var rows = plants.map(function (p) {
    return "<tr class='" + (p.inStock ? "" : "out") + "'><td><b>" + ienn_esc_(p.name) + "</b>" + (p.botanical ? "<br><i>" + ienn_esc_(p.botanical) + "</i>" : "") + "</td>" +
      p.sizes.map(function (z) { return "<td>$" + z.price + "<br><small>" + ienn_avail_(z.qty) + "</small></td>"; }).join("") + "</tr>";
  }).join("");
  var html = "<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>IENN Plant List</title><style>" +
    "body{font:14px/1.35 system-ui,sans-serif;color:#222;margin:24px;max-width:900px}h1{color:#4a5a4a;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}" +
    "th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f6f3}tr.out{color:#999}" +
    ".info{background:#f8f6f3;border-left:4px solid #6b7c6a;padding:8px 12px;margin:10px 0}.bar a,.bar button{margin-right:8px}" +
    "@media print{.bar{display:none}body{margin:0}}</style></head><body>" +
    (CFG_IENN.LOGO_URL ? "<img src='" + ienn_esc_(CFG_IENN.LOGO_URL) + "' alt='IENN logo' style='height:56px'>" : "") +
    "<h1>Inland Empire Native Nursery — Plant List</h1><div>Availability as of " + Utilities.formatDate(new Date(), tz, "MMM d, yyyy h:mm a") + "</div>" +
    "<div class='info'><b>Pickup:</b> Saturdays 10 AM – 2 PM &nbsp;•&nbsp; <b>Payment:</b> Cash or Zelle &nbsp;•&nbsp; <b>Location:</b> Fontana near Sierra &amp; Baseline (~10 min from the 210) &nbsp;•&nbsp; Questions: " + ienn_esc_(CFG_IENN.CONTACT) + "</div>" +
    "<div class='bar'><button onclick='window.print()'>Print / Save as PDF</button>" +
    "<a target='_top' href='" + base + "?view=plantlist" + (inStockOnly ? "" : "&instock=1") + "'>" + (inStockOnly ? "Show all plants" : "In-stock only") + "</a>" +
    "<a target='_top' href='" + base + "?api=plantlist&format=csv" + (inStockOnly ? "&instock=1" : "") + "'>Download CSV</a></div>" +
    "<table><thead><tr><th>Plant</th>" + Object.keys(CFG_IENN.PRICES).map(function (s) { return "<th>" + CFG_IENN.SIZE_LABELS[s] + "</th>"; }).join("") + "</tr></thead><tbody>" +
    (rows || "<tr><td colspan='5'>No plants listed.</td></tr>") + "</tbody></table>" +
    "<p><small>Grand Terrace pickup available upon request.<br>Other pickup times available case by case upon request.<br>2-inch and quarter tree pot: available on request — ask us (" + ienn_esc_(CFG_IENN.CONTACT) + ").</small></p></body></html>";
  return HtmlService.createHtmlOutput(html).setTitle("IENN Plant List").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function ienn_exportPlantListCsv_(inStockOnly) {
  var q = function (v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var sizes = Object.keys(CFG_IENN.PRICES);
  var head = ["Plant", "Botanical"].concat(sizes.map(function (s) { return CFG_IENN.SIZE_LABELS[s] + " price"; }), sizes.map(function (s) { return CFG_IENN.SIZE_LABELS[s] + " available"; }));
  var lines = [head.map(q).join(",")];
  ienn_sorted_(inStockOnly).forEach(function (p) {
    lines.push([p.name, p.botanical].concat(p.sizes.map(function (z) { return z.price; }), p.sizes.map(function (z) { return z.qty == null ? "on request" : z.qty; })).map(q).join(","));
  });
  lines.push("", q("Pickup – Fontana near Sierra & Baseline, Saturdays 10 AM – 2 PM. Cash or Zelle. Grand Terrace pickup available upon request. Other pickup times available case by case upon request."));
  return lines.join("\n");
}

// ---------------------------------------------------------------- customer reply (copy/paste, never sent)
/** Keep in sync with templates/customer-response.md. Run in the editor; copy from the Execution log. */
function ienn_buildCustomerReply_(invoiceNo) {
  var sh = ienn_ss_().getSheetByName(CFG_IENN.WEB_ORDERS_SHEET); if (!sh) throw new Error("No Web Orders sheet");
  var v = sh.getDataRange().getValues(), h = v[0], rec = null;
  for (var i = 1; i < v.length; i++) if (String(v[i][0]) === String(invoiceNo)) { rec = {}; h.forEach(function (k, j) { rec[k] = v[i][j]; }); }
  if (!rec) throw new Error("Order not found: " + invoiceNo);
  var paid = /^(yes|y|true|paid)$/i.test(String(rec["Paid"])), addr = String(rec["Pickup address sent"] || "").trim();
  var text = ["Hi " + String(rec["Name"]).split(" ")[0] + ",", "",
    "Thanks for your order with Inland Empire Native Nursery! Order #" + rec["Invoice no"] + ":", "",
    String(rec["Items"]), "Total: $" + rec["Total (tax incl.)"] + " (taxes included)", "",
    "Payment: " + (paid ? "Paid" + (rec["Payment method"] ? " (" + rec["Payment method"] + ")" : "") + " — thank you!" : "Not yet paid. We accept cash or Zelle at pickup."),
    "Fulfillment: " + rec["Fulfillment"], "Pickup: Saturdays 10 AM – 2 PM.",
    "Pickup address: " + (addr || "[CONFIRM ORDER FIRST, then paste the exact Fontana address near Sierra & Baseline here]"),
    /grand terrace/i.test(String(rec["Customer notes"] || "")) ? "Grand Terrace pickup is available upon request — we'll confirm the details with you." : "",
    /(time|day|sunday|weekday|other|earlier|later)/i.test(String(rec["Customer notes"] || "")) ? "Other pickup times are available case by case upon request — we'll confirm a time with you." : "", "",
    "Your notes: " + (rec["Customer notes"] || "-"), "Our response: " + (rec["Our response"] || "[write response here]"), "",
    "See you soon,", "Andrew — Inland Empire Native Nursery", "Call/text (909) 609-9373"].join("\n");
  console.log(text);
  return text;
}

// ---------------------------------------------------------------- optional: retire the public ?view=customer
/** Optional one-line patch, first line of the existing doGet:
 *    if (e && e.parameter && e.parameter.view === "customer") return ienn_redirectToWebsite_();
 *  Sends anyone using the old Apps Script customer view to the website order page (the ONE public order path). */
function ienn_redirectToWebsite_() {
  var url = CFG_IENN.WEBSITE_ORDER_URL;
  var body = url ? "<p>We've moved! Order at <a target='_top' href='" + ienn_esc_(url) + "'>" + ienn_esc_(url) + "</a>.</p><script>window.top.location.href=" + JSON.stringify(url) + ";</script>"
                 : "<p>Online ordering is on our website. Questions: " + ienn_esc_(CFG_IENN.CONTACT) + ".</p>";
  return HtmlService.createHtmlOutput("<!doctype html><meta charset='utf-8'><body style='font:16px system-ui;padding:24px'>" + body + "</body>")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
