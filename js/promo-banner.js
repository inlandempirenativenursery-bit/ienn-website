/* IENN promo banner. Standalone, no deps. Integration (one line):
 *   <script src="js/promo-banner.js" defer></script>
 * Endpoint: window.IENN_CONFIG.EXEC_URL (or .execUrl), or data-exec-url on this script tag.
 * Fetches <EXEC_URL>?api=promos; shows the first active promo not yet dismissed (per promo ID, localStorage).
 * Dev: add ?promo=preview to the page URL to show sample data (never remembered). Fails silently.
 * Restyle via CSS variables: --promo-bg, --promo-fg, --promo-accent, --promo-accent-fg, --promo-radius, --promo-font, --promo-backdrop. */
(function () {
  "use strict";
  var KEY = "ienn_promo_dismissed_";
  var script = document.currentScript;
  function execUrl() {
    var c = window.IENN_CONFIG || {};
    return c.EXEC_URL || c.execUrl || (script && script.getAttribute("data-exec-url")) || "";
  }
  function seen(id) { try { return localStorage.getItem(KEY + id) === "1"; } catch (e) { return false; } }
  function remember(id) { try { localStorage.setItem(KEY + id, "1"); } catch (e) {} }
  function css() {
    if (document.getElementById("ienn-promo-css")) return;
    var s = document.createElement("style"); s.id = "ienn-promo-css";
    s.textContent =
      ".ienn-promo{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:var(--promo-backdrop,rgba(0,0,0,.55));padding:16px;font-family:var(--promo-font,inherit)}" +
      "@media(min-width:600px){.ienn-promo{align-items:center}}" +
      ".ienn-promo__box{position:relative;width:100%;max-width:440px;background:var(--promo-bg,#fff);color:var(--promo-fg,#1d2a1d);border-radius:var(--promo-radius,16px);padding:28px 20px 20px;box-shadow:0 10px 40px rgba(0,0,0,.3)}" +
      ".ienn-promo__title{margin:0 40px 8px 0;font-size:1.4rem;line-height:1.25}" +
      ".ienn-promo__msg{margin:0 0 12px;font-size:1rem;line-height:1.5}" +
      ".ienn-promo__note{margin:0 0 16px;font-weight:600;color:var(--promo-accent,#2f6b2f)}" +
      ".ienn-promo__cta{display:block;width:100%;min-height:48px;border:0;border-radius:calc(var(--promo-radius,16px) - 6px);background:var(--promo-accent,#2f6b2f);color:var(--promo-accent-fg,#fff);font:inherit;font-size:1.05rem;font-weight:700;cursor:pointer}" +
      ".ienn-promo__x{position:absolute;top:8px;right:8px;width:44px;height:44px;border:0;background:transparent;color:inherit;font-size:28px;line-height:1;cursor:pointer;border-radius:50%}" +
      ".ienn-promo button:focus-visible{outline:3px solid var(--promo-accent,#2f6b2f);outline-offset:2px}";
    document.head.appendChild(s);
  }
  function show(p, preview) {
    css();
    var prev = document.activeElement, root = document.createElement("div");
    root.className = "ienn-promo";
    var box = document.createElement("div");
    box.className = "ienn-promo__box"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "ienn-promo-title");
    function el(tag, cls, text) { var n = document.createElement(tag); n.className = cls; if (text) n.textContent = text; return n; }
    var x = el("button", "ienn-promo__x", "\u00d7"); x.type = "button"; x.setAttribute("aria-label", "Close");
    var h = el("h2", "ienn-promo__title", p.title || "Special"); h.id = "ienn-promo-title";
    box.appendChild(x); box.appendChild(h);
    if (p.message) box.appendChild(el("p", "ienn-promo__msg", p.message));
    if (p.discountNote) box.appendChild(el("p", "ienn-promo__note", p.discountNote));
    var cta = el("button", "ienn-promo__cta", "Shop now"); cta.type = "button";
    box.appendChild(cta); root.appendChild(box);
    var oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function close() {
      if (!preview) remember(p.id);
      document.removeEventListener("keydown", onKey, true);
      root.parentNode && root.parentNode.removeChild(root);
      document.body.style.overflow = oldOverflow;
      if (prev && prev.focus) try { prev.focus(); } catch (e) {}
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab") { // focus trap between the two buttons
        var f = [x, cta], i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    }
    x.addEventListener("click", close); cta.addEventListener("click", close);
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(root); cta.focus();
  }
  function pick(list) { for (var i = 0; i < list.length; i++) if (list[i] && list[i].id && !seen(list[i].id)) return list[i]; return null; }
  function run() {
    if (/[?&]promo=preview\b/.test(location.search)) {
      return show({ id: "preview", title: "Fall sale (SAMPLE)", message: "Sample promo text for review. Fall is native planting season. Pick yours up in Fontana on Saturdays.", discountNote: "" }, true);
    }
    var u = execUrl(); if (!u || !window.fetch) return;
    fetch(u + (u.indexOf("?") < 0 ? "?" : "&") + "api=promos")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { var p = d && d.promos && pick(d.promos); if (p) show(p, false); })
      .catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
