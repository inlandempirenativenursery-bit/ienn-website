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
| Size | Price |
|---|---|
| 2-inch | $3 |
| 4-inch | $6 |
| Quarter tree | $10 |
| 1-gallon | $15 |

These prices live in one table, `IENN_SIZE_PRICES`, which appears in both `inventory.js` and `apps-script/inventory-endpoint.gs`. Keep the two in sync. Any prices in the feed are ignored. Size labels are normalized: 4", 4in and 4-inch all mean 4-inch; 1 gal and 1-gallon mean 1-gallon; 2" and 2-inch mean 2-inch; quarter, 1/4 tree and tree pot mean Quarter tree.

## Apps Script backend: setup and deploy (NOT deployed yet)
`apps-script/inventory-endpoint.gs` replaces the earlier `inventoryJson_()` snippet. It provides the inventory feed, order intake, the team email and the reply template.

**Sheet assumptions (Eric is still confirming; edit the constants at the top of the .gs if the sheet differs):**
- Tab `Inventory`, one row per plant, with these columns:
  - `Plant`: the plant name, optionally written as "Common (Botanical)".
  - `Botanical`: optional.
  - One count column per size: `2-inch`, `4-inch`, `Quarter tree`, `1-gallon`. Header matching is loose.
  - `Priority` (optional): lower numbers are shown first.
  - `Photo` (optional): a public image URL.
- Tab `Orders`: created automatically. Columns: Order ID, Timestamp, Name, Email, Phone, Items, Sizes, Qty, Line prices, Total, Pickup, Payment method, Paid status (defaults to Unpaid), Customer notes, Status, Our response.

**Steps:**
1. Paste the .gs file into the existing IENN Apps Script project. Remove any earlier `inventoryJson_` paste.
2. Fill in the TODO constants:
   - `TEAM_EMAILS`: the addresses for Eric, Andrew, Keith and Raylene.
   - `ADMIN_KEY`: a long random string.
   - `PICKUP_ADDRESS`.
3. Routing. Apps Script allows only one `doGet` and one `doPost` per project.
   - Make the first line of the existing `doGet(e)`: `var r = ienRouteGet_(e); if (r) return r;`
   - If there is no `doPost`, uncomment the one at the bottom of the file. If there is one, make its first line `var r = ienRoutePost_(e); if (r) return r;`
4. Optional sheet menu: in `onOpen()`, add `SpreadsheetApp.getUi().createMenu('IENN').addItem('Reply template for selected order', 'ienReplyForSelected').addToUi();`
5. Deploy: Deploy > Manage deployments > edit the current web app > Version: **New version**, Execute as **Me**, Who has access **Anyone**. The /exec URL stays the same. On the first run, approve the Sheets and Mail permissions.
6. Test:
   - `…/exec?view=inventory` should return JSON.
   - Place a test order on order.html. It should show an order number, add a row to Orders, lower the stock counts and send the team email.

**How orders flow:** order.html POSTs JSON as `text/plain` (which avoids a CORS preflight) to `ORDER_URL`, set in `inventory.js`.
- The script takes a lock, re-checks stock, lowers the counts, adds a row to Orders and emails the team.
- It returns `{ok, orderId, total}`, or `{ok:false, error}` when stock is too low.
- If the POST fails (for example, before the script is deployed), the page falls back to the old email (mailto) form.
- Reply template: see `docs/order-reply-template.md`. It is never sent to customers automatically.

Tests: `node tests/pricing.test.js` (size normalization, prices, inventory parsing, stock checks).
