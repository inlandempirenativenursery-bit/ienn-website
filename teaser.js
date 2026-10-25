/* "Starter packs coming soon" teaser (index.html only): a big juicy 3-D button centered in the viewport.
   Shows after STARTER_TEASER_DELAY_MS (shop-settings.js), once per visitor; color from STARTER_TEASER_COLOR ("honey" | "lilac" | "sage" | "red").
   Waits while the checkout drawer, promo or a dialog is open. Press anywhere on it: it sinks (~120ms), then shrinks/fades away. Escape also dismisses.
   Heading font from STARTER_TEASER_FONT (only that one Google Font loads). Preview: ?teaser=now (ignores the seen flag), optional &teasercolor=lilac &teaserfont=fredoka &teasershape=leaf (STARTER_TEASER_SHAPE; flowers: calochortus, calochortus-glass, calochortus-side, salvia, trichostema). No email capture, prices or pack names. */
(function () {
  var KEY = "ienn-starter-teaser-seen", q = location.search, now = /[?&]teaser=now\b/.test(q);
  var COLORS = ["honey", "lilac", "sage", "red"], m = /[?&]teasercolor=([a-z]+)/.exec(q);
  var color = (m && COLORS.indexOf(m[1]) >= 0) ? m[1] : (typeof STARTER_TEASER_COLOR === "string" && COLORS.indexOf(STARTER_TEASER_COLOR) >= 0 ? STARTER_TEASER_COLOR : "honey");
  /* Heading font options (Google Fonts, one weight each, display=swap). Only the active one is loaded. size = title font-size that fits one line at 390px. */
  var FONTS = {
    dancing:   { family: '"Dancing Script", cursive', css: null, weight: 700, size: "1.75rem" },   // already loaded by the page
    fredoka:   { family: '"Fredoka", system-ui, sans-serif', css: "Fredoka:wght@700", weight: 700, size: "1.45rem" },
    baloo:     { family: '"Baloo 2", system-ui, sans-serif', css: "Baloo+2:wght@800", weight: 800, size: "1.45rem" },
    lilita:    { family: '"Lilita One", system-ui, sans-serif', css: "Lilita+One", weight: 400, size: "1.5rem" },
    rubik:     { family: '"Rubik", system-ui, sans-serif', css: "Rubik:wght@800", weight: 800, size: "1.3rem" },
    bricolage: { family: '"Bricolage Grotesque", system-ui, sans-serif', css: "Bricolage+Grotesque:wght@800", weight: 800, size: "1.35rem" }
  };
  var fm = /[?&]teaserfont=([a-z]+)/.exec(q), fontKey = (fm && FONTS[fm[1]]) ? fm[1] : (typeof STARTER_TEASER_FONT === "string" && FONTS[STARTER_TEASER_FONT] ? STARTER_TEASER_FONT : "dancing"), FONT = FONTS[fontKey];
  function loadFont(cb) {   // inject only the chosen font; wait briefly for it so the heading doesn't swap mid-entry
    if (FONT.css && !document.getElementById("st-font")) { var l = document.createElement("link"); l.id = "st-font"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=" + FONT.css + "&display=swap"; document.head.appendChild(l); }
    var done = false; function go() { if (!done) { done = true; cb(); } } setTimeout(go, 1500);
    try { var fam = FONT.family.split(",")[0]; (function poll(n) { if (document.fonts && document.fonts.check(FONT.weight + " 20px " + fam)) return go(); if (n > 0) setTimeout(function () { poll(n - 1); }, 100); })(14); } catch (e) { go(); }
  }
  /* Flower outlines (simplified from the Jepson eFlora genus descriptions; see docs/teaser-flowers.md). Drawn as SVG:
     an edge copy offset 6px below (the thick 3-D edge), the face (lilac gradient), a clipped gloss band, then the text box on top.
     parts: [kind, geometry]; text: [x, y, w, h] box in viewBox units; w: rendered width in px. */
  var FLOWERS = {"calochortus":{"parts":[["sepal","M 273.0,184.4 C 310.2,132.9 361.8,126.2 394.5,135.0 C 385.8,167.8 354.2,209.1 291.0,215.6 Z"],["sepal","M 248.0,290.0 C 274.0,348.0 254.0,396.0 230.0,420.0 C 206.0,396.0 186.0,348.0 212.0,290.0 Z"],["sepal","M 169.0,215.6 C 105.8,209.1 74.2,167.8 65.5,135.0 C 98.2,126.2 149.8,132.9 187.0,184.4 Z"],["petal","M 196.0,160.0 C 146.0,120.0 112.0,70.0 138.0,36.0 C 170.0,2.0 290.0,2.0 322.0,36.0 C 348.0,70.0 314.0,120.0 264.0,160.0 Z"],["petal","M 307.6,235.6 C 367.3,212.3 427.6,207.8 444.0,247.3 C 457.5,292.0 397.5,396.0 352.0,406.7 C 309.6,412.2 283.3,357.7 273.6,294.4 Z"],["petal","M 186.4,294.4 C 176.7,357.7 150.4,412.2 108.0,406.7 C 62.5,396.0 2.5,292.0 16.0,247.3 C 32.4,207.8 92.7,212.3 152.4,235.6 Z"],["circle","230,230,110"],["mark","M 210.0,108.0 Q 230.0,120.0 250.0,108.0 Q 230.0,90.0 210.0,108.0 Z"],["mark","M 345.7,273.7 Q 325.3,285.0 325.7,308.3 Q 351.2,300.0 345.7,273.7 Z"],["mark","M 134.3,308.3 Q 134.7,285.0 114.3,273.7 Q 108.8,300.0 134.3,308.3 Z"]],"text":[138,168,184,124],"vb":[-6,-6,471,440],"w":340},"salvia":{"parts":[["calyx","M 12,176 C 22,152 56,146 82,150 L 86,190 C 58,198 26,196 12,176 Z"],["petal","M 74,150 C 104,140 128,128 146,116 L 168,172 C 136,186 104,192 76,192 Z"],["petal","M 128,128 C 138,70 190,30 246,38 C 288,44 304,78 296,106 C 272,98 246,98 222,106 C 192,118 168,130 152,142 Z"],["ellipse","140,170,40,30,-20"],["ellipse","326,156,34,28,25"],["ellipse","222,212,112,80,0"],["stamen","M 160,146 Q 200,116 250,104"],["stamen","M 164,152 Q 206,124 258,114"]],"text":[132,166,180,100],"vb":[4,22,364,316],"w":340},"trichostema":{"parts":[["ellipse","112,140,30,20,-30"],["ellipse","150,120,30,20,-12"],["ellipse","212,120,30,20,12"],["ellipse","250,140,30,20,30"],["petal","M 140,150 C 150,128 212,128 222,150 Z"],["ellipse","181,222,124,76,0"],["stamen","M 169,140 C 165,56 96,14 48,30 C 32,42 28,70 46,84"],["anther","46,84,6"],["stamen","M 177,140 C 173,53 112,12 64,32 C 40,44 36,71 54,84"],["anther","54,84,6"],["stamen","M 185,140 C 181,50 128,10 80,34 C 48,46 44,72 62,84"],["anther","62,84,6"],["stamen","M 193,140 C 189,47 144,8 96,36 C 56,48 52,73 70,84"],["anther","70,84,6"]],"text":[101,180,160,90],"vb":[20,0,293,360],"w":300},"calochortus-side":{"parts":[["calyx","M 174,300 C 176,330 176,356 172,384 L 188,384 C 184,356 184,330 186,300 Z"],["sepal","M 174,296 C 124,280 76,252 36,206 C 90,222 136,246 184,282 Z"],["sepal","M 186,296 C 236,280 284,252 324,206 C 270,222 224,246 176,282 Z"],["petal","M 170,300 C 122,256 74,176 54,100 C 50,84 38,74 22,70 C 62,50 112,54 142,68 C 162,134 174,214 188,294 Z"],["petal","M 190,300 C 238,256 286,176 306,100 C 310,84 322,74 338,70 C 298,50 248,54 218,68 C 198,134 186,214 172,294 Z"],["petal","M 152,304 C 112,244 86,164 82,86 C 80,66 68,56 56,50 C 110,30 250,30 304,50 C 292,56 280,66 278,86 C 274,164 248,244 208,304 Z"],["plate","96,78,168,128,24"],["mark","M 166,262 Q 180,272 194,262 Q 180,248 166,262 Z"]],"text":[96,78,168,128],"vb":[14,22,332,376],"w":300,"glass":true}};
  FLOWERS["calochortus-glass"] = { parts: FLOWERS.calochortus.parts, text: FLOWERS.calochortus.text, vb: FLOWERS.calochortus.vb, w: FLOWERS.calochortus.w, glass: true };   // same face-on lily, translucent
  var SHAPES = ["pill", "card", "leaf", "badge", "packet", "tag", "calochortus", "calochortus-glass", "calochortus-side", "salvia", "trichostema", "aster"], sm = /[?&]teasershape=([a-z-]+)/.exec(q);
  var shape = (sm && SHAPES.indexOf(sm[1]) >= 0) ? sm[1] : (typeof STARTER_TEASER_SHAPE === "string" && SHAPES.indexOf(STARTER_TEASER_SHAPE) >= 0 ? STARTER_TEASER_SHAPE : "pill");
  /* Aster (Eric's pick): bold flat face-on flower: 8 broad overlapping petals with softly scalloped tips, thin darker radiating
     lines from the disk onto the petals, and a big honey disk with a slightly bumpy edge that holds the text. Built here, not stored. */
  FLOWERS.aster = (function () {
    var R = 205, HW = 29 * Math.PI / 180, parts = [], i, k;
    function f1(v) { return v.toFixed(1); }
    function poly(pts) { return "M " + pts.map(function (q) { return f1(q[0]) + "," + f1(q[1]); }).join(" L ") + " Z"; }
    for (k = 0; k < 8; k++) {
      var c = k * Math.PI / 4 + Math.PI / 8, pts = [[0, 0]];
      for (i = 0; i <= 96; i++) {
        var u = -1 + 2 * i / 96, r = R * Math.pow(1 - Math.pow(Math.abs(u), 3.2), 0.42), v = u / 0.66;
        if (Math.abs(v) < 1) r -= 14 * (1 - Math.pow(Math.abs(Math.sin(Math.PI * 2 * (v + 1))), 0.45)) * (1 - Math.pow(Math.abs(v), 6));   // 4 scallops across the tip
        var a = c + u * HW; pts.push([r * Math.sin(a), -r * Math.cos(a)]);
      }
      parts.push(["petal", poly(pts)]);
    }
    for (k = 0; k < 24; k++) {   // radiating lines: thin tapered slivers
      var b = k * Math.PI / 12 + 0.07 * Math.sin(k * 1.7), r0 = 104, r1 = 148 + 14 * Math.sin(k * 2.3), dx = Math.cos(b), dy = Math.sin(b), w = 2.6;
      parts.push(["mark", poly([[r0 * dx - w * dy, r0 * dy + w * dx], [r1 * dx, r1 * dy], [r0 * dx + w * dy, r0 * dy - w * dx]])]);
    }
    var dp = [];
    for (i = 0; i < 120; i++) { var t = 2 * Math.PI * i / 120, rr = 112 + 3.2 * Math.sin(26 * t) + 1.6 * Math.sin(7 * t + 1) + 1.2 * Math.sin(11 * t + 2.2); dp.push([rr * Math.cos(t), rr * Math.sin(t)]); }
    parts.push(["disk", poly(dp)]);
    return { parts: parts, text: [-94, -82, 188, 164], vb: [-213, -213, 426, 434], w: 340 };
  })();
  function flowerSVG(f) {
    var NS = 'xmlns="http://www.w3.org/2000/svg"', vb = f.vb, out = [], clip = [], sil = [];
    function el(kind, g, cls) {
      if (kind === "circle" || kind === "anther") { var c = g.split(","); return '<circle class="' + cls + '" cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; }
      if (kind === "plate") { var r = g.split(","); return '<rect class="' + cls + '" x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" rx="' + r[4] + '"/>'; }
      if (kind === "ellipse") { var e = g.split(","); return '<ellipse class="' + cls + '" cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '" transform="rotate(' + e[4] + " " + e[0] + " " + e[1] + ')"/>'; }
      return '<path class="' + cls + '" d="' + g + '"/>';
    }
    var edge = [], face = [];
    f.parts.forEach(function (p) {
      var k = p[0], fill = k === "stamen" ? "fl-stamen" : k === "calyx" ? "fl-calyx" : k === "sepal" ? "fl-sepal" : k === "circle" || k === "plate" ? "fl-center" : k === "disk" ? "fl-disk" : k === "mark" ? "fl-mark" : k === "anther" ? "fl-anther" : "fl-petal";
      if (k !== "mark") edge.push(el(k, p[1], k === "stamen" ? "fl-edge-s" : "fl-edge"));
      face.push(el(k, p[1], fill));
      if (k === "petal" || k === "ellipse" || k === "circle" || k === "sepal" || k === "disk") clip.push(el(k, p[1], ""));
      if (k !== "mark" && k !== "stamen" && k !== "anther") sil.push(el(k, p[1], "").replace('class=""', 'fill="#000"'));
    });
    var gy = vb[1], gh = vb[3] * 0.42;
    f.mask = "url(\"data:image/svg+xml," + encodeURIComponent('<svg ' + NS + ' viewBox="' + vb.join(" ") + '">' + sil.join("") + '</svg>') + "\")";   // flower silhouette, for the frosted blur layer
    return '<svg class="st-flower" ' + NS + ' viewBox="' + vb.join(" ") + '" width="' + f.w + '" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="stf-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--st-top)"/><stop offset=".55" style="stop-color:var(--st-mid)"/><stop offset="1" style="stop-color:var(--st-bot)"/></linearGradient>' +
      '<linearGradient id="stf-gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="stf-c">' + clip.join("") + '</clipPath></defs>' +
      '<g class="st-edge">' + edge.join("") + '</g><g class="st-face">' + face.join("") +
      '<rect x="' + vb[0] + '" y="' + gy + '" width="' + vb[2] + '" height="' + gh + '" fill="url(#stf-g)" style="fill:url(#stf-gl)" clip-path="url(#stf-c)" pointer-events="none"/></g></svg>';
  }
  function seen() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function mark() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  if (!now && seen()) return;
  var delay = now ? 0 : (typeof STARTER_TEASER_DELAY_MS === "number" ? STARTER_TEASER_DELAY_MS : 60000);
  function busy() { return document.body.classList.contains("drawer-open") || document.querySelector(".ienn-promo, .confirm-modal:not([hidden]), #checkout:not([hidden])"); }
  function show() {
    if (busy()) { setTimeout(show, 1000); return; }   // wait until the drawer / pop-up is closed
    var b = document.createElement("button"); b.type = "button"; b.className = "starter-teaser st-" + color + " st-font-" + fontKey + " st-shape-" + shape;
    b.setAttribute("aria-label", "Starter packs coming soon. Plants grouped to grow well together and fill in fast. Tap to dismiss");
    b.innerHTML = '<span class="st-hole" aria-hidden="true"></span><span class="st-title" aria-hidden="true">Starter packs coming soon</span><span class="st-sub" aria-hidden="true">Plants grouped to grow well together and fill in fast.</span>';
    var fl = FLOWERS[shape];
    if (fl) {   // flower outline: SVG silhouette is the hit area; text box placed over the flower's broad part
      b.classList.add("st-flowerish"); b.insertAdjacentHTML("afterbegin", flowerSVG(fl));
      if (fl.glass) {   // translucent "glass" lily: blur what's behind, clipped to the flower silhouette (where backdrop-filter is supported)
        b.classList.add("st-glass"); var bl = document.createElement("span"); bl.className = "st-blur"; bl.setAttribute("aria-hidden", "true");
        bl.style.webkitMaskImage = bl.style.maskImage = fl.mask; b.insertBefore(bl, b.firstChild); }
      var s = fl.w / fl.vb[2], tb = fl.text, box = document.createElement("span"); box.className = "st-textbox";
      box.style.left = ((tb[0] - fl.vb[0]) * s) + "px"; box.style.top = ((tb[1] - fl.vb[1]) * s) + "px"; box.style.width = (tb[2] * s) + "px"; box.style.height = (tb[3] * s) + "px";
      box.appendChild(b.querySelector(".st-title")); box.appendChild(b.querySelector(".st-sub")); b.appendChild(box); b.style.width = fl.w + "px";
    }
    var t = b.querySelector(".st-title"); t.style.fontFamily = FONT.family; t.style.fontWeight = FONT.weight; t.style.fontSize = FONT.size;
    if (fontKey !== "dancing") { t.style.letterSpacing = "0.01em"; t.style.lineHeight = "1.15"; }
    document.body.appendChild(b); mark();
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add("in"); }); });
    var gone = false;
    function out() { b.classList.remove("in", "pressed"); b.classList.add("out"); setTimeout(function () { b.remove(); }, 320); }
    function dismiss(press) { if (gone) return; gone = true; mark(); document.removeEventListener("keydown", onKey);
      if (press) { b.classList.add("pressed"); setTimeout(out, 120); } else out(); }   // let the sink read, then shrink/fade
    function onKey(e) { if (e.key === "Escape" || e.key === "Esc") dismiss(false); }
    b.addEventListener("pointerdown", function () { if (!gone) b.classList.add("pressed"); });
    b.addEventListener("pointerleave", function () { if (!gone) b.classList.remove("pressed"); });
    b.addEventListener("pointercancel", function () { if (!gone) b.classList.remove("pressed"); });
    b.addEventListener("pointerup", function () { dismiss(true); });   // dismiss on release (mouse, pen, touch)
    // touch: cancel the follow-up synthetic click so the tap never "falls through" to the plant grid underneath once the teaser fades
    b.addEventListener("touchend", function (e) { if (e.cancelable) e.preventDefault(); dismiss(true); }, { passive: false });
    b.addEventListener("click", function () { dismiss(true); });   // keyboard Enter/Space (and any click that still arrives)
    document.addEventListener("keydown", onKey);
  }
  function start() { setTimeout(function () { loadFont(show); }, Math.max(0, delay - 1500)); }   // fetch the font just before showing
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
