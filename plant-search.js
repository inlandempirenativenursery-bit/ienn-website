/* Plant search (Eric 2026-10-25): a small plain-magnifier circle opens a search bar that slides down from the top.
   SEARCH_PLACEMENT in shop-settings.js (preview: ?searchplace=corner):
   - "header" (default): top-right on the title row, sized to fit beside the title, pinned while scrolling, visible on the whole page.
   - "corner": floating bottom-right, only while the plant grid is on screen, kept above the tray bar.
   Filter logic (common / botanical name): window.iennSearch in shop.js. */
(function () {
  var list = document.getElementById("plant-list"); if (!list || typeof window.iennSearch !== "function") return;
  var sp = null; try { sp = new URLSearchParams(location.search).get("searchplace"); } catch (e) {}
  var place = sp === "corner" || sp === "header" ? sp : (typeof SEARCH_PLACEMENT === "string" && SEARCH_PLACEMENT === "corner" ? "corner" : "header");
  var GLYPH = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.4 15.4L20.5 20.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

  var btn = document.createElement("button"); btn.type = "button"; btn.className = "ps-btn ps-btn-" + place + (place === "corner" ? " ps-off" : "");
  btn.setAttribute("aria-label", "Search plants"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-controls", "ps-bar");
  btn.innerHTML = '<span class="ps-dot">' + GLYPH + "</span>";
  var bar = document.createElement("div"); bar.className = "ps-bar"; bar.id = "ps-bar"; bar.setAttribute("role", "search"); bar.setAttribute("aria-hidden", "true");
  bar.innerHTML = '<div class="ps-bar-in">' + GLYPH +
    '<label class="sr-only" for="ps-input">Search plants by common or botanical name</label>' +
    '<input id="ps-input" class="ps-input" type="search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ps-list" placeholder="Search plants\u2026" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" tabindex="-1">' +
    '<button type="button" class="ps-clear" aria-label="Clear search" tabindex="-1" hidden><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8" fill="#b9b3c0"/><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></button>' +
    '<button type="button" class="ps-close" aria-label="Close search" tabindex="-1"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>' +
    '<ul id="ps-list" class="ps-list" role="listbox" aria-label="Plant suggestions" hidden></ul>' +
    '<span class="sr-only" aria-live="polite" id="ps-live"></span>';
  document.body.appendChild(bar); document.body.appendChild(btn);
  var sug = bar.querySelector(".ps-list"), opts = [], act = -1, MAXS = 6;
  var input = bar.querySelector(".ps-input"), clr = bar.querySelector(".ps-clear"), cls = bar.querySelector(".ps-close"), live = bar.querySelector("#ps-live"), open = false, inView = false, t = null;
  var header = document.querySelector("header"), sticky = !!header && getComputedStyle(header).position === "sticky";
  if (!sticky) { btn.style.zIndex = place === "header" ? "59" : ""; bar.style.zIndex = "59"; }   // order.html: stay under the checkout drawer (z 60/61)

  /* Header placement: the circle sits on the title row, right of the title (or left of the Instagram link on wide screens), never moving the title.
     Its size shrinks only as far as needed to keep a gap from the title on narrow phones (min 28px; the tap target stays 44px). */
  function fitHeader() { if (place !== "header" || !header) return;
    var bn = header.querySelector(".brand-name"), ig = header.querySelector(".ig-top"), vw = document.documentElement.clientWidth; if (!bn) return;
    var rg = document.createRange(); rg.selectNodeContents(bn); var tr = rg.getBoundingClientRect();
    var igv = ig && ig.offsetWidth > 0 ? ig.getBoundingClientRect() : null, edge = igv ? igv.left - 8 : vw - 4;
    var size = Math.max(28, Math.min(38, Math.floor(edge - tr.right - 6)));
    btn.style.setProperty("--ps-size", size + "px");
    btn.style.right = igv ? Math.round(vw - edge) + "px" : "";
    var cy = (tr.top + tr.bottom) / 2 + (sticky ? 0 : window.pageYOffset);   // sticky header: same spot while scrolling; static header: pinned at the title-row height
    btn.style.top = Math.round(cy - 22) + "px"; }

  /* Corner placement: show while the grid reaches the top 40% of the screen; hide after the last card passes; sit above the tray bar. */
  function hasPlants() { return !!list.querySelector(".card:not(.skel)") || !!list.querySelector(".search-empty"); }
  function sync() { if (place === "corner") btn.classList.toggle("ps-off", open || !(inView && hasPlants())); else btn.classList.toggle("ps-off", open); }
  function lift() { if (place !== "corner") return; var cb = document.getElementById("cartbar"), b = null;
    if (cb && !cb.hidden) { var r = cb.getBoundingClientRect(); if (r.height) b = Math.max(0, window.innerHeight - r.top) + 10; }
    btn.style.bottom = b == null ? "" : b + "px"; }
  if (place === "corner") {
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: "0px 0px -60% 0px" }).observe(list); else inView = true;
    var cbEl = document.getElementById("cartbar"); if (cbEl && "MutationObserver" in window) new MutationObserver(lift).observe(cbEl, { attributes: true, attributeFilter: ["hidden"] });
  }
  function layout() { fitHeader(); lift(); }
  window.addEventListener("resize", layout); if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout); window.addEventListener("load", layout);

  /* Keep results in view: grid start just under the search bar (and under the sticky header, if any). From the story section below the grid this jumps back up. */
  function toResults() { var off = bar.getBoundingClientRect().bottom; if (sticky) off = Math.max(off, header.getBoundingClientRect().bottom); off += 8;
    var top = list.getBoundingClientRect().top; if (Math.abs(top - off) > 4) window.scrollTo(0, window.pageYOffset + top - off); }
  function run() { var r = window.iennSearch(input.value); clr.hidden = !input.value; if (r.query) toResults();
    live.textContent = !r.query ? "" : r.matches ? r.matches + (r.matches === 1 ? " plant matches" : " plants match") : "No plants match"; }
  /* Autocomplete (Eric: "auto populate words so it's easy"): up to 6 plants from the current list, as you type from 1 letter.
     Rank: common name starts with it, then a word in the common name starts with it, then the botanical name / a botanical word, then any other match.
     Same normalization as the filter (case, accents, punctuation ignored). Suggestions match the shown common and botanical names only. */
  function nmap(s) { s = String(s || ""); var out = "", map = [], sp = true;
    for (var i = 0; i < s.length; i++) { var d = s[i]; if (d.normalize) d = d.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); d = d.toLowerCase();
      if (/['\u2018\u2019`]/.test(d)) continue;
      if (/^[a-z0-9]+$/.test(d)) { for (var k = 0; k < d.length; k++) { out += d[k]; map.push(i); } sp = false; } else if (!sp && d) { out += " "; map.push(i); sp = true; } }
    if (out.slice(-1) === " ") { out = out.slice(0, -1); map.pop(); } return { s: s, n: out, map: map }; }
  function ws(n, q) { return n.indexOf(q) === 0 || n.indexOf(" " + q) >= 0; }
  function mark(m, toks) { var on = []; toks.forEach(function (w) { var i = m.n.indexOf(w) === 0 ? 0 : m.n.indexOf(" " + w) >= 0 ? m.n.indexOf(" " + w) + 1 : m.n.indexOf(w);
      if (i >= 0) for (var k = m.map[i]; k <= m.map[i + w.length - 1]; k++) on[k] = true; });
    var f = document.createDocumentFragment(), buf = "", b = false;
    function flush() { if (!buf) return; f.appendChild(b ? Object.assign(document.createElement("b"), { textContent: buf }) : document.createTextNode(buf)); buf = ""; }
    for (var i = 0; i < m.s.length; i++) { if (!!on[i] !== b) { flush(); b = !!on[i]; } buf += m.s[i]; } flush(); return f; }
  function suggest() { var q = window.iennSearchNorm ? window.iennSearchNorm(input.value) : "", all = window.iennSearchPlants ? window.iennSearchPlants() : [];
    if (!q || !all.length) { closeList(); return; }
    var toks = q.split(" ");
    opts = all.map(function (p, i) { var nm = nmap(p.name), bt = nmap(p.botanical), hay = " " + nm.n + " " + bt.n + " ", r;   // shown names only (e.g. "Datura", not the sheet's "Sacred datura")
        if (nm.n.indexOf(q) === 0) r = 0; else if (ws(nm.n, q)) r = 1; else if (bt.n.indexOf(q) === 0) r = 2; else if (ws(bt.n, q)) r = 3;
        else if (toks.every(function (w) { return hay.indexOf(w) >= 0; })) r = 4; else return null;
        return { p: p, r: r, i: i, nm: nm, bt: bt }; }).filter(Boolean).sort(function (a, b) { return a.r - b.r || a.i - b.i; }).slice(0, MAXS);
    sug.innerHTML = ""; act = -1;
    if (!opts.length) { closeList(); return; }
    opts.forEach(function (o, k) { var li = document.createElement("li"); li.className = "ps-opt"; li.id = "ps-opt-" + k; li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
      if (o.p.thumb) { var im = document.createElement("img"); im.className = "ps-thumb"; im.src = o.p.thumb; im.alt = ""; im.width = 32; im.height = 32; im.decoding = "async"; li.appendChild(im); }
      else { var ph = document.createElement("span"); ph.className = "ps-thumb ps-thumb-none"; ph.setAttribute("aria-hidden", "true"); li.appendChild(ph); }
      var tx = document.createElement("span"); tx.className = "ps-o-text";
      var nmE = document.createElement("span"); nmE.className = "ps-o-name"; nmE.appendChild(mark(o.nm, toks)); tx.appendChild(nmE);
      if (o.p.botanical) { var bE = document.createElement("span"); bE.className = "ps-o-bot"; bE.appendChild(mark(o.bt, toks)); tx.appendChild(bE); }
      li.appendChild(tx);
      li.addEventListener("mousedown", function (e) { e.preventDefault(); });   // desktop: keep focus in the field until the click lands
      li.addEventListener("click", function () { choose(k); });
      sug.appendChild(li); });
    sug.hidden = false; input.setAttribute("aria-expanded", "true"); input.removeAttribute("aria-activedescendant"); fitList(); }
  function fitList() { if (sug.hidden) return; var vv = window.visualViewport, bottom = vv ? vv.height + vv.offsetTop : window.innerHeight;   // stay above the on-screen keyboard
    var top = bar.querySelector(".ps-bar-in").getBoundingClientRect().bottom; sug.style.maxHeight = Math.max(96, Math.min(6 * 50 + 8, bottom - top - 16)) + "px"; }
  function closeList() { sug.hidden = true; sug.innerHTML = ""; opts = []; act = -1; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
  function setAct(k) { var li = sug.children; if (!li.length) return; if (act >= 0 && li[act]) { li[act].classList.remove("active"); li[act].setAttribute("aria-selected", "false"); }
    act = (k + li.length) % li.length; li[act].classList.add("active"); li[act].setAttribute("aria-selected", "true"); input.setAttribute("aria-activedescendant", li[act].id);
    if (li[act].scrollIntoView) li[act].scrollIntoView({ block: "nearest" }); }
  function choose(k) { var o = opts[k]; if (!o) return; var p = o.p; input.value = p.name; closeList(); clearTimeout(t);
    var r = window.iennSearch(p.name); clr.hidden = false; live.textContent = p.name + ", " + (r.matches === 1 ? "1 plant shown" : r.matches + " plants shown"); input.blur();
    var card = null; Array.prototype.some.call(list.querySelectorAll(".card"), function (c) { if (c.dataset.id === p.id) { card = c; return true; } return false; });
    if (!card) { toResults(); return; }
    var off = bar.getBoundingClientRect().bottom; if (sticky) off = Math.max(off, header.getBoundingClientRect().bottom); off += 10;
    window.scrollTo(0, window.pageYOffset + card.getBoundingClientRect().top - off);
    card.classList.remove("ps-hit"); void card.offsetWidth; card.classList.add("ps-hit"); setTimeout(function () { card.classList.remove("ps-hit"); }, 1300); }
  if (window.visualViewport) visualViewport.addEventListener("resize", fitList);
  document.addEventListener("pointerdown", function (e) { if (!sug.hidden && !bar.contains(e.target)) closeList(); }, true);

  function setOpen(on) { if (on === open) return; open = on; bar.classList.toggle("open", on); bar.setAttribute("aria-hidden", on ? "false" : "true");
    [input, clr, cls].forEach(function (x) { x.tabIndex = on ? 0 : -1; }); btn.setAttribute("aria-expanded", on ? "true" : "false"); sync();
    if (on) input.focus({ preventScroll: true });
    else { closeList(); input.value = ""; clearTimeout(t); window.iennSearch(""); clr.hidden = true; live.textContent = ""; input.blur(); btn.focus({ preventScroll: true }); } }
  btn.addEventListener("click", function () { setOpen(true); });
  cls.addEventListener("click", function () { setOpen(false); });
  clr.addEventListener("click", function () { closeList(); input.value = ""; run(); input.focus({ preventScroll: true }); });
  input.addEventListener("input", function () { suggest(); clearTimeout(t); t = setTimeout(run, 120); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (sug.hidden) suggest(); if (!sug.hidden) setAct(act < 0 ? (e.key === "ArrowDown" ? 0 : -1) : act + (e.key === "ArrowDown" ? 1 : -1)); return; }
    if (e.key === "Escape" && !sug.hidden) { e.preventDefault(); e.stopPropagation(); closeList(); return; }   // first Esc closes the list, the next one the bar
    if (e.key === "Enter") { e.preventDefault(); if (!sug.hidden && act >= 0) { choose(act); return; } closeList(); clearTimeout(t); run(); input.blur(); } });
  document.addEventListener("keydown", function (e) { if (open && e.key === "Escape") { e.preventDefault(); setOpen(false); } });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".search-empty-clear")) { closeList(); input.value = ""; run(); if (open) input.focus({ preventScroll: true }); } });
  document.addEventListener("ienn-grid-rendered", sync);
  layout(); sync();
})();
