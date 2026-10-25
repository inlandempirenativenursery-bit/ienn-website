/* "Starter packs coming soon" teaser (index.html only): a big juicy 3-D button centered in the viewport.
   Shows after STARTER_TEASER_DELAY_MS (shop-settings.js), once per visitor; color from STARTER_TEASER_COLOR ("honey" | "lilac" | "sage" | "red").
   Waits while the checkout drawer, promo or a dialog is open. Press anywhere on it: it sinks (~120ms), then shrinks/fades away. Escape also dismisses.
   Preview: ?teaser=now (ignores the seen flag), optional &teasercolor=lilac. No email capture, prices or pack names. */
(function () {
  var KEY = "ienn-starter-teaser-seen", q = location.search, now = /[?&]teaser=now\b/.test(q);
  var COLORS = ["honey", "lilac", "sage", "red"], m = /[?&]teasercolor=([a-z]+)/.exec(q);
  var color = (m && COLORS.indexOf(m[1]) >= 0) ? m[1] : (typeof STARTER_TEASER_COLOR === "string" && COLORS.indexOf(STARTER_TEASER_COLOR) >= 0 ? STARTER_TEASER_COLOR : "honey");
  function seen() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function mark() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }
  if (!now && seen()) return;
  var delay = now ? 0 : (typeof STARTER_TEASER_DELAY_MS === "number" ? STARTER_TEASER_DELAY_MS : 60000);
  function busy() { return document.body.classList.contains("drawer-open") || document.querySelector(".ienn-promo, .confirm-modal:not([hidden]), #checkout:not([hidden])"); }
  function show() {
    if (busy()) { setTimeout(show, 1000); return; }   // wait until the drawer / pop-up is closed
    var b = document.createElement("button"); b.type = "button"; b.className = "starter-teaser st-" + color;
    b.setAttribute("aria-label", "Starter packs coming soon. Plants grouped to grow well together and fill in fast. Tap to dismiss");
    b.innerHTML = '<span class="st-title" aria-hidden="true">Starter packs coming soon</span><span class="st-sub" aria-hidden="true">Plants grouped to grow well together and fill in fast.</span>';
    document.body.appendChild(b); mark();
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add("in"); }); });
    var gone = false;
    function out() { b.classList.remove("in", "pressed"); b.classList.add("out"); setTimeout(function () { b.remove(); }, 320); }
    function dismiss(press) { if (gone) return; gone = true; mark(); document.removeEventListener("keydown", onKey);
      if (press) { b.classList.add("pressed"); setTimeout(out, 120); } else out(); }   // let the sink read, then shrink/fade
    function onKey(e) { if (e.key === "Escape" || e.key === "Esc") dismiss(false); }
    b.addEventListener("pointerdown", function () { if (!gone) b.classList.add("pressed"); });
    b.addEventListener("pointerleave", function () { if (!gone) b.classList.remove("pressed"); });
    b.addEventListener("pointercancel", function () { if (!gone) b.classList.remove("pressed"); });
    b.addEventListener("pointerup", function () { dismiss(true); });   // dismiss on release (mouse, pen, touch)
    // touch: cancel the follow-up synthetic click so the tap never "falls through" to the plant grid underneath once the teaser fades
    b.addEventListener("touchend", function (e) { if (e.cancelable) e.preventDefault(); dismiss(true); }, { passive: false });
    b.addEventListener("click", function () { dismiss(true); });   // keyboard Enter/Space (and any click that still arrives)
    document.addEventListener("keydown", onKey);
  }
  function start() { setTimeout(show, delay); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
