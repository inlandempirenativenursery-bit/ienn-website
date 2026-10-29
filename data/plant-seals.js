/* Official-symbol seals on plant cards (a small sage/lilac/cream rosette, never the Great Seal of California: no bear, no Minerva, no "Great Seal" wording).
   Keyed by exact botanical name (first two words, case-insensitive); IENN_SEAL_ALIAS maps synonyms. Add an entry only after checking the statute.
   label: full text (shown in the "body" placement and used for screen readers); arc: [top, bottom] curved text on the round seal ("photo" placement);
   mark: center art ("grass"); src: where it was verified (see docs/seals-2026-10-28.md).
   mark picks the center art from IENN_SEAL_MARKS ("grass", "poppy"); add a new drawing there for a new kind of symbol. */
var IENN_SEALS = {
  "Stipa pulchra": { label: "California State Grass", arc: ["CALIFORNIA", "STATE GRASS"], mark: "grass",
    src: "Cal. Gov. Code §425.10 (SB 1226, Machado; Stats. 2004, ch. 243; approved Aug 23, 2004)" },
  "Eschscholzia californica": { label: "California State Flower", arc: ["CALIFORNIA", "STATE FLOWER"], mark: "poppy",
    src: "Cal. Gov. Code §421 (\"The golden poppy (Eschscholzia californica) is the official State Flower.\")" }
};
/* Center art for each kind of seal: lists of [svg tag, attributes]. Colors come from shop.css classes (sage, lilac, cream; honey gold for the poppy). No red. */
var IENN_SEAL_MARKS = {
  grass: [   // grass tuft + two arching awned seed heads
    ["path", { d: "M0 26 C-2 10 -10 -2 -22 -10", class: "seal-blade" }], ["path", { d: "M0 26 C-1 8 -4 -8 -9 -22", class: "seal-blade" }],
    ["path", { d: "M0 26 C1 6 3 -10 4 -26", class: "seal-blade" }], ["path", { d: "M0 26 C2 10 9 -2 18 -12", class: "seal-blade" }],
    ["path", { d: "M0 26 C3 14 14 6 24 2", class: "seal-blade" }],
    ["path", { d: "M4 -26 C10 -30 18 -28 22 -20", class: "seal-awn" }], ["ellipse", { cx: 4, cy: -26, rx: 2.4, ry: 5.2, transform: "rotate(-20 4 -26)", class: "seal-seed" }],
    ["path", { d: "M18 -12 C24 -16 30 -14 33 -7", class: "seal-awn" }], ["ellipse", { cx: 18, cy: -12, rx: 2.2, ry: 4.6, transform: "rotate(30 18 -12)", class: "seal-seed" }]
  ],
  poppy: [   // side view of a cup of 4 petals (back, left, right, front) on a stem with a fine leaf
    ["path", { d: "M0 30 C1 20 -1 10 0 2", class: "seal-stem" }], ["path", { d: "M0 22 C-6 19 -12 14 -15 7 M-8 17 C-12 17 -15 15 -17 13 M0 26 C6 23 11 18 13 12", class: "seal-stem seal-leaf" }],
    ["path", { d: "M-10 0 C-13 -12 -7 -25 0 -27 C7 -25 13 -12 10 0 Z", class: "seal-petal seal-petal-back" }],
    ["path", { d: "M-1 2 C-11 2 -21 -6 -22 -19 C-15 -19 -7 -13 -3 -5 Z", class: "seal-petal" }],
    ["path", { d: "M1 2 C11 2 21 -6 22 -19 C15 -19 7 -13 3 -5 Z", class: "seal-petal" }],
    ["path", { d: "M-9 0 C-11 -11 -5 -20 0 -21 C5 -20 11 -11 9 0 C5 3 -5 3 -9 0 Z", class: "seal-petal seal-petal-front" }]
  ]
};
var IENN_SEAL_ALIAS = { "nassella pulchra": "Stipa pulchra" };
function iennSeal(botanical) {
  var k = String(botanical || "").replace(/\s+/g, " ").trim().split(" ").slice(0, 2).join(" ").toLowerCase(); if (!k) return null;
  if (IENN_SEAL_ALIAS[k]) return IENN_SEALS[IENN_SEAL_ALIAS[k]] || null;
  for (var x in IENN_SEALS) if (x.toLowerCase() === k) return IENN_SEALS[x];
  return null;
}
/* Build the seal element. kind "photo" = round 100-unit SVG rosette with curved text; "body" = small rosette mark + one line of text. */
var iennSealN = 0;
function iennSealEl(seal, kind) {
  var NS = "http://www.w3.org/2000/svg", n = ++iennSealN;
  function s(tag, at) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); return e; }
  function rosette(withText) {
    var svg = s("svg", { viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false", class: "seal-svg" }), pts = [], i, a, r;
    for (i = 0; i < 48; i++) { a = Math.PI * 2 * i / 48; r = i % 2 ? 46 : 49.5; pts.push((50 + r * Math.cos(a)).toFixed(2) + "," + (50 + r * Math.sin(a)).toFixed(2)); }
    svg.appendChild(s("polygon", { points: pts.join(" "), class: "seal-edge" }));               // scalloped rosette edge (lilac)
    svg.appendChild(s("circle", { cx: 50, cy: 50, r: 43, class: "seal-ring" }));               // cream disc, sage ring
    svg.appendChild(s("circle", { cx: 50, cy: 50, r: withText ? 27 : 36, class: "seal-inner" }));
    var g = s("g", { class: "seal-mark seal-mark-" + (IENN_SEAL_MARKS[seal.mark] ? seal.mark : "grass"), transform: withText ? "translate(50 51) scale(.62)" : "translate(50 52) scale(.95)" });
    (IENN_SEAL_MARKS[seal.mark] || IENN_SEAL_MARKS.grass).forEach(function (d) { g.appendChild(s(d[0], d[1])); });   // center art, drawn in about -32..32 units
    svg.appendChild(g);
    if (withText) {
      var defs = s("defs", {});
      defs.appendChild(s("path", { id: "seal-top-" + n, d: "M 16 50 A 34 34 0 0 1 84 50" }));
      defs.appendChild(s("path", { id: "seal-bot-" + n, d: "M 13 50 A 37 37 0 0 0 87 50" }));
      svg.insertBefore(defs, svg.firstChild);
      [["seal-top-", seal.arc[0]], ["seal-bot-", seal.arc[1]]].forEach(function (t) {
        var tx = s("text", { class: "seal-text" }), tp = s("textPath", { href: "#" + t[0] + n, startOffset: "50%", "text-anchor": "middle" });
        tp.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + t[0] + n); tp.textContent = t[1]; tx.appendChild(tp); svg.appendChild(tx); });
    }
    return svg;
  }
  var wrap = document.createElement(kind === "photo" ? "div" : "p");
  wrap.className = "seal seal-" + kind; wrap.setAttribute("role", "img"); wrap.setAttribute("aria-label", seal.label); wrap.title = seal.label;
  if (kind === "photo") wrap.appendChild(rosette(true));
  else { wrap.appendChild(rosette(false)); var t = document.createElement("span"); t.className = "seal-label"; t.setAttribute("aria-hidden", "true"); t.textContent = seal.label; wrap.appendChild(t); }
  return wrap;
}
if (typeof module !== "undefined") module.exports = { IENN_SEALS: IENN_SEALS, iennSeal: iennSeal };
