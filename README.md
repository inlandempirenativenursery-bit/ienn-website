# IENN Website & Customer Order Form

Repo for the Inland Empire Native Nursery site and customer-facing order experience.

## Goals
- Amazon-style shopping for native plants
- Live inventory from Google Sheet / Apps Script
- Distinct customer order portal (not the internal invoice view)
- Clear pickup schedule, payment, and approximate location before order
- Order submission that notifies the team and sends confirmation/invoice

## Ordering
- **Public:** the website shop `order.html` is the only public order path. The homepage "Place Order Now" buttons point there.
- **Team only:** the inventory tool's internal Index view, for phone orders, Facebook Marketplace and so on. It goes through the same checked submit.
- The old public `…/exec?view=customer` no longer takes orders. Once deployed, it shows "Orders have moved to our website" with a link to the shop and Andrew's call/text number.

## Agent roles
- Robo: customer order form logic & Apps Script integration
- Yuki: customer UX / layout
- Kobe: main website updates & logo
- Lobo: testing, edge cases, cleanup

Work continues in this repo so changes can be reviewed and deployed.
## One system: inventory tool + website (apps-script/)
The IENN inventory/invoice Apps Script web app is the **single source of truth**: Catalog (plant id to name), Submissions (weekly counts), IENN Invoices (orders). The website reads from it and orders go into it. **We have no access to that Apps Script project, so none of this is deployed yet. Eric has to paste the files in and deploy (steps below).** The real script source wasn't available to us, so the code is written against the function names the live customer page uses (`getInitial()`, `submitInvoice(data)`) and Eric's description (`getAvailableStock()`). Every assumption is listed at the top of `apps-script/IENN_Config.gs`.

| File | What it does |
|---|---|
| `IENN_Config.gs` | All settings: sheet and tab names, header aliases, **final prices by size, taxes included** (2" $3 · 4" $6 · Tree pot $10 · 1 gal $15; 8.75% is only backed out for records), team email placeholders, pickup address and payment placeholders |
| `IENN_Stock.gs` | Available stock = latest weekly count (`getAvailableStock()`) minus units on IENN Invoices dated after that count |
| `IENN_Website.gs` | `?view=inventory` JSON/JSONP; `doPost` for website orders; `iennSubmitInvoiceChecked()` = lock + stock re-check + existing `submitInvoice()` |
| `IENN_Print.gs` | `?view=print` printable list (Print / Export PDF / Export CSV), `?view=hub` team home, plus spreadsheet menu exports (PDF to Drive, Google Sheet) |
| `IENN_Drafts.gs` | IENN spreadsheet menu: Claim order, Draft reply (Gmail **draft only**, never sent), Print/export |

### How it works
- **Inventory to website:** `order.html` loads `APPS_SCRIPT_URL?view=inventory`. Each plant shows all four sizes with prices. 4" and 1 gal are tracked: a number means that many available, 0 means sold out and that size's chip is disabled. 2" and Tree pot aren't counted yet (**Eric will add counts later**), so they're orderable at their price and labeled **"Available on request"**. The page refreshes every 5 minutes and when the tab regains focus. The last good copy is cached in the browser; if the source can't be reached, the page shows an offline list with a "stock may be out of date" note.
- **Adding a plant** = add it to the tool's Catalog. It appears on the website (and print list) on the next refresh. No website edit needed.
- **Website order to existing invoice path:** the page POSTs JSON as `text/plain`. That's a "simple" request with no CORS preflight, which Apps Script can't answer, and Apps Script's redirect reply allows any origin, so the page can read the invoice number. `doPost` checks the order, recalculates prices on the server (prices sent by the browser are ignored), puts name, phone, pickup choice and payment into the invoice note (`Website order — Name · Phone`, `Pickup: …`, `Pays by: …`). **Prices include tax:** line `amt` and `grand` are the displayed prices, and `subtotal`/`tax` are derived backwards (subtotal = grand / 1.0875) for the existing tool's records, so the customer total always equals the sum of the displayed prices, and calls `iennSubmitInvoiceChecked`. That function takes a `LockService` script lock, re-checks stock, then calls the **existing `submitInvoice(data)`**. That writes IENN Invoices and sends the existing team email, so there's no second orders log and no second notification. The page then shows the confirmation with the invoice number. If stock ran out meanwhile, the order is rejected with a clear message ("Only 1 White Sage (4-inch pot) left — you asked for 2") and the cart is trimmed. If the endpoint can't be reached, the order is **not** placed. The cart is kept, and the page offers **call/text Andrew (909) 609-9373** (tel:/sms: links, with the order pre-filled in the text) or an email link to hello@inlandempirenativenursery.com.
- **Auto stock decrease without touching anyone's counts:** available = latest week's counts minus units on IENN Invoices with a timestamp after the latest Submissions date. Edge cases:
  - A new weekly count becomes the new baseline, so sales before it stop being subtracted (the count already reflects them).
  - Set an invoice's Status to `Cancelled` to give its units back.
  - Sales on the internal invoice view are subtracted too, because they're in IENN Invoices.
  - If counts are entered *during* pickup day, orders placed between the physical count and its entry are subtracted twice until the next count. Count after the day's pickups.
  - If invoices only store a date (no time), an order on the same day as the count date isn't subtracted. Use a timestamp column if the sheet has one.
  - The lock only covers orders that go through `iennSubmitInvoiceChecked`. Switch the customer view to it too (step 4).
