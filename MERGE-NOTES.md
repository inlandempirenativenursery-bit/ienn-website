# Merge notes: yuki/v4-system + v5 onto main (Oct 20, 2026)

A normal merge commit (no force-push, no history rewrite), so it can be reverted with `git revert -m 1 <merge>`.

## Replaced: Kobe's Sold-ledger back end
| Removed (Kobe, 8a7917e / 28f77bd) | Replaced by | Why |
|---|---|---|
| `apps-script/ienn-stock-ledger.gs` (new "Sold" tab, available = counts − Sold rows) | `IENN_Stock.gs` + `IENN_Website.gs` | Eric: **no new sheets for stock**; the inventory tool is the single source of truth. Sold since the last count is read from the existing **IENN Invoices** rows dated after the latest Submissions date. |
| `apps-script/inventory-endpoint.gs` (Inventory-tab feed, Orders tab, own team email) | `IENN_Website.gs` (`iennRoute_`, `iennInventory`, `doPost`, `iennSubmitInvoiceChecked`) | Orders go through the existing `submitInvoice` (one log, one team email); no parallel Orders tab. |
| `apps-script/ienn-printlist.gs` (`?view=printlist`) | `IENN_Print.gs` (`?view=print`, `?view=printlist` kept as an alias) | Same feature on the single data path, plus PDF/Drive/Sheet exports and the team hub. |
| `tests/pricing.test.js` | `tests/apps-script.test.js` (+ `gas-harness.js`, `mock-server.js`) | The old tests required the removed files. |
| `docs/order-reply-template.md`, `docs/USABILITY-NOTES.md` | `templates/order-response-email.md`, `USABILITY.md` (Kobe's still-valid points folded in) | One template, one notes file. |

## Kept from Kobe
- **Kept as-is:** `inventory.js` (homepage shop grid, size normalisation, `ienPrice`, tax-included `ienTax`). Only comments and the print-list URL (`?view=print`) were updated, since they referenced removed files.
- **Kept and updated:** `apps-script/IndexNav.html` (internal nav). Links now go to `?view=print` and `?view=hub`. `exportPlantListSheet()` exists as an alias in `IENN_Print.gs`.
- **Kept and updated:** `docs/TEAM-QUICKSTART.md`, rewritten for this flow.
- **Kept:** Kobe's finding that the existing tool's line `amt` is tax-inclusive (subtotal = grand / 1.0875). The website now sends tax-inclusive amounts.
- **Kept in order.html:** the `#pickup` and `#payment` selects (Grand Terrace option removed per Eric), and the `.confirm-id` style.
- **index.html:** only the two "Place Order Now" `href`s changed (Apps Script `?view=customer` → `order.html`). Nothing else in it was touched. Its fallback badge text still says "Ask about availability" (`LABEL.unknown`, line ~270); change that to "Available on request" during the design pass if wanted.

## Markup hooks for Kobe's design pass (order.html)
These class names and IDs are stable; the logic depends on the IDs, and the classes are free to restyle:
- **Layout and cards:** `#plant-list.grid`, `.card` (+ `.sold-out`, `.in-cart`, `.skel` loading placeholder), `.ph` (photo/placeholder), `.body`, `h3#<id>-name`, `.note` (botanical).
- **Badges:** `.badge.ok` (Available), `.badge.ask` (Available on request), `.badge.out` (Sold out).
- **Size chips:** `fieldset.chips` > `button.chip[aria-pressed]` (+ `.chip-request` for on-request sizes, `.chip-out` disabled sold-out). `.price` shows the stock line under the chips.
- **Stepper and add:** `.row`, `.stepper` (`button` −/+, `input[type=number]`), `button.add`, `.incart` (added message).
- **Cart:** `#review.summary`, `#summary-body` (`li` + `button.rm`), `.cart-total` (+ `small.tax-note` "Taxes included").
- **Sticky bar:** `#cartbar.cartbar`, `#cartbar-count`, `a[href="#review"]`.
- **Form:** `#order-form`, `#name` `#email` `#phone` `#pickup` `#payment` `#notes` (+ `#<id>-err.field-err`), `#qty-error`, `#server-error` (contains `a.contact-tel` `a.contact-sms` `a.contact-mail` on failure), `.submit-btn`.
- **Confirmation:** `#confirm.confirm`, `#confirm-id.confirm-id`, `#confirm-list`, `#confirm-total` (+ `small.tax-note`), `.confirm-contact`, `#new-order`.
- **Notice and footer:** `.notice`, `.fine-print` (the "Grand Terrace pickup available upon request." line; no styling yet), `a.contact-tel`, `a.contact-sms`.
- **Status:** `#inv-status.inv-status` (stale/offline stock note).
