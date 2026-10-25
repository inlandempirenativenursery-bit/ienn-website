/* "Starter packs coming soon" teaser (index.html only): a big juicy honey button floating upper-center, below the header.
   Shows after STARTER_TEASER_DELAY_MS (shop-settings.js), once per visitor. Waits while the checkout drawer, promo or a dialog is open.
   Tap/click anywhere on it, or press Escape, to dismiss. ?teaser=now shows it right away (ignores the seen flag).
   No email capture, prices or pack names. */
(function () {
  var KEY = "ienn-starter-teaser-seen", now = /[?&]teaser=now\b/.test(location.search);
  function seen() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function mark() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  if (!now && seen()) return;
  var delay = now ? 0 : (typeof STARTER_TEASER_DELAY_MS === "number" ? STARTER_TEASER_DELAY_MS : 60000);
  function busy() { return document.body.classList.contains("drawer-open") || document.querySelector(".ienn-promo, .confirm-modal:not([hidden]), #checkout:not([hidden])"); }
  function show() {
    if (busy()) { setTimeout(show, 1000); return; }   // wait until the drawer / pop-up is closed
    var hd = document.querySelector("header"), top = hd ? Math.max(0, Math.round(hd.getBoundingClientRect().bottom)) : 0;
    var b = document.createElement("button"); b.type = "button"; b.className = "starter-teaser";
    b.setAttribute("aria-label", "Starter packs coming soon. Plants grouped to grow well together and fill in fast. Tap to dismiss");
    b.style.top = (top + 18) + "px";
    b.innerHTML = '<span class="st-title" aria-hidden="true">Starter packs coming soon</span><span class="st-sub" aria-hidden="true">Plants grouped to grow well together and fill in fast.</span>';
    document.body.appendChild(b); mark();
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add("in"); }); });
    var gone = false;
    function dismiss() { if (gone) return; gone = true; mark(); document.removeEventListener("keydown", onKey);
      b.classList.remove("in"); b.classList.add("out"); setTimeout(function () { b.remove(); }, 350); }
    function onKey(e) { if (e.key === "Escape" || e.key === "Esc") dismiss(); }
    b.addEventListener("click", dismiss); document.addEventListener("keydown", onKey);
  }
  function start() { setTimeout(show, delay); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
