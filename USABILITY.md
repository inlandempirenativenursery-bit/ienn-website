# IENN system: usability notes (Oct 20, 2026)

The system now has four layers: weekly counts, invoices/orders, the website shop, and automatic stock decrease. These notes keep it simple for Eric and the team. No visual or logo changes.

## Who edits what
| Thing | Where | Who |
|---|---|---|
| Plants (add, rename) | Inventory tool, **Catalog** | Eric |
| Stock | Weekly counts in the inventory tool (**Submissions**). The website subtracts orders since the last count automatically | Counters (Keith, Raylene, …) |
| Prices / tax | `IENN_Config.gs` > `IENN_SIZES`, `IENN_TAX_PCT` (and `PRICES` in `order.html` for the offline view) | Eric |
| Orders | **IENN Invoices** tab: Status / Handled by / Our response | Whoever claims the order |
| Customer replies | IENN menu > Draft reply (Gmail draft, sent by a person) | Order handler |
| Website text | `order.html`, `index.html` in this repo | Eric / web helpers |

## Flow for an order (5 steps)
1. Customer orders on the website (or the customer view). The existing `submitInvoice` writes IENN Invoices and emails the team.
2. One person opens the IENN Invoices link in the email (or the **team home**, `…/exec?view=hub`) and chooses **IENN > Claim selected order**. Status becomes Claimed, with their email in Handled by.
3. Type the reply in **Our response**, then **IENN > Draft reply**. Check the Gmail draft and send it.
4. On payment set **Paid** / **Payment method**, Status = Paid.
5. At pickup set Status = **Picked up**. If the order is cancelled, set Status = **Cancelled** (its units go back into stock).

## Navigation
`…/exec?view=hub` is a single team home with four tiles: **Counts & invoices** (internal view), **Orders** (IENN Invoices, with New / Claimed / Paid counts), **Print plant list**, **Website shop**. Bookmark it on phones. The spreadsheet gets an **IENN** menu with the same actions.

## Concerns and recommendations
1. **Two order paths.** The old customer view (`?view=customer`) and the website both create invoices. The README still lists the customer-view URL, and the homepage's order button was changed by another helper; check where it points now. *Recommendation:* send customers to one place (the website `order.html`). If the customer view stays, change its `.submitInvoice(data)` to `.iennSubmitInvoiceChecked(data)` so it gets the same lock and stock check.
2. **Stock baseline resets weekly.** Available = latest count minus orders since then. If a count is entered days after it was physically done, orders in between are subtracted twice. *Recommendation:* count after the Saturday pickups and enter it the same day. Use the date of the physical count.
3. **Untracked sizes (2" and Tree pot)** are always orderable and show "Ask about availability". Customers can order more than exists. *Recommendation:* either add counts for these sizes (columns `two` / `tree` in Submissions) or keep the "we'll confirm" wording in the reply.
4. **Double notifications.** `submitInvoice` already emails the team, so the add-on's extra email is off (`IENN_EXTRA_TEAM_EMAIL = false`). Don't turn it on unless the existing email stops.
5. **Placeholders still unfilled:** team emails (only for the optional extra email), `{{PICKUP_ADDRESS}}`, `{{PAYMENT_METHOD}}` / Zelle details, `IENN_LOGO_URL` and `IENN_WEBSITE_URL` (where the site is hosted). Reply drafts keep the `{{…}}` text visible so nobody sends a wrong address.
6. **Unconfirmed sheet details.** The add-on guesses how IENN Invoices stores line items (JSON column or one row per line) and which Submissions column holds the week date. Run `iennSetup` and check the log once.
7. **Public endpoints.** `?view=inventory` and `?view=print` are public (fine: they hold the same info as the shop). `?view=hub` shows order counts and the sheet link (the sheet itself stays private). If that's a concern, link the hub only from the internal view.
8. **Names are consistent everywhere:** sizes are "2-inch pot / 4-inch pot / Quarter tree pot / 1-gallon" for customers and `2"`, `4"`, `Tree pot`, `1 gal` inside the tool. Statuses are New, Claimed, Paid, Picked up, Cancelled.
9. **Fewer clicks:** claim is one menu click (sets status and name), the reply draft is pre-filled, print/PDF/CSV are one click each, and the team email links straight to IENN Invoices.
