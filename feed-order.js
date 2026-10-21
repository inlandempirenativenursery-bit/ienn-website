/* IENN feed order (tested in tests/feed-order.test.js). The server (Apps Script ?view=inventory) decides the order.
   - No `rank` on any item: keep the feed order exactly.
   - `rank` on any item: stable sort, pinned:true first (relative order kept), then ascending rank, then unranked in feed order.
   - Stock status never reorders. Rank/popularity are never shown to customers. */
var IENNOrder = (function () {
  function hasRank(p) { return p && p.rank != null && p.rank !== "" && isFinite(Number(p.rank)); }
  function isPinned(p) { return p && (p.pinned === true || p.pinned === "true" || p.pinned === "TRUE"); }
  function order(list) {
    var a = (list || []).slice();
    if (!a.some(hasRank)) return a;
    return a.map(function (p, i) { return { p: p, i: i }; }).sort(function (x, y) {
      var px = isPinned(x.p) ? 0 : 1, py = isPinned(y.p) ? 0 : 1; if (px !== py) return px - py;
      if (px === 0) return x.i - y.i;
      var rx = hasRank(x.p), ry = hasRank(y.p); if (rx !== ry) return rx ? -1 : 1;
      if (rx && Number(x.p.rank) !== Number(y.p.rank)) return Number(x.p.rank) - Number(y.p.rank);
      return x.i - y.i;
    }).map(function (o) { return o.p; });
  }
  return { order: order };
})();
if (typeof module !== "undefined") module.exports = IENNOrder;
