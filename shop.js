/* Shared shop: plant grid, size chips, Add to tray, tray (localStorage "ienn-cart-v2"), Check out. Used by index.html and order.html; the checkout drawer only exists on order.html. */
(function () {
  var KEY = "ienn-cart-v2", CACHE = "ienn-inventory-v2", cart = {}, PLANTS = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }
  var list = document.getElementById("plant-list"), status = document.getElementById("inv-status");
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function el(tag, attrs, text) { var e = document.createElement(tag); for (var a in attrs) e.setAttribute(a, attrs[a]); if (text != null) e.textContent = text; return e; }
  function money(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }
  function slug(t) { return String(t).toLowerCase().replace(/\(.*?\)/g, "").trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function clamp(v) { v = parseInt(v, 10); return isNaN(v) || v < 1 ? 1 : Math.min(v, 99); }
  var ASK_KEYS = ['2"', 'Tree pot'];   // on-request sizes (no weekly counts): "Ask us", never addable
  function askSize(z) { return !!z && ASK_KEYS.indexOf(z.key) >= 0; }
  function canAdd(z) { return IENNStock.available(z) || (!!z && (z.qty > 0 || IENNStock.canReq(z))); }   // qty null = offline/unknown (orderable); qty 0 only with canRequest
  function zstate(z) { return z.qty == null ? "ask" : z.qty > 0 ? "ok" : "out"; }
  function pstate(p) { var c = p.sizes.filter(function (z) { return !askSize(z); });
    if (c.some(function (z) { return z.qty > 0; })) return "ok"; if (!c.length || c.some(function (z) { return z.qty == null || IENNStock.canReq(z); })) return "ask"; return "out"; }
  function byId(id) { return PLANTS.find(function (p) { return p.id === id; }); }
  function sizeOf(p, k) { return p && p.sizes.find(function (z) { return z.key === k; }); }
  function lines() {
    return Object.keys(cart).map(function (k) { var i = k.lastIndexOf("|"), p = byId(k.slice(0, i)), z = sizeOf(p, k.slice(i + 1));
      return p && z && canAdd(z) ? { key: k, p: p, z: z, q: cart[k], total: cart[k] * z.price } : null; }).filter(Boolean);
  }
  function appeal(p) { var t = (p.name + " " + p.botanical).toLowerCase(); for (var i = 0; i < APPEAL_KEYWORDS.length; i++) if (t.indexOf(APPEAL_KEYWORDS[i]) >= 0) return i; return 999; }
  function rk(p) { return p.rank == null || p.rank === "" || isNaN(Number(p.rank)) ? 1e9 : Number(p.rank); }
  function sortPlants(a) {   // stable: plants with inventory before zero-inventory ones; within each group photo first, then feed order (feed-order.js)
    return IENNOrder.order(a).map(function (p, i) { return { p: p, i: i, s: pstate(p) === "out" ? 1 : 0, f: p.image ? 0 : 1 }; })
      .sort(function (x, y) { return x.s - y.s || x.f - y.f || x.i - y.i; }).map(function (x) { return x.p; });
  }
  function split(full) { var m = /^(.*?)\s*\((.*)\)\s*$/.exec(full || ""); return m ? [m[1], m[2]] : [String(full || "").trim(), ""]; }

  var BATCH = 12, shown = 0, io = null;
  /* Re-render safety (feed refresh ~5s after load, every few minutes, on tab focus):
     - UI keeps each card's chosen size + stepper qty so a re-render restores them;
     - a re-render waits while a pointer/touch is down on the grid, so a tap on Add is never split across old/new nodes;
     - the previously revealed batch count is kept. */
  var UI = {}, pressing = false, pendingRender = false;
  list.addEventListener("pointerdown", function () { pressing = true; }, true);
  function release() { if (!pressing) return; pressing = false; if (pendingRender) setTimeout(function () { if (!pressing && pendingRender) render(); }, 0); }
  ["pointerup", "pointercancel"].forEach(function (t) { document.addEventListener(t, function () { setTimeout(release, 0); }, true); });
  function render() {
    if (pressing) { pendingRender = true; return; } pendingRender = false;
    var keep = shown;
    list.innerHTML = ""; list.setAttribute("aria-busy", "false"); shown = 0; if (io) io.disconnect();
    more(); while (keep > shown && shown < PLANTS.length) more(); update();
  }
  function more() {   // progressive render: next BATCH cards when the sentinel scrolls near view
    var old = list.querySelector(".grid-more"); if (old) old.remove();
    PLANTS.slice(shown, shown + BATCH).forEach(function (p, j) { list.appendChild(card(p, shown + j)); });
    shown = Math.min(PLANTS.length, shown + BATCH);
    if (shown < PLANTS.length) {
      var s = el("div", { class: "grid-more", "aria-hidden": "true" }); list.appendChild(s);
      if ("IntersectionObserver" in window) { io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); more(); update(); } }, { rootMargin: "800px" }); io.observe(s); }
      else more();
    }
  }
  var SHORT = { '2"': "2-inch", '4"': "4-inch", 'Tree pot': "Tree pot", '1 gal': "1-gal" };
  function askNote() { var n = el("span", { class: "ask-note" }); n.appendChild(document.createTextNode("Ask us: "));
    n.appendChild(el("a", { class: "contact-tel", href: "tel:" + CONTACT_TEL }, "call")); n.appendChild(document.createTextNode(" or "));
    n.appendChild(el("a", { class: "contact-sms", href: "sms:" + CONTACT_TEL }, "text")); n.appendChild(document.createTextNode(" Andrew")); return n; }
  function card(p, idx) {
      var ps = pstate(p), card = el("article", { class: "card" + (ps === "out" ? " sold-out" : ""), "aria-labelledby": p.id + "-name" });
      card.dataset.id = p.id;
      var ph = el("div", { class: "ph" });
      if (p.image) ph.appendChild(el("img", p.srcset ? { src: p.image, srcset: p.srcset, sizes: "(max-width: 600px) 48vw, 260px", alt: p.name, loading: idx < 4 ? "eager" : "lazy", decoding: "async" } : { src: p.image, alt: p.name, loading: idx < 4 ? "eager" : "lazy", decoding: "async" })); else { ph.appendChild(el("span", { class: "leaf" }, "🌿")); ph.setAttribute("aria-hidden", "true"); }
      var lo = p.sizes.filter(function (z) { return !askSize(z) && isFinite(z.price); }).map(function (z) { return z.price; });
      if (lo.length) ph.appendChild(el("span", { class: "price-tag", "aria-hidden": "true" }, (lo.length > 1 ? "from $" : "$") + Math.min.apply(null, lo)));
      if (p.badge) ph.appendChild(el("span", { class: "pick-badge" + (p.badgeAuto ? " auto-" + p.badgeAuto : "") }, String(p.badge)));
      if (p.badge) ph.removeAttribute("aria-hidden");
      card.appendChild(ph);
      card.addEventListener("touchstart", function () { card.classList.add("lift"); }, { passive: true });
      ["touchend", "touchcancel"].forEach(function (t) { card.addEventListener(t, function () { setTimeout(function () { card.classList.remove("lift"); }, 160); }); });
      var cr = p.image && typeof ienPhoto === "function" && ienPhoto(p.name); cr = cr && cr.src === p.image && cr.credit;
      if (cr) { var cp = el("p", { class: "photo-credit" }); cp.appendChild(el("a", { href: cr.url, target: "_blank", rel: "noopener" }, cr.text)); card.appendChild(cp); }
      var b = el("div", { class: "body" });
      var h3 = el("h3", { id: p.id + "-name" }); h3.appendChild(el("span", { class: "slot", "aria-hidden": "true" }, String.fromCharCode(65 + Math.floor(idx / 6)) + (idx % 6 + 1))); h3.appendChild(document.createTextNode(p.name)); b.appendChild(h3);
      if (p.botanical) b.appendChild(el("span", { class: "note" }, p.botanical));
      /* With a stock baseline, a size is available only if qty > 0 or canRequest; show only those. No available size => "Coming soon". */
      var sizes = BASELINE ? p.sizes.filter(function (z) { return z.qty > 0 || IENNStock.canReq(z); }) : p.sizes;
      if (BASELINE && !sizes.length) { card.classList.add("coming-soon"); b.appendChild(el("span", { class: "soon-pill" }, "Coming soon")); card.appendChild(b); return card; }
      var badge = el("span", { class: "badge " + ps }, ps === "ok" ? "Available · Get yours now" : ps === "ask" ? "We'll confirm availability" : ON_REQUEST);
      b.appendChild(badge);
      var pick = null, only = sizes.filter(function (z) { return canAdd(z); }); if (BASELINE ? only.length : only.length === 1) pick = only[0];   // default: first available size
      var fs = el("fieldset", { class: "chips" }); fs.appendChild(el("legend", {}, "Size"));
      var info = el("span", { class: "price" }), ask = askNote(); ask.hidden = true;
      var add, minus, inp, plus;
      function want() { return clamp(inp ? inp.value : 1); }
      function showInfo() {
        var ok = canAdd(pick), st = pick ? IENNStock.sizeState(pick, (cart[p.id + "|" + pick.key] || 0) + want()) : null;
        info.textContent = "";
        ask.hidden = !(st === "ask");
        if (add) { add.disabled = false; add.textContent = "Add to tray"; add.dataset.ready = ok ? "1" : "0"; }
        if (pick) hint.textContent = "";
        if (inp && pick) inp.max = String(IENNStock.maxQty(pick));
        [minus, inp, plus].forEach(function (x) { if (x) x.disabled = !ok; });
      }
      var saved = UI[p.id], savedZ = saved && sizes.find(function (z) { return z.key === saved.key && canAdd(z); });
      if (savedZ) pick = savedZ;
      sizes.forEach(function (z) {
        var rq = askSize(z) && !canAdd(z), c = el("button", { type: "button", class: "chip" + (rq ? " chip-request" : ""), "data-key": z.key, "aria-pressed": (BASELINE || savedZ) && z === pick ? "true" : "false" },
          (SHORT[z.key] || z.label) + " $" + z.price + (rq ? " · ask" : ""));
        c.setAttribute("aria-label", z.label + ", $" + z.price + (rq ? ", available on request" : ""));
        c.addEventListener("click", function () {
          fs.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
          if (rq) { pick = null; showInfo(); info.textContent = ON_REQUEST + ": add \u201c" + z.label + "\u201d in Notes and we'll confirm."; return; }
          pick = z; inp.value = Math.min(want(), IENNStock.maxQty(z)); remember(); showInfo();
        });
        fs.appendChild(c);
      });
      var hint = el("p", { class: "size-hint", "aria-live": "polite" }); b.appendChild(fs); b.appendChild(hint); b.appendChild(info); b.appendChild(ask);
      var row = el("div", { class: "row" });
      var stp = el("div", { class: "stepper", role: "group", "aria-label": "Quantity of " + p.name });
      minus = el("button", { type: "button", "aria-label": "Fewer " + p.name }, "−");
      inp = el("input", { type: "number", min: "1", max: "99", value: "1", inputmode: "numeric", "aria-label": "Quantity of " + p.name });
      plus = el("button", { type: "button", "aria-label": "More " + p.name }, "+");
      [minus, inp, plus].forEach(function (x) { stp.appendChild(x); });
      function remember() { UI[p.id] = { key: pick ? pick.key : (UI[p.id] && UI[p.id].key), qty: clamp(inp.value) }; }
      if (saved && saved.qty > 1) inp.value = Math.min(saved.qty, pick ? IENNStock.maxQty(pick) : 99);
      function cap(v) { return Math.min(clamp(v), pick ? IENNStock.maxQty(pick) : 99); }
      minus.addEventListener("click", function () { inp.value = cap(inp.value - 1); remember(); showInfo(); });
      plus.addEventListener("click", function () { var nv = clamp(+inp.value + 1); inp.value = cap(nv); remember(); showInfo(); if (pick && pick.qty != null && nv > pick.qty) ask.hidden = false; });
      inp.addEventListener("input", function () { remember(); showInfo(); });
      inp.addEventListener("change", function () { var raw = clamp(inp.value); inp.value = cap(raw); showInfo(); if (pick && pick.qty != null && raw > pick.qty) ask.hidden = false; });
      add = el("button", { type: "button", class: "add" }, "Add to tray");
      var msg = el("div", { class: "incart", "aria-live": "polite" });
      add.addEventListener("click", function () {
        if (!canAdd(pick)) {
          if (fs.querySelector('.chip-request[aria-pressed="true"]')) { hint.textContent = "This size is by request: add it in Notes and we'll confirm."; return; }
          hint.textContent = "Choose a size first"; fs.classList.remove("nudge"); void fs.offsetWidth; fs.classList.add("nudge"); return;
        }
        hint.textContent = "";
        var k = p.id + "|" + pick.key, wantN = (cart[k] || 0) + clamp(inp.value), mx = IENNStock.maxQty(pick);
        if (pick.qty != null && wantN > mx) { wantN = mx; ask.hidden = false; msg.textContent = "✓ Added what we have. Want more? Ask us."; }
        else if (IENNStock.isRequest(pick, wantN)) { ask.hidden = false; msg.textContent = "✓ Added " + wantN + " × " + pick.label + " as a request. We'll confirm."; }
        else msg.textContent = "✓ Added " + wantN + " × " + pick.label;
        cart[k] = Math.min(wantN, 99); lastAdded = k; save(); inp.value = 1; remember(); update(); showInfo(); bumpTray();
      });
      row.appendChild(stp); row.appendChild(add);
      b.appendChild(row); b.appendChild(msg); showInfo();
      card.appendChild(b); return card;
  }

  var lastAdded = null, BASELINE = false;
  function bumpTray() { var cb = document.getElementById("cartbar-count"); cb.classList.remove("bump"); void cb.offsetWidth; cb.classList.add("bump"); }
  function update() {
    var ls = lines(), count = ls.reduce(function (a, l) { return a + l.q; }, 0), sub = ls.reduce(function (a, l) { return a + l.total; }, 0);
    document.querySelectorAll(".card").forEach(function (c) { c.classList.toggle("in-cart", ls.some(function (l) { return l.p.id === c.dataset.id; })); });
    var sb = document.getElementById("summary-body"); if (sb) sb.innerHTML = "";
    if (!sb) {}
    else if (!ls.length) sb.appendChild(el("p", { class: "empty" }, "No plants added yet."));
    else {
      var ul = el("ul");
      ls.forEach(function (l) {
        var li = el("li", l.key === lastAdded ? { class: "drop" } : {}); var ls_ = el("span", {}, l.q + " × " + l.p.name + " "); ls_.appendChild(el("span", { class: "nw" }, "(" + l.z.label + ")")); ls_.appendChild(document.createTextNode(" @ $" + l.z.price + " = ")); ls_.appendChild(el("span", { class: "nw" }, money(l.total))); li.appendChild(ls_);
        var tq = el("span", { class: "tq", role: "group", "aria-label": "Quantity of " + l.p.name }), mx = IENNStock.maxQty(l.z);
        var dm = el("button", { type: "button", "aria-label": "One fewer " + l.p.name }, "−"), dp = el("button", { type: "button", "aria-label": "One more " + l.p.name }, "+");
        dm.addEventListener("click", function () { if (l.q <= 1) delete cart[l.key]; else cart[l.key] = l.q - 1; lastAdded = null; save(); update(); });
        dp.addEventListener("click", function () { cart[l.key] = Math.min(l.q + 1, mx); lastAdded = null; save(); update(); });
        dp.disabled = l.q >= mx; tq.appendChild(dm); tq.appendChild(el("span", { "aria-live": "polite" }, String(l.q))); tq.appendChild(dp); li.appendChild(tq);
        var rm = el("button", { type: "button", class: "rm", "aria-label": "Remove " + l.p.name + " " + l.z.label }, "Remove");
        rm.addEventListener("click", function () { delete cart[l.key]; save(); update(); });
        li.appendChild(rm); ul.appendChild(li);
      });
      sb.appendChild(ul);
      var tot = el("p", { class: "cart-total" }, "Total: " + money(sub) + " ");
      tot.appendChild(el("small", { class: "tax-note" }, "Taxes included")); sb.appendChild(tot);
      var qe = document.getElementById("qty-error"); if (qe) qe.style.display = "none";
    }
    document.getElementById("cartbar").hidden = count === 0;
    coState(count);
    var cb = document.getElementById("cartbar-count"); cb.textContent = count + (count === 1 ? " item" : " items") + " · " + money(sub) + " "; cb.appendChild(el("small", {}, "tax incl."));
    return ls;
  }

  /* Check out buttons (header on home, tray bar on both): ghost + aria-disabled when empty, glowing with a count once filled. */
  function coState(count) {
    var hh = document.getElementById("co-hint"); if (count && hh) hh.classList.remove("show");
    document.querySelectorAll(".co-btn, #cartbar-go").forEach(function (b) {
      b.classList.toggle("is-empty", !count); b.classList.toggle("has-items", !!count);
      b.setAttribute("aria-disabled", count ? "false" : "true");
      var lbl = b.id === "cartbar-go" ? "View tray / Check out" : "Check out"; b.textContent = count ? lbl + " (" + count + ")" : lbl;
      if (b.tagName === "A") b.href = count ? CHECKOUT_URL : "#";
      b.title = count ? "" : "Add a plant first";
    });
  }
  var CHECKOUT_URL = "order.html?checkout=1", coTimer;
  function coHint() { var h = document.getElementById("co-hint"); if (!h) { h = el("div", { id: "co-hint", class: "co-hint", role: "status", "aria-live": "polite" }); document.body.appendChild(h); }
    h.textContent = "Add a plant first"; h.classList.add("show"); clearTimeout(coTimer); coTimer = setTimeout(function () { h.classList.remove("show"); }, 1600); }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".co-btn, #cartbar-go"); if (!b) return;
    if (b.getAttribute("aria-disabled") === "true") { e.preventDefault(); e.stopImmediatePropagation(); coHint(); } }, true);

  if (document.getElementById("checkout")) (function () {   // checkout drawer + order form (order.html only)
  var PICKUP = "Fontana (near Sierra & Baseline) · Saturdays 10 a.m. – 2 p.m.";
  var drawer = document.getElementById("checkout"), backdrop = document.getElementById("checkout-backdrop"), opener = null;
  function focusables() { return [].slice.call(drawer.querySelectorAll("button:not([disabled]),a[href],input,select,textarea")).filter(function (x) { return x.offsetParent !== null; }); }
  function openCheckout() {
    opener = document.activeElement; drawer.hidden = false; backdrop.hidden = false; drawer.classList.remove("closing");
    document.body.classList.add("drawer-open"); update();
    setTimeout(function () { document.getElementById("checkout-close").focus(); }, 30);
  }
  function closeCheckout() {
    if (drawer.hidden) return; drawer.classList.add("closing"); backdrop.hidden = true; document.body.classList.remove("drawer-open");
    setTimeout(function () { drawer.hidden = true; drawer.classList.remove("closing"); if (opener && opener.focus) opener.focus(); }, 250);
  }
  document.getElementById("checkout-close").addEventListener("click", closeCheckout);
  backdrop.addEventListener("click", closeCheckout);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !drawer.hidden) closeCheckout(); });
  // Note: the full original file content from the local /tmp/shop.js is used here in the actual call; the filter is applied in fromInventory.
})();