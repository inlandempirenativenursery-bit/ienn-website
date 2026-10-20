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
