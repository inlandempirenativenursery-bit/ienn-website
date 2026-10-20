/* IENN promo banner (overlay only; the shop underneath is untouched).
   Feed: <Apps Script /exec>?view=promos  (apps-script/IENN_Promos.gs, "Promos" tab). See docs/PROMOS.md.
   Include: <link rel="stylesheet" href="promo.css"> + <script src="promo.js" defer data-page="order|home"></script>
   Test locally: add ?promo-test=1 to the page URL (sample Fall sale, no network). ?promo-test=reset clears dismissals. */
(function () {
  "use strict";
  var EXEC = "https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec";
  var me = document.currentScript, PAGE = (me && me.getAttribute("data-page")) || "all";
  var q = new URLSearchParams(location.search), TEST = q.get("promo-test");
  var SAMPLE = { title: "Fall sale", message: "Fall is the best time to plant natives. Stock up for the rainy season and pick up in Fontana on Saturday.", discount: "", start: "2026-11-01", end: "2026-11-30", pages: "all" };

  function today() {   // yyyy-MM-dd in Pacific time
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function fits(p, d) {
    if (!p || !p.title) return false;
    if (p.start && d < p.start) return false;
    if (p.end && d > p.end) return false;
    return !p.pages || p.pages === "all" || p.pages === PAGE;
  }
  function key(p) { return "ienn-promo:" + p.title + "|" + (p.start || ""); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }

  function show(p) {
    var lastFocus = null, k = key(p);
    var back = el("div", "promo-backdrop"); back.hidden = true;
    var box = el("div", "promo-modal");
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "promo-title"); box.setAttribute("aria-describedby", "promo-msg");
    var x = el("button", "promo-x", "\u00d7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    var h = el("h2", "promo-title", p.title); h.id = "promo-title";
    var m = el("p", "promo-msg", p.message || ""); m.id = "promo-msg";
    box.appendChild(x); box.appendChild(h); box.appendChild(m);
    if (p.discount) box.appendChild(el("p", "promo-discount", p.discount));
    if (p.end) box.appendChild(el("p", "promo-dates", "Through " + new Date(p.end + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })));
    var go = el("a", "promo-go", "Shop now");
    go.href = PAGE === "order" ? "#plant-list" : "order.html";
    box.appendChild(go); back.appendChild(box);
    var strip = el("button", "promo-strip", p.title); strip.type = "button"; strip.hidden = true;
    strip.setAttribute("aria-label", p.title + " \u2014 show details");
    document.body.appendChild(back); document.body.appendChild(strip);

    function focusables() { return [x, go]; }
    function open() {
      lastFocus = document.activeElement; back.hidden = false; strip.hidden = true;
      document.documentElement.classList.add("promo-open"); go.focus();
    }
    function close() {
      back.hidden = true; strip.hidden = false; store(k, "1");
      document.documentElement.classList.remove("promo-open");
      if (lastFocus && lastFocus.focus && lastFocus !== document.body) lastFocus.focus(); else strip.focus({ preventScroll: true });
    }
    x.addEventListener("click", close);
    go.addEventListener("click", function () { close(); });
    strip.addEventListener("click", open);
    back.addEventListener("click", function (e) { if (e.target === back) close(); });
    back.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    if (store(k) === "1") strip.hidden = false; else open();
  }

  function pick(list) { var d = today(); for (var i = 0; i < (list || []).length; i++) if (fits(list[i], d)) return list[i]; return null; }
  function start() {
    if (TEST === "reset") { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("ienn-promo:") === 0) localStorage.removeItem(k); }); } catch (e) {} }
    if (TEST === "1") { show(SAMPLE); return; }   // mock mode: sample Fall sale regardless of date
    if (!window.fetch) return;
    var url = (window.APPS_SCRIPT_URL || EXEC) + "?view=promos";
    fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { var p = j && j.ok !== false && pick(j.promos); if (p) show(p); })
      .catch(function () { /* no promo: fail silently */ });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
