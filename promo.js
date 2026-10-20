/* IENN promo modal. Data: `promo` from the inventory JSON (?view=inventory), set in the "Promos" tab of the inventory sheet.
   window.iennPromo(promo) shows it once per browser session (dismissal remembered per title+start).
   Test: add ?promo=preview to the page URL to show a sample. No dependencies. */
(function () {
  var FINE = "Pickup Saturdays 10 AM–2 PM in Fontana. Taxes included.\nGrand Terrace pickup and other times available upon request.";
  var SHOWN = false, KEY = "ienn-promo-dismissed:";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function css() {
    if (document.getElementById("ienn-promo-css")) return;
    var st = document.createElement("style"); st.id = "ienn-promo-css";
    st.textContent = [
      ".ienn-promo{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:2.5rem 1.6rem;background:rgba(20,16,16,.62);overflow-y:auto}",
      ".ienn-promo-scroll{position:relative;width:100%;max-width:440px;margin:auto;filter:drop-shadow(0 14px 28px rgba(0,0,0,.45))}",
      /* rolled ends: shaded cylinders wider than the sheet, with end caps */
      ".ienn-promo-roll{position:relative;height:26px;margin:0 -14px;border-radius:13px;background:linear-gradient(180deg,#5e0712 0%,#a50d22 30%,#d3263c 48%,#8f0b1d 72%,#4f0510 100%);box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}",
      ".ienn-promo-roll::before,.ienn-promo-roll::after{content:'';position:absolute;top:3px;width:12px;height:20px;border-radius:50%;background:radial-gradient(ellipse at 40% 40%,#e9c9a0 0%,#b8875a 55%,#6b4423 100%)}",
      ".ienn-promo-roll::before{left:-6px}.ienn-promo-roll::after{right:-6px}",
      ".ienn-promo-top{margin-bottom:-9px;z-index:2}.ienn-promo-bottom{margin-top:-9px;z-index:2}",
      /* the sheet */
      ".ienn-promo-box{position:relative;z-index:1;background:linear-gradient(90deg,#9e0c22 0%,#c8102e 9%,#d0152f 50%,#c8102e 91%,#9e0c22 100%);color:#fff;padding:2rem 1.4rem 1.5rem;text-align:center;border-left:1px solid #7a0918;border-right:1px solid #7a0918}",
      ".ienn-promo-box::before{content:'';position:absolute;inset:14px 12px;border:1.5px solid rgba(255,240,220,.55);pointer-events:none}",
      ".ienn-promo-box h2{margin:.25rem 2rem .5rem;font-size:clamp(1.9rem,8vw,2.6rem);line-height:1.05;font-weight:800;letter-spacing:.01em;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.25)}",
      ".ienn-promo-box p{margin:0 0 .75rem;line-height:1.45;font-size:1.05rem;font-weight:600;color:#fff8ee}",
      ".ienn-promo-note{display:inline-block;padding:.3rem .8rem;border-radius:999px;background:#fff8ee;color:#8f0b1d!important;font-weight:800!important}",
      ".ienn-promo-dates{font-size:.95rem!important;letter-spacing:.06em;text-transform:uppercase;color:#ffe6c7!important}",
      ".ienn-promo-go{position:relative;display:inline-flex;align-items:center;justify-content:center;min-height:48px;min-width:44px;width:100%;max-width:280px;padding:0 1.5rem;margin-top:.35rem;border:0;border-radius:999px;background:#fff8ee;color:#a50d22;font:inherit;font-weight:800;font-size:1.05rem;letter-spacing:.02em;cursor:pointer;box-shadow:0 3px 0 #6f0816}",
      ".ienn-promo-go:hover{background:#fff}",
      ".ienn-promo-x{position:absolute;top:18px;right:16px;z-index:3;width:44px;height:44px;border:0;background:none;font-size:1.7rem;line-height:1;color:#fff8ee;cursor:pointer;border-radius:50%}",
      ".ienn-promo-tag{position:absolute;top:22px;left:22px;font-size:.7rem;font-weight:800;letter-spacing:.12em;color:#ffe6c7;opacity:.85}",
      ".ienn-promo-x:hover{background:rgba(255,255,255,.12)}",
      ".ienn-promo-x:focus-visible,.ienn-promo-go:focus-visible{outline:3px solid #ffd27a;outline-offset:3px}",
      ".ienn-promo-info{margin:1rem -1.4rem -1.5rem;padding:.8rem 1.4rem .9rem;background:#fff8ee;color:#7a0918;border-top:3px dashed #a50d22;font-size:.92rem;line-height:1.45;font-weight:600;white-space:pre-line;overflow-wrap:break-word}",
      ".ienn-promo-info strong{display:block;font-size:1.05rem;font-weight:800;color:#a50d22}",
      "@media (prefers-reduced-motion:no-preference){.ienn-promo{animation:iennFade .25s ease-out}.ienn-promo-scroll{animation:iennPop .45s cubic-bezier(.2,1.3,.4,1)}.ienn-promo-box{transform-origin:top;animation:iennUnroll .5s ease-out}}",
      "@keyframes iennFade{from{opacity:0}}@keyframes iennPop{from{transform:scale(.85) translateY(12px);opacity:0}}@keyframes iennUnroll{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}"
    ].join("");
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
    var custom = String(promo.bottomInfo || "").trim(), dates = promo.end ? (custom ? "Through " : "Ends ") + fmt(promo.end) : "";
    // Bottom info strip: the Promos "Bottom info" cell, or (blank) Discount note + Ends date + pickup fine print.
    var info = custom ? esc(custom) : (promo.discountNote ? "<strong>" + esc(promo.discountNote) + "</strong>" : "") +
      esc((dates ? dates + " · " : "") + FINE);
    wrap.innerHTML = '<div class="ienn-promo-scroll" role="dialog" aria-modal="true" aria-labelledby="ienn-promo-title"' + ' aria-describedby="' + (promo.message ? "ienn-promo-msg " : "") + 'ienn-promo-info">' +
      '<div class="ienn-promo-roll ienn-promo-top" aria-hidden="true"></div><div class="ienn-promo-box">' +
      '<button type="button" class="ienn-promo-x" aria-label="Close">×</button>' + (opts.preview ? '<span class="ienn-promo-tag">PREVIEW</span>' : "") +
      '<h2 id="ienn-promo-title">' + esc(promo.title) + "</h2>" +
      (promo.message ? '<p id="ienn-promo-msg">' + esc(promo.message) + "</p>" : "") +
      (custom && promo.discountNote ? '<p class="ienn-promo-note">' + esc(promo.discountNote) + "</p>" : "") +
      (custom && dates ? '<p class="ienn-promo-dates">' + esc(dates) + "</p>" : "") +
      '<button type="button" class="ienn-promo-go">' + esc(opts.cta || "Shop now") + "</button>" +
      '<div class="ienn-promo-info" id="ienn-promo-info">' + info + "</div></div>" +
      '<div class="ienn-promo-roll ienn-promo-bottom" aria-hidden="true"></div></div>';
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
  var PREVIEW = { title: "Fall Sale", message: "Fall is a great time to plant natives. Reserve your plants for Saturday pickup in Fontana.", start: "2026-11-01", end: "2026-11-30", discountNote: "15% off all 1 gallon plants", bottomInfo: "" };
  window.iennPromo = function (promo, opts) { show(promo, Object.assign({}, window.IENN_PROMO_OPTS || {}, opts || {})); };
  function preview() { if (/[?&]promo=preview\b/.test(location.search)) window.iennPromo(PREVIEW, { force: true, preview: true }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", preview); else preview();
})();
