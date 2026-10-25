/* "Starter packs coming soon" teaser (index.html only). Slides down from under the header after
   STARTER_TEASER_DELAY_MS (shop-settings.js), once per visitor. Waits while the checkout drawer, promo or a dialog is open.
   ?teaser=now shows it right away (ignores the seen flag). No email capture, prices or pack names. */
(function () {
  var KEY = "ienn-starter-teaser-seen", now = /[?&]teaser=now\b/.test(location.search);
  function seen() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function mark() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  if (!now && seen()) return;
  var delay = now ? 0 : (typeof STARTER_TEASER_DELAY_MS === "number" ? STARTER_TEASER_DELAY_MS : 60000);
  function busy() { return document.body.classList.contains("drawer-open") || document.querySelector(".ienn-promo, .confirm-modal:not([hidden]), #checkout:not([hidden])"); }
  function show() {
    if (busy()) { setTimeout(show, 1000); return; }   // wait until the drawer / modal is closed
    var hd = document.querySelector("header"), top = hd ? Math.max(0, Math.round(hd.getBoundingClientRect().bottom)) : 0;
    var b = document.createElement("div"); b.className = "starter-teaser"; b.setAttribute("role", "status"); b.style.top = (top + 8) + "px";
    b.innerHTML = '<svg class="st-ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="#d4c4e0" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 20c-4 0-6.5-2.6-6.5-6.2 3.6 0 6.5 2.4 6.5 6.2zM12 20c4 0 6.5-2.6 6.5-6.2-3.6 0-6.5 2.4-6.5 6.2zM12 20V9"/><path fill="#f8f6f3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" d="M12 9c-2.2-1-3-3-2.6-5.2C11.6 4.3 12.6 6.3 12 9zM12 9c2.2-1 3-3 2.6-5.2C12.4 4.3 11.4 6.3 12 9z"/></svg>' +
      '<p><b>Starter packs coming soon</b> <span>Plants grouped to grow well together and fill in fast.</span></p>' +
      '<button type="button" class="st-x" aria-label="Close starter packs notice">\u00d7</button>';
    document.body.appendChild(b); mark();
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add("in"); }); });
    b.querySelector(".st-x").addEventListener("click", function () { mark(); b.classList.remove("in"); b.classList.add("out"); setTimeout(function () { b.remove(); }, 400); });
  }
  function start() { setTimeout(show, delay); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
