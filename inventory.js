/* IENN shared inventory loader (used by index.html and order.html).
   Paste the deployed inventory web-app URL below (see apps-script/IENN_Website.gs iennInventory() + README).
   While empty or unreachable, pages show the FALLBACK list with "Ask about availability" (never fake "Available"). */
var INVENTORY_URL = "https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec?view=inventory"; // live once ?view=inventory is deployed (returns HTML today -> fallback)
var ORDER_URL = "https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec"; // doPost order intake (once deployed)
/* PRICES ARE BY SIZE ONLY (authoritative; feed prices ignored). Same table as apps-script/IENN_Config.gs (IENN_SIZES).
   Size labels match the inventory tool: 2", 4", Tree pot, 1 gal. Prices INCLUDE 8.75% sales tax (as in the invoice tool). */
var IENN_SIZES = ['2"', '4"', "Tree pot", "1 gal"];
var IENN_SIZE_PRICES = { '2"': 3, '4"': 6, "Tree pot": 10, "1 gal": 15 };
var IENN_TAX_PCT = 8.75;
/* Sizes not tracked in weekly counts: shown on every plant as "Available on request" (no stock check). */
var IENN_REQUEST_SIZES = ['2"', "Tree pot"];
function ienIsRequest(size) { return IENN_REQUEST_SIZES.indexOf(ienNormSize(size) || size) >= 0; }
var IENN_PHONE = "(909) 609-9373", IENN_TEL = "+19096099373"; // Andrew — call/text
var IENN_PRINTLIST_URL = "https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec?view=print";
function ienTax(total) { var sub = total / (1 + IENN_TAX_PCT / 100); return { subtotal: Math.round(sub * 100) / 100, tax: Math.round((total - sub) * 100) / 100, total: total }; }
function ienNormSize(s) {
  var t = String(s == null ? "" : s).toLowerCase().replace(/[\u201d\u2033]/g, '"').replace(/\s+/g, " ").trim();
  if (t === "four") return '4"'; if (t === "gal1") return "1 gal"; if (t === "two") return '2"';
  if (/quarter|1\/4|\u00bc|tree/.test(t)) return "Tree pot";
  if (/^1 ?(-| )?(gal|gallon)s?\b|^1g$|^#1$|one gallon/.test(t)) return "1 gal";
  if (/^2 ?(-| )?("|in\b|inch|inches)|^2$/.test(t)) return '2"';
  if (/^4 ?(-| )?("|in\b|inch|inches)|^4$/.test(t)) return '4"';
  return null;
}
function ienPrice(size) { var z = ienNormSize(size); return z ? IENN_SIZE_PRICES[z] : null; }
var IENN_LOW_STOCK = 5;          // qty at or below this => "Low stock"
var IENN_PINNED = [/salvia apiana|white sage/i, /sticky monkey ?flower|southern bush monkey ?flower|diplacus (aurantiacus|longiflorus)/i, /rock monkey ?flower|diplacus calycinus/i, /diplacus|mimulus|monkey ?flower/i,
  /california poppy|eschscholzia/i, /showy penstemon|penstemon spectabilis/i, /scarlet bugler|centranthifolius/i, /matilija|romneya/i, /milkweed|asclepias/i]; // shown first (sheet rank still wins)
var IENN_COLORFUL = /flower|bloom|curls|poppy|penstemon|salvia|sage|lupin|ceanothus|buckwheat|yarrow|milkweed|aster|primrose|verbena|iris|fuchsia|gilia|phacelia|clarkia/i;

/* MARKED FALLBACK ONLY: names/sizes from existing site copy; stock unknown, no prices. */
var IENN_FALLBACK = [
  { name: "Southern bush monkeyflower", botanical: "Diplacus longiflorus", sizes: [{ size: "1-gallon" }] },
  { name: "Woolly Blue Curls", botanical: "Trichostema lanatum", sizes: [{ size: "4-inch" }] },
  { name: "Yarrow", botanical: "Achillea millefolium", sizes: [{ size: "4-inch" }] },
  { name: "Blue Pyramid Cypress", botanical: "Cupressus arizonica 'Blue Pyramid'", sizes: [{ size: "1-gallon" }] }
];

var IENN = (function () {
  function pick(o, keys) { for (var i = 0; i < keys.length; i++) { for (var k in o) if (k.toLowerCase().replace(/[\s_-]/g, "") === keys[i]) { var v = o[k]; if (v !== "" && v != null) return v; } } return undefined; }
  function num(v) { if (v == null || v === "") return null; var n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? null : n; }
  function slug(s) { return String(s).toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function statusFrom(qty, txt) {
    if (txt) { txt = String(txt).toLowerCase(); if (/out|sold|none|^no$|false|0/.test(txt)) return "out"; if (/low|limit/.test(txt)) return "low"; if (/in|avail|yes|true/.test(txt)) return "in"; }
    if (qty == null) return "unknown"; if (qty <= 0) return "out"; if (qty <= IENN_LOW_STOCK) return "low"; return "in";
  }
  function norm(r) {
    var name = pick(r, ["name", "plant", "commonname", "common", "plantname"]); if (!name) return null;
    name = String(name); var bot = pick(r, ["botanical", "botanicalname", "scientific", "scientificname", "latin"]);
    var m = name.match(/^(.*?)\s*\((.*)\)\s*$/); if (m) { name = m[1]; bot = bot || m[2]; }
    var sizes = pick(r, ["sizes", "variants"]), out = [];
    if (Array.isArray(sizes)) sizes.forEach(function (s) { if (typeof s === "string") s = { size: s }; out.push({ size: String(pick(s, ["size", "container"]) || ""), qty: num(pick(s, ["qty", "quantity", "stock", "onhand", "available"])), price: num(pick(s, ["price", "cost"])), status: pick(s, ["status", "instock"]), extra: num(pick(s, ["extra"])), canRequest: s.canRequest == null ? null : s.canRequest === true }); });
    else if (sizes && typeof sizes === "object") for (var k in sizes) { var v = sizes[k]; out.push(typeof v === "object" ? { size: k, qty: num(pick(v, ["qty", "quantity", "stock"])), price: num(pick(v, ["price"])) } : { size: k, qty: num(v) }); }
    else out.push({ size: String(pick(r, ["size", "container", "pot"]) || ""), qty: num(pick(r, ["qty", "quantity", "stock", "onhand", "available", "count"])), price: num(pick(r, ["price", "cost"])), status: pick(r, ["status", "instock", "availability"]) });
    var merged = {}; out.forEach(function (s) { var z = ienNormSize(s.size) || s.size || ""; if (merged[z]) { if (s.qty != null) merged[z].qty = (merged[z].qty || 0) + s.qty; } else { s.size = z; merged[z] = s; } });
    out = Object.keys(merged).map(function (z) { var s = merged[z]; s.price = ienPrice(z); return s; })
      .sort(function (a, b) { return IENN_SIZES.indexOf(a.size) - IENN_SIZES.indexOf(b.size); });
    out = out.filter(function (s) { return !ienIsRequest(s.size); });
    out.forEach(function (s) { s.status = statusFrom(s.qty, s.status); });
    var rank = { in: 0, low: 1, unknown: 2, out: 3 }, best = out.reduce(function (a, s) { return rank[s.status] < rank[a] ? s.status : a; }, "out");
    if (!out.length) best = "request";
    IENN_REQUEST_SIZES.forEach(function (z) { out.push({ size: z, qty: null, price: IENN_SIZE_PRICES[z], status: "request" }); });
    var img = String(pick(r, ["image", "imageurl", "photo", "img"]) || ""), ph = img || typeof ienPhoto !== "function" ? null : ienPhoto(name);
    return { id: String(pick(r, ["id", "slug", "sku"]) || slug(name)), name: name.trim(), botanical: bot ? String(bot) : "", note: String(pick(r, ["note", "description", "notes", "blurb"]) || ""),
      image: img || (ph ? ph.src : ""), srcset: ph ? ph.srcset : "", rank: num(pick(r, ["rank"])), pinned: pick(r, ["pinned"]) === true || String(pick(r, ["pinned"])).toLowerCase() === "true",
      color: String(pick(r, ["color", "flowercolor", "bloom"]) || ""), sizes: out, status: best };
  }
  function sortList(a) { return (typeof IENNOrder !== "undefined" ? IENNOrder : require("./feed-order.js")).order(a); }
  /* Raw Apps Script getInitial() shape: {plants:["Name (Bot)"], sizes, defaultPrices:{size:price}, stock:{plant:{size:qty}}, sort?, photos?} */
  function fromInitial(d) {
    var stock = d.stock || {}, prices = d.defaultPrices || {}, sort = d.sort || {}, photos = d.photos || {};
    var names = d.plants.slice(); Object.keys(stock).forEach(function (k) { if (names.indexOf(k) < 0 && !names.some(function (n) { return n.split(" (")[0] === k.split(" (")[0]; })) names.push(k); });
    return names.map(function (full) {
      var c = full.split(" (")[0].trim(), st = stock[full] || stock[c];
      if (!st) for (var k in stock) if (k.split(" (")[0].trim().toLowerCase() === c.toLowerCase()) { st = stock[k]; break; }
      var zs = st ? Object.keys(st) : (d.sizes || []);
      return { name: full, rank: sort[full] != null ? sort[full] : sort[c], image: photos[full] || photos[c] || "",
        sizes: (zs.length ? zs : [""]).map(function (z) { var p = typeof prices[z] === "number" || typeof prices[z] === "string" ? prices[z] : null; return { size: z, qty: st ? (st[z] == null ? null : st[z]) : null, price: p }; }) };
    });
  }
  function parse(d) { if (d && Array.isArray(d.plants) && typeof d.plants[0] === "string") d = fromInitial(d); var rows = Array.isArray(d) ? d : (d && (d.plants || d.inventory || d.items || d.data)) || []; return sortList(rows.map(norm).filter(Boolean)); }
  function jsonp(url, ok, fail) {
    var cb = "ienncb" + Date.now(), s = document.createElement("script"), t = setTimeout(function () { done(); fail(); }, 10000);
    function done() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
    window[cb] = function (d) { done(); ok(d); };
    s.onerror = function () { done(); fail(); };
    s.src = url + (url.indexOf("?") < 0 ? "?" : "&") + "callback=" + cb; document.head.appendChild(s);
  }
  /* cb(list, live:boolean) */
  function load(cb) {
    var fb = function () { cb(parse(IENN_FALLBACK).map(function (p) { p.sizes.forEach(function (s) { if (s.status !== "request") s.status = "unknown"; }); p.status = "unknown"; return p; }), false); };
    if (!INVENTORY_URL) return fb();
    var good = function (d) { var l = parse(d); l.length ? cb(l, true, d) : fb(); if (d && window.iennPromo) window.iennPromo(d.promo); };
    fetch(INVENTORY_URL).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(good)
      .catch(function () { jsonp(INVENTORY_URL, good, fb); });
  }
  return { load: load, parse: parse, slug: slug };
})();

if (typeof module !== "undefined") module.exports = { IENN: IENN, ienNormSize: ienNormSize, ienPrice: ienPrice, ienTax: ienTax, ienIsRequest: ienIsRequest };
