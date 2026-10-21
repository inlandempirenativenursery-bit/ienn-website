# Checkout drawer — Oct 20, 2026

All shots use the LIVE inventory feed. Order POSTs were blocked in the test, so no real order was sent.

| Shot | What it shows |
|---|---|
| tray-375.png / tray-1280.png | Sticky tray bar: item count, total, **Check out** |
| drawer-open-375.png / drawer-open-1280.png | Check out opens a full-height sheet on phones and a 440px side drawer on desktop. Tray items have −/+ and Remove, plus the total with "Taxes included" |
| drawer-filled-375.png / drawer-filled-1280.png | The short form right under the tray: Name, Email (with "We'll email your pickup confirmation"), Phone (optional, for text updates), pay-with (optional), Notes (optional), then **Place order** |

## Changes
- "Reserve" became "Check out" on the sticky bar, the step strip (Select → Check out → Pick up) and the home cart. The submit button says "Place order". Payment is still cash or Zelle at pickup.
- There's one form now, inside the drawer. The old pickup box and the separate bottom form were removed, and the pickup info is one line: "Pickup Saturdays 10–2 near Sierra & Baseline, Fontana · Cash or Zelle at pickup", plus the fine print. No street address. The pickup dropdown is gone (other times go in Notes).
- The drawer closes with the X, Esc, a tap outside (desktop) or a swipe down on its header (phone), and the tray stays intact. It has `role=dialog`, `aria-modal`, a focus trap and 44px targets.
- The home "Check out" link opens order.html with the drawer already open (`&checkout=1`).
- The contact email is plants@inlandempirenativenursery.com, shown as "Email us: plants@…" in the drawer, the confirmation, the privacy line and the order-page footer. The mailto fallback uses it too.
- The payload is unchanged: `{name, email, phone, notes, pickup, payment, items:[{plant: fullName, sizeKey, qty}]}`. This matches `iennWebsiteOrder_` (name and valid email required, at least one item; phone, notes, pickup and payment optional). **No Apps Script redeploy is needed.**

Tests: `tests/checkout-drawer.e2e.js` (live), `tests/order-polish.e2e.js` (mocked; includes a payload-shape check, Esc, the focus trap and tray qty edits), `tests/review-oct20.e2e.js`, `tests/photos.e2e.js`, `tests/stock-view.test.js` and `tests/apps-script.test.js` all pass.
