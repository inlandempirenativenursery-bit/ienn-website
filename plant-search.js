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
    '<input id="ps-input" class="ps-input" type="search" placeholder="Search plants\u2026" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" tabindex="-1">' +
    '<button type="button" class="ps-clear" aria-label="Clear search" tabindex="-1" hidden><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8" fill="#b9b3c0"/><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></button>' +
    '<button type="button" class="ps-close" aria-label="Close search" tabindex="-1"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>' +
    '<span class="sr-only" aria-live="polite" id="ps-live"></span>';
  document.body.appendChild(bar); document.body.appendChild(btn);
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
  function setOpen(on) { if (on === open) return; open = on; bar.classList.toggle("open", on); bar.setAttribute("aria-hidden", on ? "false" : "true");
    [input, clr, cls].forEach(function (x) { x.tabIndex = on ? 0 : -1; }); btn.setAttribute("aria-expanded", on ? "true" : "false"); sync();
    if (on) input.focus({ preventScroll: true });
    else { input.value = ""; clearTimeout(t); window.iennSearch(""); clr.hidden = true; live.textContent = ""; input.blur(); btn.focus({ preventScroll: true }); } }
  btn.addEventListener("click", function () { setOpen(true); });
  cls.addEventListener("click", function () { setOpen(false); });
  clr.addEventListener("click", function () { input.value = ""; run(); input.focus({ preventScroll: true }); });
  input.addEventListener("input", function () { clearTimeout(t); t = setTimeout(run, 120); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); clearTimeout(t); run(); input.blur(); } });
  document.addEventListener("keydown", function (e) { if (open && e.key === "Escape") { e.preventDefault(); setOpen(false); } });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".search-empty-clear")) { input.value = ""; run(); if (open) input.focus({ preventScroll: true }); } });
  document.addEventListener("ienn-grid-rendered", sync);
  layout(); sync();
})();
