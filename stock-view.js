/* IENN stock display rules for the order page and home cards (pure functions; tested in tests/stock-view.test.js).
   Feed sizes: {key, size, price, qty, extra, canRequest}. qty = retail-ready units (null = no count / untracked);
   extra = smaller, not-yet-ready plants on hand; canRequest = extra > 0. Works with the older feed too (no extra/canRequest).
   - No baseline (countDate/baseline null, or no field and no tracked qty > 0): stock UNKNOWN, show every plant
     ("We'll confirm availability"), never hide.
   - Baseline (countDate set, or real stock detected): show all plants. Zero-inventory plants are kept so shop.js can
     sort them after plants with ready or available stock. Individual sizes with qty==0 && !canRequest are still
     filtered from the size chips.
   - Never show exact counts. qty < LOW, chosen qty > qty, or qty 0 with canRequest => "Ask us" (still addable as a request).
   - canRequest: never cap the quantity at qty; the server accepts the extra as a request. */
var IENNStock = (function () {
  var LOW = 5, ASK = ['2"', 'Tree pot'];
  var KEYS = ["countDate", "baseline", "countedAt", "lastCount", "baselineDate"];
  function isAsk(z) { return !!z && ASK.indexOf(z.key) >= 0; }
  function canReq(z) { return !!z && (z.canRequest === true || (z.canRequest == null && Number(z.extra) > 0)); }
  function hasBaseline(d, plants) {
    d = d || {};
    for (var i = 0; i < KEYS.length; i++) if (KEYS[i] in d) {
      var v = d[KEYS[i]]; if (v == null || v === "" || v === false) return false;
      if (KEYS[i] === "countDate") return true;   // a dated count is a real baseline
    }
    return (plants || []).some(anyStock);
  }
  function anyStock(p) { return (p.sizes || []).some(function (z) { return !isAsk(z) && (z.qty > 0 || canReq(z)); }); }
  /* tracked size can be added to the tray (qty null = unknown/offline: orderable, we confirm) */
  function available(z) { return !!z && !isAsk(z) && (z.qty == null || z.qty > 0 || canReq(z)); }
  /* plants: [{sizes:[{key,qty,extra,canRequest,...}]}] -> filtered copy of sizes, but all plants kept */
  function view(plants, baseline) {
    return plants.map(function (p) {
      if (!baseline) return Object.assign({}, p, { sizes: p.sizes.map(function (z) { return isAsk(z) ? z : Object.assign({}, z, { qty: null }); }) });
      var keep = p.sizes.filter(function (z) { return isAsk(z) || available(z) || (z.qty != null && z.qty <= 0); }); // keep zeros so plant shows as out
      return Object.assign({}, p, { sizes: keep });
    }).filter(Boolean);
  }
  /* state of a size for a wanted quantity: "request" | "unknown" | "ask" | "ok" | "out" */
  function sizeState(z, want) {
    if (isAsk(z)) return "request";
    if (z.qty == null) return "unknown";
    if (z.qty <= 0 && !canReq(z)) return "out";
    if (z.qty < LOW || (want || 1) > z.qty) return "ask";
    return "ok";
  }
  /* true when this quantity goes beyond ready stock and will be sent as a request */
  function isRequest(z, want) { return false; }   // retired: quantities are now capped at ready stock
  /* Hard cap = retail-ready qty (extra/canRequest no longer lifts the cap: customers can't add more than we have ready). */
  function maxQty(z) { return z && z.qty != null && !isAsk(z) ? Math.max(0, Math.min(99, z.qty)) : 99; }
  /* "Only a few left": tracked size with 1..LOW_STOCK ready (never shows the number). */
  function lowStock(z) { var L = typeof LOW_STOCK === "number" ? LOW_STOCK : LOW; return !!z && !isAsk(z) && z.qty != null && z.qty > 0 && z.qty <= L; }
  function txt(v) { return v == null ? "" : String(v).trim(); }
  /* POST success notices / stock-rejection problems -> plain-text messages (render with textContent only) */
  function notices(r) { return ((r && r.notices) || []).map(function (n) { return txt(n && n.message); }).filter(Boolean); }
  function problems(r) { return ((r && r.problems) || []).map(function (n) { return txt(n && n.message); }).filter(Boolean); }
  return { LOW: LOW, isAsk: isAsk, canReq: canReq, available: available, hasBaseline: hasBaseline, view: view, sizeState: sizeState,
    isRequest: isRequest, maxQty: maxQty, lowStock: lowStock, notices: notices, problems: problems };
})();
if (typeof module !== "undefined") module.exports = IENNStock;
