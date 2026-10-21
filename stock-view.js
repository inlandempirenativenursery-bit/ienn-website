/* IENN stock display rules for the order page (pure functions; tested in tests/stock-view.test.js).
   - No real count yet (feed baseline null/missing AND no tracked qty > 0): stock is UNKNOWN, show every plant
     ("We'll confirm availability"), never hide.
   - Real count: hide size chips with qty 0; hide a plant when all its tracked sizes are 0.
   - Never show exact counts. qty < LOW (or chosen qty > available) => "Ask us". */
var IENNStock = (function () {
  var LOW = 5, ASK = ['2"', 'Tree pot'];
  function isAsk(z) { return !!z && ASK.indexOf(z.key) >= 0; }
  function hasBaseline(d, plants) {
    d = d || {};
    var keys = ["baseline", "countDate", "countedAt", "lastCount", "baselineDate"];
    for (var i = 0; i < keys.length; i++) if (keys[i] in d && (d[keys[i]] == null || d[keys[i]] === "")) return false;
    return (plants || []).some(anyStock);
  }
  function anyStock(p) { return (p.sizes || []).some(function (z) { return !isAsk(z) && z.qty > 0; }); }
  /* plants: [{sizes:[{key,qty,...}]}] -> filtered copy */
  function view(plants, baseline) {
    return plants.map(function (p) {
      var tracked = p.sizes.filter(function (z) { return !isAsk(z); });
      if (!baseline) return Object.assign({}, p, { sizes: p.sizes.map(function (z) { return isAsk(z) ? z : Object.assign({}, z, { qty: null }); }) });
      var keep = p.sizes.filter(function (z) { return isAsk(z) || z.qty == null || z.qty > 0; });
      if (tracked.length && !keep.some(function (z) { return !isAsk(z); })) return null;
      return Object.assign({}, p, { sizes: keep });
    }).filter(Boolean);
  }
  /* state of a size for a wanted quantity: "request" | "unknown" | "ask" | "ok" */
  function sizeState(z, want) {
    if (isAsk(z)) return "request";
    if (z.qty == null) return "unknown";
    if (z.qty < LOW || (want || 1) > z.qty) return "ask";
    return "ok";
  }
  function maxQty(z) { return z && z.qty != null && !isAsk(z) ? Math.max(1, Math.min(99, z.qty)) : 99; }
  return { LOW: LOW, isAsk: isAsk, hasBaseline: hasBaseline, view: view, sizeState: sizeState, maxQty: maxQty };
})();
if (typeof module !== "undefined") module.exports = IENNStock;