- **Order status:** three columns are added to the right of IENN Invoices if missing: `Status` (New → Claimed → Paid → Picked up, or Cancelled), `Handled by`, `Our response`. This is the only change to existing sheets. No new sheets are created.

### Deploy steps for Eric (in the existing Apps Script project)
1. Open the inventory/invoice Apps Script project. For each file in `apps-script/`, click **+ > Script** and paste it in with the same name.
2. In `IENN_Config.gs`, check the tab names and header aliases against the real sheets. Check S1–S7 at the top, especially how IENN Invoices stores line items (JSON column, or one row per line). Leave `IENN_EXTRA_TEAM_EMAIL = false` if `submitInvoice` already emails the team.
3. In the existing `doGet(e)`, add this as the first line: `var ienn = iennRoute_(e); if (ienn) return ienn;`. If a `doPost` or `onOpen` already exists, merge as described at the top of `IENN_Website.gs` and `IENN_Drafts.gs`.
4. **Required:** in the internal Index view HTML (team orders), change `.submitInvoice(data)` to `.iennSubmitInvoiceChecked(data)`, so team orders get the same lock, stock re-check, IENN Invoices log and stock decrease. Paste `apps-script/IndexNav.html` at the top of Index's `<body>` for the team nav. The public `?view=customer` is closed automatically by `iennRoute_`.
4b. To say "Andrew is handling it" in the existing team email, add this line to the email body in `submitInvoice`: `'\nAndrew is handling this order (order-to-pickup).'`. (The add-on also sets Handled by = Andrew on every new invoice.)
5. Select `iennSetup` and click **Run** once. Approve the Spreadsheet, Mail, Gmail and Drive permissions. Check the log for plant count and baseline date.
6. **Deploy > Manage deployments > edit the existing web app > Version: New version > Deploy.** Keep *Execute as: Me* and *Who has access: Anyone* so the /exec URL stays the same.
7. Check: open `…/exec?view=inventory` (should be JSON), `…/exec?view=print` and `…/exec?view=hub`, then place a test order on the website and set its Status to Cancelled afterwards.
8. Fill in placeholders: the order-email addresses `TEAM_EMAIL_TO` (Andrew, primary) and `TEAM_EMAIL_CC` (Eric, Keith; Raylene isn't on order emails), currently `ANDREW_EMAIL_PLACEHOLDER@example.com` and so on (only used if the extra email is turned on), plus `PICKUP_ADDRESS`, `DEFAULT_PAYMENT_METHOD`, `IENN_LOGO_URL` and `IENN_WEBSITE_URL` (where the site is hosted; the closed customer view redirects there).

### Printable plant list
`…/exec?view=print` (alias `?view=printlist`, used by the homepage link) gives a clean list with the locked logo (the site's `images/ienn-logo-sage.png`, used as-is), the date, plants sorted by availability then appeal, botanical names, the four sizes with prices, and current availability ("On request" for 2" and Tree pot), Fontana pickup, and Andrew's call/text number. One click from there: **Print**, **Export PDF** (Apps Script converts the HTML to a PDF), **Export CSV**. From the spreadsheet: **IENN menu > Printable plant list / Export plant list: PDF to Drive / Google Sheet**.

### Replying to customers
**Andrew owns order-to-pickup.** New invoices get Handled by = Andrew automatically. In IENN Invoices, click the order and choose **IENN > Claim selected order (Andrew)** (sets Status = Claimed, Handled by = Andrew; edit the cell to hand off). Type the reply in `Our response`, then choose **IENN > Draft reply for selected order**. A Gmail **draft** is created from `templates/order-response-email.md`; review it and send it yourself. Nothing is sent to customers automatically.

### Tests
`node tests/apps-script.test.js` runs the real .gs files against stubs of SpreadsheetApp, MailApp, GmailApp and LockService, plus a fake of the existing tool. It covers: header and size matching, counts minus sales, the baseline reset, cancelled invoices, decrement, oversell rejection, the lock, server-side prices, emails, drafts and the print/CSV export. `node tests/mock-server.js` serves the site plus a mock `/exec` on http://localhost:8822; point `APPS_SCRIPT_URL` at `http://localhost:8822/exec` to try the page locally.

## Home page shop grid (index.html)
The home-page cards come from the same `?view=inventory` feed, loaded by `inventory.js` (`INVENTORY_URL`). It reads the raw `getInitial()` JSON from `apps-script/IENN_Website.gs` (`iennInventory()`), a list of plant objects, or JSONP (`&callback=`). Until the endpoint is deployed, the URL returns HTML, so the grid shows a short fallback list marked "Ask about availability" (never "Available"). Sort order: `sort` value if present, otherwise white sage and monkeyflowers first, then flowering plants, with out-of-stock plants last. Low-stock threshold: `IENN_LOW_STOCK` (5). The cart hands off to `order.html?slug=qty` or `?slug|size=qty`.

See `MERGE-NOTES.md` for what replaced Kobe's Sold-ledger back end, and which markup hooks the design pass relies on.


## Plant photos

Cards show `assets/plants/<plant-id>.jpg`, where the id is the slug of the common name (for example "White Sage" becomes `white-sage`). The ids that have a photo are listed in `PLANT_PHOTOS` in `order.html`. To add a photo, save it at about 800px wide as JPEG in `assets/plants/`, add its id to `PLANT_PHOTOS`, and credit it in `assets/plants/CREDITS.md`. Plants without a photo show "Photo coming soon".

Optional override from the sheet: add a **Photo** column (also matched: Photo URL, Image, Image URL, Picture) to the inventory tool's **Catalog** tab with a full image URL. The `?view=inventory` JSON then returns it as `image`, and it wins over the local file (`CATALOG_PHOTO_HEADERS` in `IENN_Config.gs`, `iennCatalogPhotos_()` in `IENN_Stock.gs`). Redeploy the Apps Script for this to take effect.

## Promos (sale pop-up)

The shop pages (`order.html` and the homepage) can show a small pop-up for a sale. It is controlled entirely from the **Promos** tab of the inventory tool's spreadsheet:

| Active | Title | Message | Start date | End date | Discount note |
|---|---|---|---|---|---|
| No | Fall Sale | EXAMPLE: … | 2026-11-01 | 2026-11-30 | e.g. describe the discount here |

- **Turn a promo on:** set **Active** to `Yes` and fill in Title and Message. Start and End dates are inclusive and use Pacific time. Leave either one blank for "open-ended". A Discount note is optional and shows in bold. Write only what's actually offered.
- **Turn it off:** set Active to `No`, or let the End date pass. If several rows qualify, the first one from the top is shown.
- Customers see it once per browser session, and must tap **Shop now** or **×** (or press Esc) to close it.
- The tab is created with three inactive example rows (Fall, Spring and Summer Sale) when you run `iennSetup()` once. The example dates and wording are placeholders, so edit them before you activate a row.
- Header names can be changed in `IENN_Config.gs` (`PROMO_*_HEADERS`). The logic is in `apps-script/IENN_Promos.gs`, and the pop-up in `promo.js`.
- **One-time step:** paste `IENN_Promos.gs` and the updated `IENN_Config.gs` / `IENN_Website.gs` into the Apps Script project, run `iennSetup()`, then **Deploy → Manage deployments → edit → New version**. After that, turning promos on and off is sheet-only.
- **Preview without the sheet:** open `order.html?promo=preview` (or `index.html?promo=preview`).

## Customer confirmation email

Every reply uses the same "look, verify, confirm" template (`templates/order-response-email.md`, built by `IENN_Drafts.gs`). It's auto-filled from the order: items with size, qty and price, the total (taxes included), the Fontana pickup area and Saturday 10 AM – 2 PM schedule, the next Saturday as the pickup date, "Cash or Zelle at time of pickup.", the customer's notes, our notes, Andrew's number and the fine print. It's saved as a Gmail draft only; the team checks it, types the exact address over `{{PICKUP_ADDRESS}}`, and sends.
