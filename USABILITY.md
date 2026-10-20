# IENN system: usability notes (Oct 20, 2026)

The system now has four layers: weekly counts, invoices/orders, the website shop, and automatic stock decrease. These notes keep it simple for Eric and the team. No visual or logo changes.

## Roles
- **Andrew owns the whole order-to-pickup process.** Every new order gets Handled by = Andrew automatically, and "Claim selected order" defaults to Andrew. The new-order email goes To Andrew, CC Eric and Keith (Raylene isn't on order emails); only Andrew replies unless he hands off (edit Handled by).
- Customers with questions call or text Andrew at (909) 609-9373. This number appears on the order page, its error message, the confirmation, the print list and the reply template.
- Eric: Catalog, prices, website. Counters: weekly counts.

## Who edits what
| Thing | Where | Who |
|---|---|---|
| Plants (add, rename) | Inventory tool, **Catalog** | Eric |
| Stock | Weekly counts in the inventory tool (**Submissions**). The website subtracts orders since the last count automatically | Counters (Keith, Raylene, …) |
| Prices (final, taxes included) | `IENN_Config.gs` > `IENN_SIZES` (and `PRICES` in `order.html` / `inventory.js` for the offline view) | Eric |
| Orders | **IENN Invoices** tab: Status / Handled by / Our response | Whoever claims the order |
| Customer replies | IENN menu > Draft reply (Gmail draft, sent by a person) | Order handler |
| Website text | `order.html`, `index.html` in this repo | Eric / web helpers |

## Flow for an order (5 steps)
1. Customer orders on the website (the only public path), or a team member enters a phone/Marketplace order in the internal view. The existing `submitInvoice` writes IENN Invoices and emails the team.
2. Andrew opens the IENN Invoices link in the email (or the **team home**, `…/exec?view=hub`) and chooses **IENN > Claim selected order (Andrew)**. Status becomes Claimed.
3. Type the reply in **Our response**, then **IENN > Draft reply**. Check the Gmail draft and send it.
4. On payment set **Paid** / **Payment method**, Status = Paid.
5. At pickup set Status = **Picked up**. If the order is cancelled, set Status = **Cancelled** (its units go back into stock).

## Navigation
`…/exec?view=hub` is a single team home with four tiles: **Counts & invoices** (internal view), **Orders** (IENN Invoices, with New / Claimed / Paid counts), **Print plant list**, **Website shop**. Bookmark it on phones. The spreadsheet gets an **IENN** menu with the same actions.

## Concerns and recommendations
1. **One public order path (done).** The homepage buttons now go to `order.html`, and `?view=customer` shows "Orders have moved to our website". Team orders (internal Index) must use `iennSubmitInvoiceChecked`; that's a one-word edit Eric makes at deploy (README step 4), otherwise team orders skip the stock check.
2. **Stock baseline resets weekly.** Available = latest count minus orders since then. If a count is entered days after it was physically done, orders in between are subtracted twice. *Recommendation:* count after the Saturday pickups and enter it the same day. Use the date of the physical count.
3. **Untracked sizes (2" and Tree pot)** are labeled "Available on request" and can be ordered without a limit. Eric will add counts later (e.g. `two` / `tree` keys in Submissions); until then Andrew confirms availability in the reply.
4. **Taxes.** All shown prices are final and include tax; the website shows "Taxes included" next to totals only. The 8.75% is backed out for the invoice records. Kobe's homepage text already says "(tax included)".
5. **Double notifications.** `submitInvoice` already emails the team, so the add-on's extra email is off (`IENN_EXTRA_TEAM_EMAIL = false`). Don't turn it on unless the existing email stops.
6. **Placeholders still unfilled:** team emails (only for the optional extra email), `{{PICKUP_ADDRESS}}`, `{{PAYMENT_METHOD}}` / Zelle details, `IENN_LOGO_URL` and `IENN_WEBSITE_URL` (where the site is hosted). Reply drafts keep the `{{…}}` text visible so nobody sends a wrong address.
7. **Unconfirmed sheet details.** The add-on guesses how IENN Invoices stores line items (JSON column or one row per line) and which Submissions column holds the week date. Run `iennSetup` and check the log once.
8. **Public endpoints.** `?view=inventory` and `?view=print` are public (fine: they hold the same info as the shop). `?view=hub` shows order counts and the sheet link (the sheet itself stays private). If that's a concern, link the hub only from the internal view.
9. **Names are consistent everywhere:** sizes are "2-inch pot / 4-inch pot / Quarter tree pot / 1-gallon" for customers and `2"`, `4"`, `Tree pot`, `1 gal` inside the tool. Statuses are New, Claimed, Paid, Picked up, Cancelled.
10. **Partial weekly counts (from Kobe's notes).** If only some counters have submitted for a new week, `getAvailableStock()` may show only their numbers. Pick one counting day and one person who confirms "week complete".
11. **Name matching (from Kobe's notes).** Stock and invoices are matched by common name (before the "("). Keep Catalog common names unique.
12. **Mailto fallback.** Many phones have no mail app, so a failed submit now shows call/text Andrew first, and the cart is kept.
13. **Location.** Fontana is the pickup ("Fontana area, near Sierra Ave & Baseline Rd", exact address after confirmation). Grand Terrace appears only as fine print: "Grand Terrace pickup available upon request."
14. **Fewer clicks:** claim is one menu click (sets status and name), the reply draft is pre-filled, print/PDF/CSV are one click each, and the team email links straight to IENN Invoices.
