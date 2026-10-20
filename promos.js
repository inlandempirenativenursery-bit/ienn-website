/* IENN promo modal. Data: `promo` in the inventory feed (Apps Script, sheet tab "Promos"), read from the
   same fetch inventory.js already makes (event "ienn:feed"). Overlay only; the shop stays underneath and
   nothing in the order flow changes. Test without the sheet: add ?promo=preview to the URL (mock data).
   Dismissal is remembered per promo (title + start date) for the rest of that day. */
(function () {
  var MOCK = { title: "Fall Sale (preview)", message: "PREVIEW / mock data: Fall planting season is here. Stock up on natives before the rains.", start: "2026-11-01", end: "2026-11-30", discountNote: "Example: 10% off all 1 gal plants" };
  var preview = /[?&]promo=preview\b/.test(location.search), shown = false;
  function today() { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function key(p) { return "ienn-promo-dismissed:" + p.title + "|" + p.start; }
  function dismissed(p) { try { return localStorage.getItem(key(p)) === today(); } catch (e) { return false; } }
  function fmt(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m[2] - 1] + " " + (+m[3]) : d; }
  function css() {
    var s = document.createElement("style");
    s.textContent = ".promo-back{position:fixed;inset:0;background:rgba(44,44,44,.55);z-index:1000;display:flex;align-items:flex-end;justify-content:center;padding:0}" +
      ".promo-box{background:var(--cream,#f8f6f3);color:var(--text,#2c2c2c);width:100%;max-width:440px;border-radius:18px 18px 0 0;padding:1.4rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));border-top:6px solid var(--sage,#6b7c6a);box-shadow:0 -8px 30px rgba(0,0,0,.25);text-align:center;max-height:90vh;overflow:auto}" +
      "@media(min-width:600px){.promo-back{align-items:center;padding:1rem}.promo-box{border-radius:18px;border-top:none;border:3px solid var(--sage,#6b7c6a)}}" +
      ".promo-box img{height:64px;width:auto;margin:0 auto .4rem;display:block}.promo-kicker{font-size:.75rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--sage,#6b7c6a);font-weight:700}" +
      ".promo-box h2{margin:.2rem 0 .5rem;font-size:1.6rem;color:var(--sage-dark,#4a5a4a);outline:none}.promo-box p{margin:.4rem 0;line-height:1.45}" +
      ".promo-note{display:inline-block;background:var(--lilac,#d4c4e0);color:var(--sage-dark,#4a5a4a);font-weight:700;border-radius:999px;padding:.35rem .9rem;margin:.4rem 0}" +
      ".promo-dates{font-size:.85rem;color:var(--sage,#6b7c6a)}.promo-btn{display:block;width:100%;min-height:52px;font-size:1.1rem;font-weight:700;border-radius:12px;border:0;margin-top:.7rem;cursor:pointer}" +
      ".promo-go{background:var(--red,#c0392b);color:#fff}.promo-stay{background:transparent;color:var(--sage-dark,#4a5a4a);border:2px solid var(--sage,#6b7c6a);min-height:48px;font-size:1rem}" +
      ".promo-btn:focus-visible{outline:3px solid var(--sage-dark,#4a5a4a);outline-offset:3px}body.promo-open{overflow:hidden}";
    document.head.appendChild(s);
  }
  function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt) e.textContent = txt; return e; }
  function show(p) {
    if (shown || !p || !p.title || (!preview && dismissed(p))) return; shown = true; css();
    var back = el("div", "promo-back"), box = el("div", "promo-box"), last = document.activeElement;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "promo-title"); box.setAttribute("aria-describedby", "promo-msg");
    var logo = document.createElement("img"); logo.src = "images/ienn-logo-sage.png"; logo.alt = ""; box.appendChild(logo);
    box.appendChild(el("div", "promo-kicker", "Inland Empire Native Nursery"));
    var h = el("h2", "", p.title); h.id = "promo-title"; h.tabIndex = -1; box.appendChild(h);
    if (p.message) { var m = el("p", "", p.message); m.id = "promo-msg"; box.appendChild(m); }
    if (p.discountNote) box.appendChild(el("div", "promo-note", p.discountNote));
    if (p.start && p.end) box.appendChild(el("p", "promo-dates", fmt(p.start) + " \u2013 " + fmt(p.end) + " \u00b7 Pickup in Fontana"));
    var go = el("button", "promo-btn promo-go", "Shop the sale"), stay = el("button", "promo-btn promo-stay", "Continue shopping");
    go.type = stay.type = "button"; box.appendChild(go); box.appendChild(stay); back.appendChild(box);
    var hidden = [];
    function close(toShop) {
      try { localStorage.setItem(key(p), today()); } catch (e) {}
      document.removeEventListener("keydown", onKey, true); back.remove(); document.body.classList.remove("promo-open");
      hidden.forEach(function (n) { n.removeAttribute("inert"); n.removeAttribute("aria-hidden"); });
      var shop = document.getElementById("shop") || document.getElementById("shop-grid");
      if (toShop && shop) { shop.scrollIntoView({ behavior: "smooth", block: "start" }); shop.tabIndex = -1; shop.focus({ preventScroll: true }); }
      else if (last && last.focus) last.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(false); return; }
      if (e.key !== "Tab") return;
      var f = [go, stay], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); stay.focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); go.focus(); } else if (i < 0) { e.preventDefault(); go.focus(); }
    }
    go.onclick = function () { close(true); }; stay.onclick = function () { close(false); };
    Array.prototype.forEach.call(document.body.children, function (n) { if (n.tagName !== "SCRIPT" && n.tagName !== "STYLE") { n.setAttribute("inert", ""); n.setAttribute("aria-hidden", "true"); hidden.push(n); } });
    document.body.appendChild(back); document.body.classList.add("promo-open");
    document.addEventListener("keydown", onKey, true); go.focus();
  }
  if (preview) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { show(MOCK); }); else show(MOCK); return; }
  document.addEventListener("ienn:feed", function (e) { show(e.detail && e.detail.promo); });
  if (window.IENN_FEED) show(window.IENN_FEED.promo);
})();
