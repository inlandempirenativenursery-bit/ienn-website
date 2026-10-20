/* IENN promo modal: bold red scroll banner over a dim overlay. Data: `promo` from the inventory JSON (?view=inventory), set in the "Promos" tab of the inventory sheet.
   window.iennPromo(promo) shows it once per browser session (dismissal remembered per title+start).
   Test: add ?promo=preview to the page URL to show a sample. No dependencies. */
(function () {
  var SHOWN = false, KEY = "ienn-promo-dismissed:";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function css() {
    if (document.getElementById("ienn-promo-css")) return;
    var st = document.createElement("style"); st.id = "ienn-promo-css";
    var R = "#C1121F", D = "#8B0D16", C = "#FFF8E7";
    st.textContent = ".ienn-promo{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(15,10,10,.62);overflow-y:auto}" +
      ".ienn-promo-box{position:relative;width:calc(100% - 3rem);max-width:560px;margin:auto;background:linear-gradient(180deg," + D + " 0,"+R+" 10px,"+R+" calc(100% - 10px)," + D + " 100%);color:" + C + ";padding:1.6rem 1.75rem 1.4rem;text-align:center;box-shadow:0 14px 40px rgba(0,0,0,.45);font-family:inherit;transform-origin:center;animation:ienn-unroll .38s cubic-bezier(.2,.8,.3,1.1) both}" +
      ".ienn-promo-tail{position:absolute;z-index:-1;top:1.1rem;bottom:-1.1rem;width:2rem;background:" + D + ";filter:brightness(.85)}" +
      ".ienn-promo-tail.l{left:-1.6rem;clip-path:polygon(0 0,100% 0,100% 100%,0 100%,38% 50%)}" +
      ".ienn-promo-tail.r{right:-1.6rem;clip-path:polygon(0 0,100% 0,62% 50%,100% 100%,0 100%)}" +
      ".ienn-promo-curl{position:absolute;top:-6px;bottom:-6px;width:18px;border-radius:9px;background:linear-gradient(90deg," + D + ",#e0343f 45%," + D + ");box-shadow:0 2px 6px rgba(0,0,0,.35)}" +
      ".ienn-promo-curl.l{left:-9px}.ienn-promo-curl.r{right:-9px}" +
      ".ienn-promo-box h2{margin:0 1.5rem .5rem;color:" + C + ";font-size:clamp(1.6rem,7vw,3rem);font-weight:900;line-height:1.05;letter-spacing:.01em;text-transform:uppercase;text-shadow:0 2px 0 " + D + ";overflow-wrap:break-word;hyphens:auto}" +
      ".ienn-promo-box p{margin:0 0 .7rem;line-height:1.45;font-size:1.05rem;overflow-wrap:anywhere}" +
      ".ienn-promo-note{font-weight:800;font-size:1.15rem!important;border-top:2px dashed rgba(255,248,231,.55);border-bottom:2px dashed rgba(255,248,231,.55);padding:.4rem 0}" +
      ".ienn-promo-dates{font-size:.9rem!important;opacity:.9}" +
      ".ienn-promo-go{display:inline-flex;align-items:center;justify-content:center;min-height:48px;min-width:44px;padding:0 1.75rem;margin-top:.25rem;border:2px solid " + C + ";border-radius:999px;background:" + C + ";color:" + R + ";font:inherit;font-weight:800;font-size:1.05rem;cursor:pointer}" +
      ".ienn-promo-x{position:absolute;top:.15rem;right:.15rem;width:44px;height:44px;border:0;background:none;font-size:1.8rem;line-height:1;color:" + C + ";cursor:pointer;border-radius:8px}" +
      ".ienn-promo-x:focus-visible,.ienn-promo-go:focus-visible{outline:3px solid " + C + ";outline-offset:3px}" +
      "@keyframes ienn-unroll{from{transform:scaleX(.08);opacity:0}60%{opacity:1}to{transform:none;opacity:1}}" +
      "@media (prefers-reduced-motion:reduce){.ienn-promo-box{animation:none}}";
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
      '<span class="ienn-promo-tail l" aria-hidden="true"></span><span class="ienn-promo-tail r" aria-hidden="true"></span><span class="ienn-promo-curl l" aria-hidden="true"></span><span class="ienn-promo-curl r" aria-hidden="true"></span>' +
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
