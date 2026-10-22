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
      var bx = typeof iennBasics === "function" && iennBasics(p.botanical);

      /* With a stock baseline, a size is available only if qty > 0 or canRequest; show only those. No available size => "Coming soon". */
      var sizes = BASELINE ? p.sizes.filter(function (z) { return z.qty > 0 || IENNStock.canReq(z); }) : p.sizes;
      if (BASELINE && !sizes.length) { card.classList.add("coming-soon"); b.appendChild(el("span", { class: "soon-pill" }, "Coming soon")); card.appendChild(b); return withBasics(card, p, bx); }
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
      card.appendChild(b); return withBasics(card, p, bx);
  }
  /* Plant basics: swipe right-to-left (or tap "Plant basics ›") to a second panel. Data: data/plant-basics.js. */
  var SVGNS = "http://www.w3.org/2000/svg";
  function svg(w, h, inner, cls) { var s = document.createElementNS(SVGNS, "svg"); s.setAttribute("viewBox", "0 0 " + w + " " + h); s.setAttribute("aria-hidden", "true"); if (cls) s.setAttribute("class", cls); s.innerHTML = inner; return s; }
  /* Universal, conventional-color icon set (24 grid) */
  var ICON = {
    drop: '<path fill="#2f86d6" d="M12 2.5C8.8 7.6 5.5 10.7 5.5 15a6.5 6.5 0 0 0 13 0c0-4.3-3.3-7.4-6.5-12.5z"/><path fill="#fff" opacity=".6" d="M9.2 14.2c0-1.4.8-2.7 1.6-3.6.3 1.4-.2 3.2-1.6 3.6z"/>',
    full: '<g fill="#f59e0b"><path d="M12 .8l1.8 3.6h-3.6zM12 23.2l-1.8-3.6h3.6zM.8 12l3.6-1.8v3.6zM23.2 12l-3.6 1.8v-3.6zM4.1 4.1l3.8 1.3-2.5 2.5zM19.9 19.9L16 18.6l2.5-2.5zM4.1 19.9l1.3-3.8 2.5 2.5zM19.9 4.1l-1.3 3.8-2.5-2.5z"/></g><circle cx="12" cy="12" r="5.6" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.2"/>',
    part: '<g fill="#f59e0b"><path d="M10 1l1.6 3.2H8.4zM1 10l3.2-1.6v3.2zM3.6 3.6l3.4 1.1-2.3 2.3zM16.4 3.6l-1.1 3.4-2.3-2.3z"/></g><circle cx="10" cy="10" r="4.8" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.1"/><path fill="#fff" stroke="#94a3b8" stroke-width="1.4" d="M8 21a3.8 3.8 0 0 1 .3-7.6 5.2 5.2 0 0 1 9.8 1.3 3.2 3.2 0 0 1-.4 6.3z"/>',
    shade: '<path fill="#94a3b8" d="M6.5 19.5a4.5 4.5 0 0 1 .4-9 6.2 6.2 0 0 1 11.7 1.6 3.8 3.8 0 0 1-.5 7.4z"/><path fill="#cbd5e1" d="M9 12.5a4 4 0 0 1 7.4-1.4 5 5 0 0 0-7.4 1.4z"/>',
    soil: '<path fill="#16a34a" d="M12 12V7c-1.3-3-5-3.3-6.5-2 1.5 2.8 4.2 3.5 6.5 2zm0-2.5c1.3-3 5-3.3 6.5-2-1.5 2.8-4.2 3.5-6.5 2z"/><path stroke="#15803d" stroke-width="1.6" d="M12 13V6.5"/><path fill="#92400e" d="M2 13.5h20v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/><g fill="#b45309"><circle cx="6" cy="17" r="1.2"/><circle cx="11" cy="18.5" r="1"/><circle cx="16.5" cy="16.5" r="1.3"/><circle cx="19" cy="19.3" r=".9"/></g>',
    pollinators: '<path fill="#f97316" stroke="#111" stroke-width="1.3" stroke-linejoin="round" d="M11.3 10.8C9.6 5.4 4 3.6 2.4 5.6c-1.3 1.8.4 5.6 3.4 6.4 2 .5 4 .1 5.5-1.2zM12.7 10.8C14.4 5.4 20 3.6 21.6 5.6c1.3 1.8-.4 5.6-3.4 6.4-2 .5-4 .1-5.5-1.2z"/><path fill="#fb923c" stroke="#111" stroke-width="1.3" stroke-linejoin="round" d="M11.3 12.2c-3.6.6-6.4 3.4-5.6 5.8.7 1.9 4 1.5 5.6-1.6zM12.7 12.2c3.6.6 6.4 3.4 5.6 5.8-.7 1.9-4 1.5-5.6-1.6z"/><path fill="none" stroke="#111" stroke-width=".8" d="M11 9.6L5 6.5M10.8 10.4L4 10M11 12.8l-4 3.2M13 9.6l6-3.1M13.2 10.4L20 10M13 12.8l4 3.2"/><g fill="#fff"><circle cx="3.4" cy="6.6" r=".55"/><circle cx="3.9" cy="9.4" r=".55"/><circle cx="20.6" cy="6.6" r=".55"/><circle cx="20.1" cy="9.4" r=".55"/><circle cx="6.6" cy="17.8" r=".5"/><circle cx="17.4" cy="17.8" r=".5"/></g><rect x="11.1" y="7" width="1.8" height="11" rx=".9" fill="#111"/><path fill="none" stroke="#111" stroke-width="1.1" stroke-linecap="round" d="M11.6 7.4L10 3.8M12.4 7.4L14 3.8"/>',
    hummingbirds: '<path fill="#15803d" d="M8.5 14.8C8 10 10.6 7 13.6 6.7l1.6 6.2c-1.4 2.8-3.8 4.8-6.7 5.4z"/><path fill="#22c55e" d="M9.6 13.2L2 6.6c3.6-.5 6.7.8 8.8 3.4z"/><path fill="#16a34a" d="M8.6 18.2l-2.2 3.8 3.3-2.5z"/><path fill="#db2777" d="M13.4 6.6c2.4-.5 4.3 1 4.4 3.1.1 2.1-1.2 3.8-3 4.6l-1.9.4z"/><path fill="#f472b6" d="M15.6 8.1c1 .2 1.6 1 1.6 1.8-.6-.3-1.3-.5-2.1-.4z"/><path stroke="#1f2937" stroke-width="1.5" stroke-linecap="round" d="M17.6 9.2l5-1.4"/><circle cx="15.6" cy="8.9" r=".75" fill="#111"/><path fill="#f5f5f4" d="M9.2 14.6c1.4.4 2.6.1 3.6-.6l.2 1.7c-1.4.8-2.8 1-4.1.6z"/>',
    birds: '<path fill="#1d4ed8" d="M3 19.5l5.6-5.2 1.6 1.8z"/><path fill="#9ca3af" d="M7.5 15.5c.5-4 3.8-6.6 7.6-6.2l1 7c-2.3 2-5.6 2.4-8.6-.8z"/><path fill="#f1f5f9" d="M9.5 16.2c2.6 1.4 5.2 1.2 7-.4l.2 1.4c-2 2.2-5.4 2.2-7.2-1z"/><path fill="#2563eb" d="M14.2 9.4c.2-2.8 2.4-4.6 4.8-4.2 1.4.3 2.2 1.4 2.2 2.6l-2 1.3c-.2 1.8-1.2 3.4-2.8 4.3z"/><path fill="#3b82f6" d="M8.2 13.6c2-2.6 5.6-3 8-1.2-1.5 2.6-5 3.6-8 1.2z"/><path fill="none" stroke="#2563eb" stroke-width="1" d="M14.8 12.6c.9.3 1.8.1 2.4-.6"/><path fill="#111" d="M21 7.6l2.4.5-2.3.9z"/><circle cx="18.8" cy="7.2" r=".7" fill="#111"/><path fill="#f8fafc" d="M17.8 8.3c.8.3 1.8.2 2.4-.3l-.4 1c-.6.3-1.4.2-2-.2z"/><path fill="none" stroke="#57534e" stroke-width="1.1" stroke-linecap="round" d="M12 17.8l-.5 2.8M13.8 17.8l.3 2.8"/>',
    fragrant: '<g fill="#ec4899"><circle cx="12" cy="14" r="2.8"/><circle cx="12" cy="20" r="2.8"/><circle cx="9" cy="17" r="2.8"/><circle cx="15" cy="17" r="2.8"/></g><circle cx="12" cy="17" r="1.8" fill="#fbbf24"/><path fill="none" stroke="#a855f7" stroke-width="1.6" stroke-linecap="round" d="M7 10c-1.3-1.6 1.3-2.4 0-4.5M12 9.5c-1.3-1.6 1.3-2.6 0-6M17 10c-1.3-1.6 1.3-2.4 0-4.5"/>',
    containers: '<path fill="#c2410c" d="M5 11.5h14l-1.8 9.2a1.5 1.5 0 0 1-1.5 1.3H8.3a1.5 1.5 0 0 1-1.5-1.3z"/><rect x="4" y="9.8" width="16" height="3.2" rx="1.2" fill="#9a3412"/><path fill="#16a34a" d="M12 9.8V5.5c-1.2-2.6-4.5-3-6-1.8 1.4 2.4 3.8 3.2 6 1.8M12 7c1.2-2.6 4.5-3 6-1.8-1.4 2.4-3.8 3.2-6 1.8"/>',
    bloom: '<g fill="#a78bfa"><circle cx="12" cy="6.5" r="3.8"/><circle cx="17.4" cy="10.4" r="3.8"/><circle cx="15.3" cy="16.8" r="3.8"/><circle cx="8.7" cy="16.8" r="3.8"/><circle cx="6.6" cy="10.4" r="3.8"/></g><circle cx="12" cy="12" r="2.9" fill="#fbbf24"/>',
    heat: '<path fill="#fff" stroke="#374151" stroke-width="1.4" d="M9.8 4.5a2.2 2.2 0 0 1 4.4 0v9a4.3 4.3 0 1 1-4.4 0z"/><circle cx="12" cy="17.2" r="2.6" fill="#dc2626"/><rect x="11" y="7" width="2" height="9" rx="1" fill="#dc2626"/>'
  };
  var SUNL = { full: "Full sun", part: "Part sun", shade: "Shade" }, WATL = ["", "Low water", "Moderate water", "Regular water"];
  var SOILL = { "Fast-draining": "Fast-draining", "Clay-tolerant": "Clay OK", "Adaptable": "Any soil" };
  var SEAS = [["W", "Win", "Winter"], ["Sp", "Spr", "Spring"], ["Su", "Sum", "Summer"], ["F", "Fall", "Fall"]];
  var WILDL = { pollinators: "Bees & butterflies", hummingbirds: "Hummingbirds", birds: "Birds", fragrant: "Fragrant", containers: "Pot-friendly", heat: "Heat tough" };
  function ft(a) { return (a[0] === a[1] ? a[0] : a[0] + "\u2013" + a[1]) + " ft"; }
  function icon(name, label, off) { var s = svg(24, 24, ICON[name], "bi" + (off ? " off" : "")); if (label) { s.setAttribute("role", "img"); s.removeAttribute("aria-hidden"); s.setAttribute("aria-label", label); var t = document.createElementNS(SVGNS, "title"); t.textContent = label; s.insertBefore(t, s.firstChild); } return s; }
  /* Generic solid silhouettes by life form, one green; drawn in a box gw wide x gh tall sitting on the ground line. */
  function plantShape(x, cx, base, gw, gh) {
    var G = "#4d7c55", r = gw / 2, f = x.shape || x.form || "Shrub", P = function (d) { return '<path fill="' + G + '" d="' + d + '"/>'; }, L = function (d, w) { return '<path fill="none" stroke="' + G + '" stroke-width="' + (w || 1.4) + '" stroke-linecap="round" d="' + d + '"/>'; }, top = base - gh, o = "";
    if (false) return '<rect x="' + (cx - 1.2) + '" y="' + (base - gh * .1) + '" width="2.4" height="' + (gh * .1) + '" fill="' + G + '"/>' + P("M" + cx + " " + top + "C" + (cx + r * .35) + " " + (top + gh * .3) + " " + (cx + r * .55) + " " + (base - gh * .35) + " " + (cx + r * .4) + " " + (base - gh * .1) + "H" + (cx - r * .4) + "C" + (cx - r * .55) + " " + (base - gh * .35) + " " + (cx - r * .35) + " " + (top + gh * .3) + " " + cx + " " + top + "z");
    if (f === "Tree" || f === "Small tree") { var cw = Math.max(gw, gh * 1.5) / 2, ch = gh * .62, ctop = top, cb = ctop + ch, tk = Math.max(2.4, cw * .12);   // coast-live-oak: short trunk, branching, broad lumpy canopy
      o += P("M" + (cx - tk) + " " + base + "L" + (cx - tk * .7) + " " + (cb - ch * .05) + "L" + (cx - cw * .55) + " " + (cb - ch * .25) + "L" + (cx - cw * .5) + " " + (cb - ch * .15) + "L" + (cx - tk * .2) + " " + (cb + ch * .1) + "L" + (cx + tk * .2) + " " + (cb + ch * .1) + "L" + (cx + cw * .5) + " " + (cb - ch * .15) + "L" + (cx + cw * .55) + " " + (cb - ch * .25) + "L" + (cx + tk * .7) + " " + (cb - ch * .05) + "L" + (cx + tk) + " " + base + "z");
      [[-.62, .62, .4, .38], [.62, .62, .4, .38], [-.3, .4, .45, .45], [.3, .38, .45, .45], [0, .3, .4, .42], [-.85, .72, .2, .25], [.85, .72, .2, .25], [0, .65, .7, .3]].forEach(function (l) { o += '<ellipse cx="' + (cx + l[0] * cw) + '" cy="' + (ctop + l[1] * ch) + '" rx="' + (l[2] * cw) + '" ry="' + (l[3] * ch) + '" fill="' + G + '"/>'; });
      return o; }
    if (f === "Grass") { for (var i = -4; i <= 4; i++) { var tx = cx + i * r * .26, ty = top + Math.abs(i) * gh * .1 + gh * .05; o += L("M" + (cx + i * .6) + " " + base + "Q" + (cx + i * r * .1) + " " + (base - gh * .6) + " " + tx + " " + ty, 2.2); }
      [-.45, .05, .5].forEach(function (k) { var sx = cx + k * r * .8; o += L("M" + cx + " " + base + "Q" + sx + " " + (base - gh * .5) + " " + (sx + k * 2) + " " + (top - 1), .8) + '<ellipse cx="' + (sx + k * 2) + '" cy="' + top + '" rx="1.1" ry="2.4" fill="' + G + '"/>'; });
      return P("M" + (cx - r * .3) + " " + base + "Q" + cx + " " + (base - gh * .3) + " " + (cx + r * .3) + " " + base + "z") + o; }
    if (f === "Vine") { var vh = gh * .85, vt = base - vh, vw = Math.max(30, Math.min(gw, vh * .9)), pp = cx;   // simplified leafy vine on a post (not strictly to scale)
      o += '<rect x="' + (pp - 1.3) + '" y="' + (vt - 2) + '" width="2.6" height="' + (vh + 2) + '" fill="#a8a29e"/><rect x="' + (pp - vw * .45) + '" y="' + (vt + vh * .12) + '" width="' + (vw * .9) + '" height="1.6" fill="#a8a29e"/>';
      for (var q = 0; q < 7; q++) { var ly = base - vh * (q + .6) / 7.2, sx = (q % 2 ? 1 : -1), lw = vw * (.42 - q * .02); o += '<ellipse cx="' + (pp + sx * lw * .5) + '" cy="' + ly + '" rx="' + lw * .62 + '" ry="' + Math.max(2.8, vh * .11) + '" fill="' + G + '"/>'; }
      o += P("M" + (pp - vw * .3) + " " + base + "Q" + pp + " " + (base - vh * .35) + " " + (pp + vw * .3) + " " + base + "z");
      return o; }
    if (f === "Succulent") { for (var j = -5; j <= 5; j++) { var ang = j / 5 * 1.3, len = gh * .62 * (1 - Math.abs(j) * .05); o += P("M" + (cx - 2.2) + " " + base + "L" + (cx + Math.sin(ang) * Math.max(len, r * .9)) + " " + (base - Math.cos(ang) * len) + "L" + (cx + 2.2) + " " + base + "z"); }
      return o + L("M" + cx + " " + (base - gh * .3) + "V" + (top + gh * .2), 2) + P("M" + (cx - 2.4) + " " + (top + gh * .3) + "Q" + cx + " " + (top - 1) + " " + (cx + 2.4) + " " + (top + gh * .3) + "z"); }
    if (f === "Wildflower" || f === "Annual") { var fh = gh * .38;   // poppy: low feathery foliage, slender stems, open cups
      for (var m = -6; m <= 6; m++) { var ex = cx + m * r * .15, ey = base - fh * (1 - Math.abs(m) * .1); o += L("M" + (cx + m * .4) + " " + base + "Q" + (cx + m * r * .06) + " " + (base - fh * .5) + " " + ex + " " + ey, 1.4); }
      [[-.55, .78], [-.05, 1], [.5, .86]].forEach(function (q) { var fx = cx + q[0] * r, fy = base - gh * q[1] + gh * .14, cr = Math.max(2.6, gh * .13);
        o += L("M" + (cx + q[0] * r * .3) + " " + (base - fh * .6) + "Q" + (fx - q[0] * 2) + " " + (fy + gh * .3) + " " + fx + " " + (fy + cr * .3), 1);
        o += P("M" + (fx - cr) + " " + (fy - cr * .7) + "Q" + (fx - cr * .9) + " " + (fy + cr * .6) + " " + fx + " " + (fy + cr * .6) + "Q" + (fx + cr * .9) + " " + (fy + cr * .6) + " " + (fx + cr) + " " + (fy - cr * .7) + "Q" + (fx + cr * .5) + " " + (fy - cr * .1) + " " + fx + " " + (fy - cr * .55) + "Q" + (fx - cr * .5) + " " + (fy - cr * .1) + " " + (fx - cr) + " " + (fy - cr * .7) + "z"); });
      return o; }
    if (f === "Perennial") { var ch = gh * .5;
      o += P("M" + (cx - r) + " " + base + "Q" + (cx - r) + " " + (base - ch) + " " + (cx - r * .4) + " " + (base - ch) + "Q" + cx + " " + (base - ch * 1.3) + " " + (cx + r * .4) + " " + (base - ch) + "Q" + (cx + r) + " " + (base - ch) + " " + (cx + r) + " " + base + "z");
      [-.5, 0, .45].forEach(function (k, i) { var fx = cx + k * r, fy = top + (i === 1 ? 0 : gh * .12); o += L("M" + fx + " " + (base - ch * .8) + "V" + (fy + 2), 1) + '<circle cx="' + fx + '" cy="' + (fy + 2) + '" r="' + Math.max(1.6, gh * .07) + '" fill="' + G + '"/>'; });
      return o; }
    var sh = gh;   // Shrub / Sub-shrub: solid rounded mound
    return P("M" + (cx - r) + " " + base + "C" + (cx - r * 1.05) + " " + (base - sh * .75) + " " + (cx - r * .5) + " " + (base - sh) + " " + cx + " " + (base - sh) + "C" + (cx + r * .5) + " " + (base - sh) + " " + (cx + r * 1.05) + " " + (base - sh * .75) + " " + (cx + r) + " " + base + "z");
  }
  function sizeArt(x) {   // plant silhouette vs a 6' person, true scale per frame, auto-zoomed so the plant reads well
    var W = 96, H = 50, base = H - 1, room = H - 7, hmax = x.h[1];
    var sc = hmax <= 3 ? room * .9 / hmax : room / Math.max(6, hmax);   // small: zoom in (person cropped); mid: fit person; big: fit plant
    var ph = 6 * sc, gh = hmax * sc, gw = Math.min(60, Math.max(22, x.w[1] * sc * 1.1)), px = 4, cx = 24 + gw / 2, o = "";
    var hr = ph * .085, bw = ph * .1;
    o += '<g fill="#9ca3af"><circle cx="' + (px + 6) + '" cy="' + (base - ph + hr) + '" r="' + hr + '"/><path d="M' + (px + 6 - bw) + ' ' + base + 'V' + (base - ph * .5) + 'Q' + (px + 6 - bw * 1.2) + ' ' + (base - ph * .79) + ' ' + (px + 6) + ' ' + (base - ph * .8) + 'Q' + (px + 6 + bw * 1.2) + ' ' + (base - ph * .79) + ' ' + (px + 6 + bw) + ' ' + (base - ph * .5) + 'V' + base + 'z"/></g>';
    o += '<path d="M' + (px + 6) + ' ' + base + 'V' + (base - ph * .44) + '" stroke="#fff" stroke-width="' + Math.max(.6, bw * .25) + '"/>';
    o += plantShape(x, cx + 4, base, gw, gh);
    o += '<path d="M0 ' + base + 'H' + W + '" stroke="#d6d3d1" stroke-width="1.5"/>';
    return svg(W, H, o, "size-art");
  }
  function chip(iconEls, label, cls) { var c = el("span", { class: "fchip" + (cls ? " " + cls : "") }); var ic = el("span", { class: "fchip-i", "aria-hidden": "true" }); iconEls.forEach(function (n) { ic.appendChild(n); }); c.appendChild(ic); c.appendChild(el("span", { class: "fchip-t" }, label)); return c; }
  function basicsPane(p, x) {
    var pane = el("section", { class: "pane-basics", "aria-label": "Plant basics: " + p.name }), inn = el("div", { class: "basics-in" });
    var hd = el("div", { class: "basics-hd" }); var back = null;
    if (x.form) hd.appendChild(el("span", { class: "form-ribbon" }, x.form)); inn.appendChild(hd);
    var care = el("div", { class: "care" });
    var drops = []; for (var i = 1; i <= 3; i++) drops.push(icon("drop", null, i > x.water)); care.appendChild(chip(drops, WATL[x.water], "water"));
    care.appendChild(chip(x.sun.slice(0, 2).map(function (k) { return icon(k); }), x.sun.map(function (k) { return SUNL[k]; }).join(" / ").replace("Full sun / Part sun", "Sun / part sun"), "sun"));
    care.appendChild(chip([icon("soil")], SOILL[x.soil] || x.soil, "soil"));
    inn.appendChild(care);
    var bl = el("div", { class: "seasons", role: "img", "aria-label": "Blooms: " + (x.bloom.length ? SEAS.filter(function (q) { return x.bloom.indexOf(q[0]) >= 0; }).map(function (q) { return q[2]; }).join(", ") : "no showy flowers") });
    var bh = el("span", { class: "bloom-h", "aria-hidden": "true" }); bh.appendChild(icon("bloom")); bh.appendChild(el("span", { class: "fchip-t" }, "Blooms")); bl.appendChild(bh);
    var bs = el("span", { class: "bloom-s", "aria-hidden": "true" }); SEAS.forEach(function (q) { bs.appendChild(el("span", { class: "sp" + (x.bloom.indexOf(q[0]) >= 0 ? " on" : "") }, q[1])); }); bl.appendChild(bs); inn.appendChild(bl);
    var wl = el("div", { class: "feats" }); (x.wild || []).concat(x.ie ? ["heat"] : []).forEach(function (k) { wl.appendChild(chip([icon(k)], WILDL[k], "f-" + k)); }); inn.appendChild(wl);
    var sz = el("div", { class: "size", role: "img", "aria-label": "Mature size " + ft(x.h) + (x.form === "Vine" ? " long" : " tall") + ", " + ft(x.w) + " wide" }); sz.appendChild(sizeArt(x));
    var sv = el("span", { class: "size-v" }); sv.appendChild(el("b", {}, ft(x.h) + (x.form === "Vine" ? " long" : " tall"))); sv.appendChild(el("b", {}, ft(x.w) + " wide")); sz.appendChild(sv); inn.appendChild(sz);
    inn.appendChild(el("p", { class: "basics-fine" }, "Results vary by site"));
    var d2 = el("div", { class: "flip-dots", "aria-hidden": "true" }); d2.appendChild(el("i")); d2.appendChild(el("i", { class: "on" })); inn.appendChild(d2);
    pane.appendChild(inn);
    return { pane: pane };
  }
  var peeked = false; try { peeked = sessionStorage.getItem("ienn-peek") === "1"; } catch (e) {}
  function withBasics(card, p, x) {
    if (!x) return card;
    var track = el("div", { class: "card-track" }), front = el("div", { class: "pane-front" });
    while (card.firstChild) front.appendChild(card.firstChild);
    var bp = basicsPane(p, x), ph0 = front.querySelector(".ph");
    if (ph0 && x.form) ph0.appendChild(el("span", { class: "form-ribbon on-photo", "aria-hidden": "true" }, x.form));
    var d1 = el("div", { class: "flip-dots", "aria-hidden": "true" }); d1.appendChild(el("i", { class: "on" })); d1.appendChild(el("i"));
    if (ph0) ph0.after(d1);
    track.appendChild(front); track.appendChild(bp.pane); card.appendChild(track); card.classList.add("has-basics");
    function to(i) { track.scrollTo({ left: i ? track.scrollWidth : 0, behavior: "smooth" }); }
    function onBack() { return track.scrollLeft > track.clientWidth / 2; }
    if (ph0) { ph0.setAttribute("role", "button"); ph0.setAttribute("tabindex", "0"); ph0.setAttribute("aria-label", "Show plant basics for " + p.name); ph0.removeAttribute("aria-hidden"); ph0.classList.add("flippable");
      ph0.addEventListener("click", function (e) { if (e.target.closest("a")) return; to(1); });
      ph0.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); to(1); setTimeout(function () { bp.pane.focus({ preventScroll: true }); }, 350); } }); }
    bp.pane.setAttribute("tabindex", "0"); bp.pane.setAttribute("role", "button"); bp.pane.setAttribute("aria-label", "Plant basics for " + p.name + ". Press to flip back.");
    bp.pane.addEventListener("click", function () { to(0); });
    bp.pane.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); to(0); if (ph0) setTimeout(function () { ph0.focus({ preventScroll: true }); }, 350); } });
    var t = null; track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(function () { var on = onBack(); card.classList.toggle("showing-basics", on); front.setAttribute("aria-hidden", on ? "true" : "false"); bp.pane.setAttribute("aria-hidden", on ? "false" : "true"); }, 80); }, { passive: true });
    bp.pane.setAttribute("aria-hidden", "true");
    if (!peeked && card.querySelector(".add, .soon-pill")) { peeked = true; try { sessionStorage.setItem("ienn-peek", "1"); } catch (e) {}   // one gentle peek per session, first card only
      if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) setTimeout(function () { if (!card.isConnected) return; track.scrollTo({ left: 46, behavior: "smooth" }); setTimeout(function () { track.scrollTo({ left: 0, behavior: "smooth" }); }, 650); }, 1400); }
    return card;
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
  var lastSig = null;
  function use(l, msg, d, quick) { BASELINE = IENNStock.hasBaseline(d, l); PLANTS = sortPlants(IENNStock.view(l, IENNStock.hasBaseline(d, l))).map(function (p) { var dn = typeof iennDisplayName === "function" && iennDisplayName(p.name); if (dn && dn !== p.name) { p.feedName = p.feedName || p.name; p.name = dn; } return p; });   // display-name overrides; id/fullName keep the feed name for cart + orders if (!quick) prefill();
    var sig = JSON.stringify([BASELINE, PLANTS]); if (sig !== lastSig) { lastSig = sig; render(); } else update();   // same data: keep the grid as is if (quick) return; status.textContent = msg || ""; status.hidden = !msg;
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
