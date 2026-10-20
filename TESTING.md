# TESTING.md — IENN website review (2026-10-20)

Branch `review/site-fixes`, built on top of `order-page` (PR #1).

## How it was tested
- HTML validation: `npx html-validate index.html order.html` (inline-style rule off). **0 errors.**
- Headless Chrome via Playwright, at 375×812 (mobile) and 1280×900 (desktop): console errors, failed requests, horizontal overflow, and tap targets.
- Order form: checked that submitting with an empty cart is blocked; the +/− steppers update the summary.

## Results
| Check | index.html | order.html |
|---|---|---|
| Viewport meta | ✅ | ✅ |
| Horizontal overflow at 375px | ✅ none | ✅ none |
| JS console errors | ✅ none | ✅ none |
| Missing assets (logo, favicon) | ✅ none | ✅ none |
| Inputs have labels, types, autocomplete | n/a | ✅ name, email, tel |
| Tap targets ≥ 44px | ✅ (only the header logo link is below; acceptable) | ✅ |
| Empty-cart submit blocked | n/a | ✅ |

## Fixes in this branch
- order.html: removed the duplicated `<main>` tags (invalid HTML).
- order.html: added an **Order terms** box covering: order request only, availability, pricing/tax, no shipping or installs, and no plant-survival guarantee.
- order.html: added a **privacy notice** at the form (CalOPPA/CCPA basics) and a note explaining the mailto behavior.
- order.html: footer now has a contact email and a © line. Submit button renamed to "Submit Order Request". Email input has `inputmode`.
- index.html: removed the duplicate "Or use our simple email order form" link, which pointed to the same page as the button. Added a trailing newline.
- Earlier, in PR #1: DOCTYPE, skip link, `<main>`, © footer, survival/tax disclaimer, logo link fixed, labels, steppers.

## Needs Eric's input ([TODO] markers in the files)
1. **Order flow:** the form uses `mailto:`, which fails for people with no email app, and orders can get lost. Choose between the Apps Script order form (the old URL is in the README; PR #1 replaced it on the home page) and a form service.
2. **Prices and CA sales tax:** no prices are shown. Decide whether tax is included or added, and confirm the seller's permit.
3. **Return/replacement policy:** if any.
4. **Privacy policy page:** review the short notice and decide whether to add a full page.
5. **Contact:** confirm that hello@inlandempirenativenursery.com receives mail; add a phone number if you want one.
6. **Plant list:** "Blue Pyramid Cypress" is an Arizona cypress cultivar, not a California native. Confirm it belongs on a native-nursery list.
7. Photos are still "Photo" placeholders on the home page.

## Shop flow (branch `feature/shop-flow`, stacked on PR #2)

**What it does (order.html):** plant cards are built from one `PLANTS` list at the top of the second-to-last `<script>` in `order.html`. Each size has its own `stock` number. Edit stock there, and set it to 0 to mark that size out of stock.
- Badges: green **Available**. Green **Get yours now • only N left** when stock ≤ `LOW_STOCK` (5). Muted **Out of stock** when every size is 0, and the Add button is disabled.
- A size that's out of stock shows struck through and can't be picked. 1-gallon is picked by default when it's in stock.
- Pick size → set quantity (44px −/+ buttons) → **Add**. The quantity is capped at the stock that's left. The button shows "Max added" when the cart holds all of that size.
- Cart: "Your order" list with Remove buttons. A sticky bottom bar shows the item count and **Review order** (it floats bottom-right on desktop). The cart is saved in `localStorage` (`ienn-cart-v1`) and survives a reload. Items that are now out of stock are dropped from it on load.
- Submit: checks there's at least one plant, a name, and a valid email, with inline errors. It then adds the list to Notes, opens the email app (the **mailto delivery is unchanged**), and shows a confirmation panel with the order summary and a "Start a new order" button (which clears the cart).
- Styling uses only the existing palette (`--sage`, `--sage-dark`, `--cream`, `--lilac`, `--red`) and the existing card, stepper, and notice classes. The logo and imagery are untouched, and photos use the existing "Photo" placeholder (set `img` per plant later).
- The required notices from PR #2 (pickup, order terms, privacy, footer contact/©) are unchanged.

**Order delivery options (owner decision, not changed here):**
1. Current: `mailto:`. No backend, but it only works if the customer has an email app set up, and they must press Send.
2. Google Apps Script web app (or the existing Google order form): POST the same fields to a sheet. This is the most reliable free option.
3. A form service (Formspree, Netlify Forms, and similar): change the form `action` and keep everything else.

**[TODO]**
- Hook `PLANTS` to a published Google Sheet CSV so stock updates without editing code.
- Add prices once confirmed. None are shown on purpose.
- Add real stock numbers. The ones in the file are sample values.
- Home-page "Available now" cards are still static. They could read from the same list later.

**Tests run (headless Chrome, 2026-10-20):**
- `npx html-validate -c '{no-inline-style: off}' index.html order.html` → **0 errors**
- 375px and 1280px: no horizontal overflow, 0 console errors, and every button and size chip is at least 44px tall
- Flow: add 3 + 1 + 3 → bar shows "7 plants in order"; reload → the cart persists; Woolly 1-gal (stock 0) is disabled; Woolly 4-inch caps at 3 → "Max added"; a plant set to 0 for every size → "Out of stock" badge and Add disabled
- Submit with no email → blocked with an error. With valid input → confirmation shown and Notes filled with the list
- Screenshots: `/workspace/ienn-website-shots/shop-375.png`, `shop-1280.png`, `cart-375.png` (on the review box, not committed)
