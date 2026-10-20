# TESTING: order page polish (`polish/order-page-mobile`)

Built on top of Kobe's `kobe/order-styling` (a58151d), so it includes that commit. **Merge Kobe's styling first** (or this PR
carries it). Kobe's styling stays as-is. The only additions are a few usability CSS rules (`.steps small`, `.lead`, `.nw`,
`.summary .rm` padding, `.ph .leaf`). No apps-script / stock-ledger files were touched.

## Fixes
1. Pickup box: "Saturdays 10 AM – 2 PM" appears once (Location now just "Fontana. We share the exact address after we confirm").
2. Confirmation: the form and submit button are hidden; the pickup ticket at the top gets focus, smooth-scrolls into view, and is `aria-live`;
   step 3 "Pick up" is highlighted. "Start a new order" restores the form and scrolls back to the steps.
3. Phone cart: size label and line total are `white-space:nowrap` (the plant name wraps instead); Remove has padding and is ≥44px.
4. No customer-visible [TODO] text. Privacy line: only used to fill your order, never sold, call/text Andrew to delete.
   "Photo coming soon" grey boxes replaced by a soft leaf placeholder (image slot kept: `p.image` shows a photo).
5. Sold-out fixes:
   - Price falls back to the size price list when the feed price is missing/blank/NaN (no "$NaN"/"$0").
   - Default size = first in-stock counted size (4"/1 gal), else first counted size; **never** an on-request size.
     (Robo's case: Woolly Blue Curls, 4" sold out → shows "4-inch pot · $6 · sold out", "Sold out" button; no "$3 each".)
   - Card badge uses counted sizes only, so a plant with every counted size at 0 reads "Sold out" (greyed), even if 2"/Tree pot are on request.
   - On-request sizes (2", Tree pot) are neutral "Ask us" chips: dashed, not struck through, not addable; tapping explains "add it in Notes".
   - The on-request note appears once above the cards, not on each card.
   - Offline/unknown stock on counted sizes is still orderable ("We'll confirm availability").
6. 3-step strip with one-line copy: 1 Select (Pick plants & sizes), 2 Reserve (Nothing charged online), 3 Pick up (Saturday in Fontana).
7. Slogan + light StoryBrand: lead line under the title (hero: yard full of bees/butterflies/hummingbirds; problem: local natives are hard to
   find; guide: we grow them in Fontana). Plan = the 3 steps. Success line + slogan in the footer.
8. HTML validity: phone numbers use non-breaking space/hyphen; removed two misused aria attributes; index logo now links to `index.html`.

## Click-through (order.html + index.html, mocked Apps Script)
| Element | Result |
|---|---|
| order: logo, ← Back | index.html ✅ |
| order: size chips | counted sizes select; sold-out disabled; "Ask us" shows the Notes hint ✅ |
| order: − / + / Add to order | qty changes; Add adds; disabled with "Sold out"/"Ask us" when not addable ✅ |
| order: Remove | removes line, total updates ✅ |
| order: sticky "Review order" | jumps to the tray (#review) ✅ |
| order: Submit (ok) | pickup ticket with order #, form hidden, focus on ticket ✅ |
| order: Submit (server error) | cart kept; tel / sms (pre-filled order) / mailto links ✅ |
| order: Start a new order | form back, ticket hidden ✅ |
| order: tel:/sms: links (pickup box, ticket, privacy, footer) | `tel:+19096099373` / `sms:+19096099373` ✅ |
| index: logo | was `#` (dead end) → `index.html` ✅ fixed |
| index: Place Order Now ×2, Reserve for pickup | order.html (200) ✅ |
| index: Add to cart → cart bar → Checkout | `order.html?white-sage|4"=1` prefill ✅; Clear hides bar ✅ |
| index: Printable plant list | opens Apps Script `?view=print` (public). Works after redeploy; consider hiding if it's team-only |
| index: call/text/email | tel/sms/mailto ✅ |
| Skip link | none on either page (not a dead end; could add) |
No other dead ends found.

## Mobile checklist (375×812)
- [x] No horizontal overflow; 0 console errors (375 and 1280)
- [x] All buttons and chips ≥40px tall (Kobe's chips are 40px; steppers/Add/Remove/cart button ≥44px)
- [x] Size → Add → Review order → Submit: 3 taps plus name/email
- [x] Sticky bar shows count + total; Review order jumps to the tray
- [x] Steps strip is one compact row; cards start right after it
- [x] Confirmation is the first thing in view after submit

## Tests
- `npx html-validate index.html order.html` (inline-style off): **0 errors**
- `node tests/apps-script.test.js`: **12/12** (unchanged back end)
- `tests/order-polish.e2e.js` (Playwright + Chrome, mocked feed with White Sage ranked first): 375 + 1280 pass, including the sold-out/Ask-us assertions
- Screenshots: `docs/screenshots/v2/` (mock data)

## Remaining issues
- Main has ONE stock approach (invoices since the latest count, per MERGE-NOTES). Kobe's Sold-sheet ledger files are not in main's tree.
  Open PRs #1 (Stock Adjustments ledger) and #5 (Sold tab) still propose ledgers. Eric should pick one and close the others.
- The home page grid (inventory.js) has its own size chips; its sold-out cards read "Out of stock". It doesn't share this page's Ask us logic.
- Kobe's chips are 40px tall (below 44px); left as styled.
- No photos yet; no skip link.
