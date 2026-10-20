/* IENN promo modal. Data: `promo` from the inventory JSON (?view=inventory), set in the "Promos" tab of the inventory sheet.
   window.iennPromo(promo) shows it once per browser session (dismissal remembered per title+start).
   Test: add ?promo=preview to the page URL to show a sample. No dependencies. */
(function () {
  var SHOWN = false, KEY = "ienn-promo-dismissed:";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function css() {
    if (document.getElementById("ienn-promo-css")) return;
    var st = document.createElement("style"); st.id = "ienn-promo-css";
    st.textContent = ".ienn-promo{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(30,36,30,.55)}" +
      ".ienn-promo-box{position:relative;background:#fff;color:var(--text,#2c2c2c);border-radius:12px;border-top:6px solid var(--sage,#6b7c6a);max-width:420px;width:100%;padding:1.5rem 1.25rem 1.25rem;box-shadow:0 10px 30px rgba(0,0,0,.25);text-align:center}" +
      ".ienn-promo-box h2{margin:0 2.25rem .5rem;color:var(--sage-dark,#4a5a4a);font-size:1.35rem}" +
      ".ienn-promo-box p{margin:0 0 .75rem;line-height:1.45}.ienn-promo-note{font-weight:700;color:var(--sage-dark,#4a5a4a)}.ienn-promo-dates{font-size:.85rem;color:#666}" +
      ".ienn-promo-go{display:inline-flex;align-items:center;justify-content:center;min-height:48px;min-width:44px;padding:0 1.5rem;margin-top:.25rem;border:0;border-radius:8px;background:var(--red,#c0392b);color:#fff;font:inherit;font-weight:700;font-size:1rem;cursor:pointer;width:100%}" +
      ".ienn-promo-x{position:absolute;top:.25rem;right:.25rem;width:44px;height:44px;border:0;background:none;font-size:1.6rem;line-height:1;color:#555;cursor:pointer;border-radius:8px}" +
      ".ienn-promo-x:focus-visible,.ienn-promo-go:focus-visible{outline:3px solid var(--sage,#6b7c6a);outline-offset:2px}";
    document.head.appendChild(st);
  }
  function fmt(d) { if (!d) return ""; var p = d.split("-"); var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+p[1] - 1]; return m ? m + " " + (+p[2]) : d; }
  function show(promo, opts) {
    opts = opts || {};
    if (!promo || !promo.title || SHOWN) return;
    var key = KEY + promo.title + "|" + (promo.start || "");
    if (!opts.force) { try { if (sessionStorage.getItem(key)) return; } catch (e) {} }
    SHOWN = true; css();
    var prev = document.activeElement, wrap = document.createElement("div");
    wrap.className = "ienn-promo";
    var dates = promo.start && promo.end ? fmt(promo.start) + " – " + fmt(promo.end) : promo.end ? "Through " + fmt(promo.end) : "";
    wrap.innerHTML = '<div class="ienn-promo-box" role="dialog" aria-modal="true" aria-labelledby="ienn-promo-title"' + (promo.message ? ' aria-describedby="ienn-promo-msg"' : "") + ">" +
      '<button type="button" class="ienn-promo-x" aria-label="Close">×</button>' +
      '<h2 id="ienn-promo-title">' + esc(promo.title) + "</h2>" +
      (promo.message ? '<p id="ienn-promo-msg">' + esc(promo.message) + "</p>" : "") +
      (promo.discountNote ? '<p class="ienn-promo-note">' + esc(promo.discountNote) + "</p>" : "") +
      (dates ? '<p class="ienn-promo-dates">' + esc(dates) + "</p>" : "") +
      '<button type="button" class="ienn-promo-go">' + esc(opts.cta || "Shop now") + "</button></div>";
    var go = wrap.querySelector(".ienn-promo-go"), x = wrap.querySelector(".ienn-promo-x"), oldOverflow = document.body.style.overflow;
    function close(shop) {
      try { sessionStorage.setItem(key, "1"); } catch (e) {}
      document.removeEventListener("keydown", onKey, true); wrap.remove(); document.body.style.overflow = oldOverflow;
      if (shop && opts.onShop) opts.onShop(); else if (prev && prev.focus) prev.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
      else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === go ? x : go).focus(); } // keep focus inside
    }
    go.addEventListener("click", function () { close(true); });
    x.addEventListener("click", function () { close(false); });
    wrap.addEventListener("click", function (e) { if (e.target === wrap) close(false); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(wrap); document.body.style.overflow = "hidden"; go.focus();
  }
  var PREVIEW = { title: "Fall Sale (preview)", message: "Fall is a great time to plant natives. Reserve your plants for Saturday pickup in Fontana.", start: "2026-11-01", end: "2026-11-30", discountNote: "" };
  window.iennPromo = function (promo, opts) { show(promo, Object.assign({}, window.IENN_PROMO_OPTS || {}, opts || {})); };
  function preview() { if (/[?&]promo=preview\b/.test(location.search)) window.iennPromo(PREVIEW, { force: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", preview); else preview();
})();
