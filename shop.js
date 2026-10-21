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
  function canAdd(z) { return IENNStock.available(z); }   // qty null = offline/unknown (orderable); qty 0 only with canRequest
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
  function render() {
    list.innerHTML = ""; list.setAttribute("aria-busy", "false"); shown = 0; if (io) io.disconnect();
    more(); update();
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
      var badge = el("span", { class: "badge " + ps }, ps === "ok" ? "Available · Get yours now" : ps === "ask" ? "We'll confirm availability" : ON_REQUEST);
      b.appendChild(badge);
      var pick = null, only = p.sizes.filter(function (z) { return !askSize(z); }); if (only.length === 1) pick = only[0];   // single size: selected for Add, but NOT highlighted
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
      p.sizes.forEach(function (z) {
        var rq = askSize(z), c = el("button", { type: "button", class: "chip" + (rq ? " chip-request" : ""), "aria-pressed": "false" },
          (SHORT[z.key] || z.label) + " $" + z.price + (rq ? " · ask" : ""));
        c.setAttribute("aria-label", z.label + ", $" + z.price + (rq ? ", available on request" : ""));
        c.addEventListener("click", function () {
          fs.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
          if (rq) { pick = null; showInfo(); info.textContent = ON_REQUEST + ": add \u201c" + z.label + "\u201d in Notes and we'll confirm."; return; }
          pick = z; inp.value = Math.min(want(), IENNStock.maxQty(z)); showInfo();
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
      function cap(v) { return Math.min(clamp(v), pick ? IENNStock.maxQty(pick) : 99); }
      minus.addEventListener("click", function () { inp.value = cap(inp.value - 1); showInfo(); });
      plus.addEventListener("click", function () { var nv = clamp(+inp.value + 1); inp.value = cap(nv); showInfo(); if (pick && pick.qty != null && nv > pick.qty) ask.hidden = false; });
      inp.addEventListener("input", function () { showInfo(); });
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
        cart[k] = Math.min(wantN, 99); lastAdded = k; save(); inp.value = 1; update(); showInfo(); bumpTray();
      });
      row.appendChild(stp); row.appendChild(add);
      b.appendChild(row); b.appendChild(msg); showInfo();
      card.appendChild(b); return card;
  }

  var lastAdded = null;
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
    setTimeout(function () { drawer.hidden = true; drawer.classList.remove("closing"); drawer.style.transform = ""; }, 200);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }
  window.iennOpenCheckout = openCheckout;
  document.getElementById("cartbar-go").addEventListener("click", openCheckout);
  var hdrCo = document.getElementById("hdr-checkout"); if (hdrCo && hdrCo.tagName === "BUTTON") hdrCo.addEventListener("click", openCheckout);
  document.getElementById("keep-shopping").addEventListener("click", function () { closeCheckout(); setTimeout(function () { document.getElementById("plant-list").scrollIntoView({ behavior: "smooth", block: "start" }); }, 220); });
  document.getElementById("checkout-close").addEventListener("click", closeCheckout);
  backdrop.addEventListener("click", closeCheckout);
  document.addEventListener("keydown", function (e) {
    if (drawer.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeCheckout(); }
    else if (e.key === "Tab") { var f = focusables(); if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } else if (!drawer.contains(document.activeElement)) { e.preventDefault(); a.focus(); } }
  });
  (function () { var head = document.getElementById("drawer-head"), y0 = null;   // swipe down on the header to close (phones)
    head.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    head.addEventListener("touchmove", function (e) { if (y0 == null) return; var d = Math.max(0, e.touches[0].clientY - y0); drawer.style.transform = "translateY(" + d + "px)"; }, { passive: true });
    head.addEventListener("touchend", function (e) { var d = y0 == null ? 0 : e.changedTouches[0].clientY - y0; y0 = null; drawer.style.transform = ""; if (d > 80) closeCheckout(); });
  })();
  function fieldErr(id, msg) { var f = document.getElementById(id); f.setAttribute("aria-invalid", msg ? "true" : "false"); document.getElementById(id + "-err").textContent = msg || ""; return !msg; }
  function v(id) { return document.getElementById(id).value.trim(); }
  var form = document.getElementById("order-form"), btn = form.querySelector(".submit-btn"), serr = document.getElementById("server-error");
  function showConfirm(ls, orderId, total, notes) {
    document.getElementById("confirm-id").textContent = orderId ? "Order number: " + orderId : "";
    var cl = document.getElementById("confirm-list"); cl.innerHTML = "";
    ls.forEach(function (l) { cl.appendChild(el("li", {}, l.q + " × " + l.p.name + " (" + l.z.label + ") — " + money(l.total))); });
    var cn = document.getElementById("confirm-notices"); cn.innerHTML = ""; (notes || []).forEach(function (m) { cn.appendChild(el("p", { class: "stock-note" }, m)); }); cn.hidden = !(notes && notes.length);
    var ct = document.getElementById("confirm-total"); ct.textContent = "Total: " + money(total) + " ";
    ct.appendChild(el("small", { class: "tax-note" }, "Taxes included"));
    saveLastOrder(ls, orderId, total);
    document.getElementById("last-order-link").hidden = true; form.reset(); closeCheckout();
    cart = {}; save(); update();
    openConfirm();
  }
  function mailtoHref(ls, f) {
    var body = "Name: " + f.name + "\nPickup: " + PICKUP + "\nPayment: " + v("payment") + "\nRef: " + f.name + "\nEmail: " + f.email + "\nPhone: " + f.phone + "\n\n" + ls.map(function (l) { return l.q + " x " + l.p.name + " (" + l.z.label + ") $" + l.z.price; }).join("\n") +
      "\n\nNotes: " + f.notes;
    return "mailto:" + ORDER_EMAIL + "?subject=" + encodeURIComponent("Plant order from " + f.name) + "&body=" + encodeURIComponent(body);
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault(); serr.style.display = "none";
    var ls = update(), ok = true, f = { name: v("name"), email: v("email"), phone: v("phone"), notes: v("notes") };
    ok = fieldErr("name", f.name ? "" : "Please enter your name.") && ok;
    ok = fieldErr("email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) ? "" : "Please enter a valid email so we can confirm pickup.") && ok;
    ok = fieldErr("phone", !f.phone || f.phone.replace(/\D/g, "").length >= 10 ? "" : "Please enter a 10-digit phone number or leave it blank.") && ok;
    if (!ls.length) { document.getElementById("qty-error").style.display = "block"; ok = false; }
    if (!ok) { (form.querySelector("[aria-invalid=true]") || document.getElementById("review")).focus(); return; }
    btn.disabled = true; btn.textContent = "Sending…";
    var payload = { name: f.name, email: f.email, phone: f.phone, notes: f.notes, pickup: PICKUP, payment: v("payment"), items: ls.map(function (l) { return { plant: l.p.fullName, sizeKey: l.z.key, qty: l.q }; }) };
    var sub = ls.reduce(function (a, l) { return a + l.total; }, 0);
    fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) })   // text/plain = no CORS preflight
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (r) {
        btn.disabled = false; btn.textContent = "Place order";
        if (r.ok) return showConfirm(ls, r.orderId, r.total != null ? r.total : sub, IENNStock.notices(r));
        serr.innerHTML = ""; serr.appendChild(document.createTextNode(r.message || "Sorry, something went wrong. Please try again."));
        if (r.error === "stock") {   // order NOT placed: keep the tray as is so they can adjust; messages are text only
          var pm = IENNStock.problems(r); if (pm.length) { var ul = el("ul", { class: "stock-problems" }); pm.forEach(function (m) { ul.appendChild(el("li", {}, m)); }); serr.appendChild(ul); }
        }
        serr.style.display = "block"; serr.scrollIntoView({ block: "nearest" }); document.getElementById("review").focus({ preventScroll: true });
      })
      .catch(function () {   // order NOT placed: keep the cart, offer call/text and email
        btn.disabled = false; btn.textContent = "Place order";
        serr.innerHTML = ""; serr.appendChild(document.createTextNode("We couldn't send your order just now. Your cart is saved. Please try again, or call or text Andrew: "));
        serr.appendChild(el("a", { class: "contact-tel", href: "tel:" + CONTACT_TEL }, CONTACT_PHONE)); serr.appendChild(document.createTextNode(" · "));
        serr.appendChild(el("a", { class: "contact-sms", href: "sms:" + CONTACT_TEL + "?&body=" + encodeURIComponent("Plant order: " + ls.map(function (l) { return l.q + " x " + l.p.name + " (" + l.z.label + ")"; }).join(", ")) }, "Text your order"));
        serr.appendChild(document.createTextNode(" · ")); serr.appendChild(el("a", { class: "contact-mail", href: mailtoHref(ls, f) }, "Email your order"));
        serr.style.display = "block";
      });
  });
  /* Last order (this tab only): plants, sizes, quantities, order id. No address, no stock counts. */
  var LAST = "ienn-last-order";
  function saveLastOrder(ls, orderId, total) { try { sessionStorage.setItem(LAST, JSON.stringify({ orderId: orderId || "", total: total, items: ls.map(function (l) { return { name: l.p.name, size: l.z.label, qty: l.q, total: l.total }; }) })); } catch (e) {} }
  function lastOrder() { try { return JSON.parse(sessionStorage.getItem(LAST)); } catch (e) { return null; } }
  function showLastOrder() {
    var o = lastOrder(); if (!o) return;
    document.getElementById("confirm-id").textContent = o.orderId ? "Order number: " + o.orderId : "";
    var cl = document.getElementById("confirm-list"); cl.innerHTML = "";
    o.items.forEach(function (x) { cl.appendChild(el("li", {}, x.qty + " \u00d7 " + x.name + " (" + x.size + ") \u2014 " + money(x.total))); });
    document.getElementById("confirm-notices").hidden = true;
    var ct = document.getElementById("confirm-total"); ct.textContent = "Total: " + money(o.total) + " "; ct.appendChild(el("small", { class: "tax-note" }, "Taxes included"));
    document.getElementById("last-order-link").hidden = true;
    openConfirm();
  }
  /* Thank-you modal: overlay + dialog card. Closes on ×, Esc, click outside, or Back to plants. Focus stays inside while open. */
  var tyPrev = null;
  function openConfirm() {
    var ov = document.getElementById("confirm-overlay"), c = document.getElementById("confirm");
    tyPrev = document.activeElement; ov.hidden = false; c.hidden = false; c.scrollTop = 0;
    document.documentElement.classList.add("ty-open");
    setTimeout(function () { c.focus({ preventScroll: true }); }, 30);
  }
  function closeConfirm() {
    var ov = document.getElementById("confirm-overlay"); if (ov.hidden) return;
    form.reset(); ov.hidden = true; document.getElementById("confirm").hidden = true;
    document.documentElement.classList.remove("ty-open");
    document.getElementById("last-order-link").hidden = !lastOrder(); update();
    var pl = document.getElementById("plant-list"); if (pl) pl.scrollIntoView({ behavior: "smooth", block: "start" });
    if (tyPrev && tyPrev.focus && document.contains(tyPrev) && tyPrev !== document.body) tyPrev.focus({ preventScroll: true });
  }
  document.getElementById("confirm-close").addEventListener("click", closeConfirm);
  document.getElementById("confirm-overlay").addEventListener("click", function (e) { if (e.target === this) closeConfirm(); });
  document.addEventListener("keydown", function (e) {
    var ov = document.getElementById("confirm-overlay"); if (ov.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeConfirm(); return; }
    if (e.key === "Tab") {
      var f = [].filter.call(document.getElementById("confirm").querySelectorAll("button,a[href]"), function (x) { return x.offsetParent !== null; });
      if (!f.length) return; var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement.id === "confirm")) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.getElementById("back-to-plants").addEventListener("click", closeConfirm);
  document.getElementById("view-order").addEventListener("click", showLastOrder);
  document.getElementById("view-order-2").addEventListener("click", showLastOrder);
  document.getElementById("last-order-link").hidden = !lastOrder();
  /* Preview for review/screenshots: order.html?confirm=preview shows the thank-you modal with EXAMPLE data (nothing saved or sent). */
  if (/[?&]confirm=preview\b/.test(location.search)) setTimeout(function () {
    document.getElementById("confirm-id").textContent = "Order number: INV-EXAMPLE";
    var cl = document.getElementById("confirm-list"); cl.innerHTML = "";
    var ex = [], tot = 0; /* real catalog names/prices from the loaded list; no made-up prices */
    PLANTS.some(function (p) { var z = (p.sizes || []).filter(function (z) { return isFinite(z.price) && ASK_KEYS.indexOf(z.key) < 0; })[0]; if (z) ex.push([ex.length ? 1 : 2, p.name, z.label, z.price]); return ex.length >= 2; });
    ex.forEach(function (x) { tot += x[0] * x[3]; cl.appendChild(el("li", {}, x[0] + " \u00d7 " + x[1] + " (" + x[2] + ") \u2014 " + money(x[0] * x[3]))); });
    document.getElementById("confirm-notices").hidden = true;
    var ct = document.getElementById("confirm-total"); ct.textContent = "Total: " + money(tot) + " "; ct.appendChild(el("small", { class: "tax-note" }, "Taxes included"));
    openConfirm();
  }, 1200);


  })();

  /* Badges: a manual `badge` string from the feed (sheet "Badge" column) always wins. Otherwise, only when the feed carries real
     sales data: top plant = "#1 Selling", next 3 = "Popular". Only numeric `popularity` > 0 counts; `rank` is never used. Never invented. One per card. */
  function autoBadges(raw) {
    var num = function (v) { return v != null && v !== "" && isFinite(Number(v)) ? Number(v) : null; }, out = {}, order;
    var pop = raw.filter(function (p) { return num(p.popularity) > 0; });
    order = pop.slice().sort(function (a, b) { return num(b.popularity) - num(a.popularity); });
    order.slice(0, 4).forEach(function (p, i) { out[p.name] = i === 0 ? "top" : "pop"; });
    return out;
  }
  function fromInventory(d) {
    var ab = autoBadges(d.plants || []);
    return (d.plants || []).map(function (p) {
      return { id: slug(p.name), name: p.name, fullName: p.fullName || p.name, botanical: p.botanical || "", badge: p.badge && String(p.badge).trim() ? String(p.badge).trim().slice(0, 24) : ab[p.name] === "top" ? "#1 Selling" : ab[p.name] === "pop" ? "Popular" : "", badgeAuto: p.badge && String(p.badge).trim() ? "" : ab[p.name] || "", rank: p.rank, pinned: p.pinned, image: p.image || (typeof ienPhoto === "function" && ienPhoto(p.name) || {}).src || "", srcset: p.image ? "" : (typeof ienPhoto === "function" && ienPhoto(p.name) || {}).srcset || "",
        sizes: (p.sizes || []).map(function (z) { return { key: z.key, label: z.size || SIZE_LABELS[z.key] || z.key, price: isFinite(Number(z.price)) && z.price !== "" && z.price != null ? Number(z.price) : PRICES[z.key], qty: z.qty == null ? null : Number(z.qty), extra: z.extra == null ? null : Number(z.extra), canRequest: z.canRequest == null ? null : z.canRequest === true }; }) };
    });
  }
  function fallback() {
    return FALLBACK_PLANTS.map(function (p) { var nb = split(p.name);
      return { id: slug(nb[0]), name: nb[0], fullName: p.name, botanical: nb[1], image: (typeof ienPhoto === "function" && ienPhoto(nb[0]) || {}).src || "", srcset: (typeof ienPhoto === "function" && ienPhoto(nb[0]) || {}).srcset || "", sizes: p.sizes.map(function (k) { return { key: k, label: SIZE_LABELS[k], price: PRICES[k], qty: null }; }) }; });
  }
  var params = new URLSearchParams(location.search), prefilled = false;
  function prefill() { // home-page cart link: order.html?white-sage=2 or ?white-sage|1%20gal=1 (slug or slug|size)
    if (prefilled) return; prefilled = true;
    params.forEach(function (v, k) {
      var parts = k.split("|"), p = PLANTS.find(function (x) { return x.id === parts[0] || x.id.indexOf(parts[0] + "-") === 0 || parts[0].indexOf(x.id) === 0; }), q = parseInt(v, 10);
      if (!p || !(q > 0)) return;
      var z = (parts[1] && p.sizes.find(function (s) { return s.key === parts[1] || s.label === parts[1]; })) || p.sizes.find(canAdd);
      if (canAdd(z)) cart[p.id + "|" + z.key] = Math.min(q, IENNStock.maxQty(z));
    });
    save();
  }
  function use(l, msg, d, quick) { PLANTS = sortPlants(IENNStock.view(l, IENNStock.hasBaseline(d, l))); if (!quick) prefill(); render(); if (quick) return; status.textContent = msg || ""; status.hidden = !msg;
    if (params.get("checkout") === "1" && !autoOpened && lines().length) { autoOpened = true; if (window.iennOpenCheckout) window.iennOpenCheckout(); } }
  var autoOpened = false;
  function load() {
    fetch(APPS_SCRIPT_URL + "?view=inventory", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (t) {
      var d = JSON.parse(t), l = fromInventory(d); if (!l.length) throw 0; if (window.iennPromo) window.iennPromo(d.promo);
      try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      use(l, "", d);
    }).catch(function () {
      var c = null; try { c = JSON.parse(localStorage.getItem(CACHE)); } catch (e) {}
      if (c && c.d) use(fromInventory(c.d), "Couldn't refresh live stock — showing the list from " + new Date(c.t).toLocaleString() + ". Stock may be out of date.", c.d);
      else use(fallback(), "Live stock is unavailable right now — showing our offline plant list. Stock may be out of date; we'll confirm availability.");
    });
  }
  for (var i = 0; i < 4; i++) list.appendChild(el("div", { class: "card skel", "aria-hidden": "true" }));
  // Instant first paint: last cached feed, else the built-in list; the live feed then refreshes quietly.
  (function () { var c = null; try { c = JSON.parse(localStorage.getItem(CACHE)); } catch (e) {}
    try { if (c && c.d && fromInventory(c.d).length) use(fromInventory(c.d), "", c.d, true); else use(fallback(), "", null, true); } catch (e) {} })();
  load();
  setInterval(load, REFRESH_MINUTES * 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) load(); });
})();
