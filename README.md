# IENN Website & Customer Order Form

Repo for the Inland Empire Native Nursery site and customer-facing order experience.

## Goals
- Amazon-style shopping for native plants
- Live inventory from Google Sheet / Apps Script
- Distinct customer order portal (not the internal invoice view)
- Clear pickup schedule, payment, and approximate location before order
- Order submission that notifies the team and sends confirmation/invoice

## Current order form URL
https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec?view=customer

## Agent roles
- Robo: customer order form logic & Apps Script integration
- Yuki: customer UX / layout
- Kobe: main website updates & logo
- Lobo: testing, edge cases, cleanup

Work continues in this repo so changes can be reviewed and deployed.
## Plant inventory on order.html (live from the Inventory sheet)
The order page loads plants, sizes, prices and stock from the IENN Inventory sheet through the existing Apps Script web app. To add a plant or change stock, edit the sheet. No website change is needed.

- Source setting: `INVENTORY_URL` near the bottom of `order.html` (`INVENTORY SOURCE`). Default: `<web app>/exec?view=inventory`.
- **One-time setup (Eric):** add `apps-script/inventory-endpoint.gs` to the Apps Script project and add one line to `doGet`, then deploy a new version. The steps are in that file. Until then the page uses an offline fallback list and shows a "stock may be out of date" note.
- Alternative source: a Google Sheet published to the web as CSV with the columns `Plant, Size, Qty, Price, Sort, Photo` (one row per plant and size). Paste that CSV URL into `INVENTORY_URL`.
- Availability: a size with Qty > 0 shows a green "Available" badge, and all sizes at 0 shows "Sold out" with the add button turned off. Plants the sheet doesn't track stock for show "Ask about availability".
- The page refreshes every `REFRESH_MINUTES` (5) and when the tab regains focus. It caches the last good copy in the browser.
- Sort order: in-stock first, then by appeal, then A–Z. Appeal comes from a sheet `Sort` column if present (lower number = first; set `SORT_COLUMN` in the .gs). Otherwise it comes from the editable `APPEAL_KEYWORDS` list in `order.html` (white sage, monkeyflower/Mimulus/Diplacus, poppy, penstemon, sages, buckwheat, milkweed, and so on).
- `FALLBACK_PLANTS` in `order.html` is only for offline use. It is not the source of truth.

## Home page shop grid (index.html)
The home-page cards come from the same `?view=inventory` feed, loaded by `inventory.js` (`INVENTORY_URL`). It reads the raw `getInitial()` JSON from `apps-script/inventory-endpoint.gs`, a list of plant objects, or JSONP (`&callback=`). Until the endpoint is deployed, the URL returns HTML, so the grid shows a short fallback list marked "Ask about availability" (never "Available"). Sort order: `sort` value if present, otherwise white sage and monkeyflowers first, then flowering plants, with out-of-stock plants last. Low-stock threshold: `IENN_LOW_STOCK` (5). The cart hands off to `order.html?slug=qty` or `?slug|size=qty`.

## Prices (by pot size only)
The sizes are 2" $3, 4" $6, Tree pot $10 and 1 gal $15. Prices **include** 8.75% CA sales tax, the same way the existing invoice tool works (subtotal = total ÷ 1.0875). The table lives in `inventory.js` and `apps-script/ienn-stock-ledger.gs`. Keep the two in sync. Size labels are normalized: 4"/4in/4-inch/four, 1 gal/1-gallon/gal1, 2"/2-inch, quarter/1/4 tree/tree pot. The website shows only 4" and 1 gal unless the feed reports stock in another size.

## Apps Script backend (NOT deployed yet)
The inventory tool (one Apps Script project with an internal Index view and `?view=customer`) is the single source of truth. Everything below adds files to **that** project and writes only into the tool's own spreadsheet.

| File | What it does |
|---|---|
| `apps-script/ienn-stock-ledger.gs` | Takes the latest week's counts minus the **Sold** ledger. Wraps `getAvailableStock` and `submitInvoice`, using LockService. |
| `apps-script/inventory-endpoint.gs` | `?view=inventory` JSON/JSONP feed, website `doPost` (sends orders through `submitInvoice`), `?view=reply` template. |
| `apps-script/ienn-printlist.gs` | `?view=printlist` (print/PDF), `&format=csv`, and `exportPlantListSheet()` (writes a "Plant List" sheet). |
| `apps-script/IndexNav.html` | One nav bar for the internal Index view. |

**Assumptions** (Eric to confirm; the full list is at the top of `ienn-stock-ledger.gs`):
- `Submissions` has one row per person per weekly count, with Timestamp | (Week) | Person | Counts. Counts is JSON shaped `{"<catalog id>": {"four": n, "gal1": n}}`.
- The latest week is the Week value of the newest row, or the ISO week of its timestamp. Within that week, each person's newest row counts, and counts are summed across people.
- `Catalog` maps Id to Name, with an optional Botanical column.
- The existing `getAvailableStock()` stays as the source of the counts.
- The `Sold` sheet is auto-created in the same spreadsheet: one row per order line, tagged with the week. Available stock = this week's count − this week's Sold rows. A new weekly count starts a new week, so the deductions reset.

**Deploy steps:**
1. Paste the three `.gs` files into the tool's Apps Script project as new files.
2. Rename the existing `function getAvailableStock(` to `function getAvailableStockRaw_(`.
3. Rename the existing `function submitInvoice(` to `function submitInvoiceOriginal_(`. Its Invoices write and team email stay unchanged.
4. Add the first line of the existing `doGet(e)`: `var r = ienRouteGet_(e); if (r) return r;`. The project has no `doPost` today; the new one is in `inventory-endpoint.gs`.
5. Paste `IndexNav.html` at the top of the Index view's `<body>`. Fix its two `#anchors` and the website URL.
6. Set `ADMIN_KEY` and `PICKUP_ADDRESS`. If the tool's spreadsheet isn't found automatically, set `INVENTORY_SS_ID`, or point `ienSS_()` at the tool's own lookup.
7. Deploy > Manage deployments > edit the current deployment > **New version**, Execute as Me, Access Anyone. The /exec URL stays the same. Approve the Drive and Sheets permissions.
8. Test:
   - `…/exec?view=inventory` returns JSON.
   - `…/exec?view=printlist` shows the list.
   - A test order from order.html shows an order number, a row in IENN Invoices, the team email, Sold rows, and lower stock.

**Order flow:** order.html POSTs `text/plain` JSON to `ORDER_URL`. The script calls `submitInvoice(data)` in the real invoice format, with the website's name, phone, pickup and payment in `note`. That locks, re-checks stock and calls the original, which writes Invoices and emails the team. It then appends the Sold rows and returns `{ok, orderId, total, tax}`, or `{ok:false, error}` when stock is too low. The customer view and the internal view go through the same check. If the POST fails, the page falls back to the email (mailto) form.

See also: `docs/TEAM-QUICKSTART.md`, `docs/USABILITY-NOTES.md`, `docs/order-reply-template.md`. Tests: `node tests/pricing.test.js`.
