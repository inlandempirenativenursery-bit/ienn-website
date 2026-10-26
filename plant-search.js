/* Floating plant search (Eric 2026-10-25): a small round plant-themed button, bottom-right, shown only while the plant grid is on screen.
   Tap -> a compact search pill; live filtering by common or botanical name (filter logic: window.iennSearch in shop.js).
   Icon: SEARCH_ICON in shop-settings.js ("sprout" | "leaf" | "sage"); preview any with ?searchicon=leaf. */
(function () {
  var list = document.getElementById("plant-list"); if (!list || typeof window.iennSearch !== "function") return;
  var ICONS = {
    /* seedling inside a magnifier: keeps the classic search silhouette, plant inside */
    sprout: '<circle cx="10" cy="10" r="7" fill="#fbfaf7" stroke="#3f4f3f" stroke-width="2.2"/><path d="M15.2 15.2L21 21" stroke="#3f4f3f" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M10 14.6V9.6" stroke="#3d6b45" stroke-width="1.6" stroke-linecap="round"/><path fill="#4d8a57" d="M10 10.8C7.6 11 6 9.5 6 7.3c2.4-.1 3.9 1.3 4 3.5z"/><path fill="#6aa86f" d="M10 9.7c.1-2.3 1.7-3.8 4-3.7 0 2.2-1.6 3.7-4 3.7z"/>',
    /* leaf with a small lens over its tip */
    leaf: '<path fill="#5a9460" d="M2.8 14.2C2.4 7.4 6.8 2.6 15.6 2.6c.4 7.8-4.4 12.2-12.8 11.6z"/><path d="M3.6 13.4L12.4 5.4" stroke="#e8f0e2" stroke-width="1.2" stroke-linecap="round"/>' +
      '<circle cx="15.4" cy="15.4" r="4.6" fill="#fbfaf7" fill-opacity=".85" stroke="#3f4f3f" stroke-width="2"/><path d="M18.8 18.8L22 22" stroke="#3f4f3f" stroke-width="2.8" stroke-linecap="round"/>',
    /* sage sprig (paired gray-green leaves) with a lens */
    sage: '<path d="M7.2 21.5C7.4 15.5 8 9.5 9.6 3" stroke="#4d7c55" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<g fill="#7fa07c"><ellipse cx="5.1" cy="16.2" rx="1.6" ry="3" transform="rotate(-38 5.1 16.2)"/><ellipse cx="10.2" cy="14.4" rx="1.6" ry="3" transform="rotate(38 10.2 14.4)"/>' +
      '<ellipse cx="5.9" cy="10.4" rx="1.4" ry="2.7" transform="rotate(-36 5.9 10.4)"/><ellipse cx="11" cy="8.6" rx="1.4" ry="2.7" transform="rotate(38 11 8.6)"/>' +
      '<ellipse cx="7.6" cy="4.9" rx="1.2" ry="2.2" transform="rotate(-30 7.6 4.9)"/><ellipse cx="11.4" cy="3.8" rx="1.1" ry="2" transform="rotate(40 11.4 3.8)"/></g>' +
      '<circle cx="16.2" cy="15.6" r="4.3" fill="#fbfaf7" fill-opacity=".85" stroke="#3f4f3f" stroke-width="2"/><path d="M19.4 18.8L22.4 21.8" stroke="#3f4f3f" stroke-width="2.8" stroke-linecap="round"/>'
  };
  var q = null; try { q = new URLSearchParams(location.search).get("searchicon"); } catch (e) {}
  var which = ICONS[q] ? q : (typeof SEARCH_ICON === "string" && ICONS[SEARCH_ICON] ? SEARCH_ICON : "sprout");
  function svg(name, size) { return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true" focusable="false">' + ICONS[name] + "</svg>"; }

  var wrap = document.createElement("div"); wrap.className = "psearch"; wrap.setAttribute("role", "search"); wrap.dataset.icon = which;
  wrap.innerHTML =
    '<button type="button" class="ps-fab" aria-label="Search plants" aria-expanded="false" aria-controls="ps-pill">' + svg(which, 30) + "</button>" +
    '<div class="ps-pill" id="ps-pill" hidden>' +
      '<span class="ps-ic">' + svg(which, 24) + "</span>" +
      '<label class="sr-only" for="ps-input">Search plants by common or botanical name</label>' +
      '<input id="ps-input" class="ps-input" type="search" placeholder="Search plants\u2026" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">' +
      '<button type="button" class="ps-clear" aria-label="Clear search" hidden><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8" fill="#b9b3c0"/><path d="M7 7l6 6M13 7l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<button type="button" class="ps-close" aria-label="Close search"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>' +
    "</div>" +
    '<span class="sr-only" aria-live="polite" id="ps-live"></span>';
  document.body.appendChild(wrap);
  var fab = wrap.querySelector(".ps-fab"), pill = wrap.querySelector(".ps-pill"), input = wrap.querySelector(".ps-input"),
      clr = wrap.querySelector(".ps-clear"), live = wrap.querySelector("#ps-live"), open = false, inView = false, t = null;

  function hasPlants() { return !!list.querySelector(".card:not(.skel)") || !!list.querySelector(".search-empty"); }
  function sync() { wrap.classList.toggle("on", open || (inView && hasPlants())); }
  /* Show once the grid reaches the top 40% of the screen (so not while the hero is still in view) and hide after the last plant card scrolls up past that line. */
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: "0px 0px -60% 0px" }).observe(list);
  else { inView = true; }

  /* Sit above the tray bar when it shows, and above the on-screen keyboard while typing. */
  function place() { var cb = document.getElementById("cartbar"), b = null, vv = window.visualViewport;
    if (cb && !cb.hidden) { var r = cb.getBoundingClientRect(); if (r.height) b = Math.max(0, window.innerHeight - r.top) + 12; }
    if (open && vv) { var kb = window.innerHeight - (vv.height + vv.offsetTop); if (kb > 60) b = kb + 10; }
    wrap.style.bottom = b == null ? "" : b + "px"; }
  var cbEl = document.getElementById("cartbar");
  if (cbEl && "MutationObserver" in window) new MutationObserver(place).observe(cbEl, { attributes: true, attributeFilter: ["hidden"] });
  window.addEventListener("resize", place); if (window.visualViewport) { visualViewport.addEventListener("resize", place); visualViewport.addEventListener("scroll", place); }

  function headerH() { var h = document.querySelector("header"); return h && getComputedStyle(h).position === "sticky" ? h.getBoundingClientRect().height : 0; }
  function toTop() { var top = list.getBoundingClientRect().top, off = headerH() + 12;   // keep results in view: grid start just under the sticky header
    if (top < off - 4) window.scrollTo({ top: window.pageYOffset + top - off, behavior: "auto" }); }
  function run() { var r = window.iennSearch(input.value); clr.hidden = !input.value; toTop();
    live.textContent = !r.query ? "" : r.matches ? r.matches + (r.matches === 1 ? " plant matches" : " plants match") : "No plants match"; }
  function setOpen(on) { open = on; wrap.classList.toggle("open", on); fab.setAttribute("aria-expanded", on ? "true" : "false"); pill.hidden = !on; fab.hidden = on; place(); sync();
    if (on) { input.focus({ preventScroll: true }); }
    else { input.value = ""; clearTimeout(t); window.iennSearch(""); clr.hidden = true; live.textContent = ""; fab.focus({ preventScroll: true }); } }
  fab.addEventListener("click", function () { setOpen(true); });
  wrap.querySelector(".ps-close").addEventListener("click", function () { setOpen(false); });
  clr.addEventListener("click", function () { input.value = ""; run(); input.focus({ preventScroll: true }); });
  input.addEventListener("input", function () { clearTimeout(t); t = setTimeout(run, 120); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); clearTimeout(t); run(); input.blur(); } });
  wrap.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.preventDefault(); setOpen(false); } });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".search-empty-clear")) { input.value = ""; run(); if (open) input.focus({ preventScroll: true }); } });
  document.addEventListener("ienn-grid-rendered", sync);
  place(); sync();
})();
