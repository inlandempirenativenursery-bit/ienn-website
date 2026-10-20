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
## Live inventory + orders (setup — NOT deployed yet)
`order.html` gets plants only from the existing IENN Apps Script project, via `CONFIG.EXEC_URL` (`?api=inventory` for GET, `?api=order` for POST, sent as text/plain JSON to avoid a CORS preflight). Until `EXEC_URL` is set, the page shows a call/text/email message and orders fall back to mailto.

**Prices (by size only, no tax shown on the site):** 2-inch $3 • 4-inch $6 • Quarter tree pot $10 • 1-gallon $15. They live in `CONFIG.SIZES` (order.html) and `CFG_IENN.SIZES` (apps-script/ienn-api.gs); keep the two in sync. The server recomputes the subtotal from its own prices.

**Assumed sheet layout (edit `CFG_IENN` if different):** tab `Inventory`, header row 1, one row per plant. Column `Plant` is required; optional columns are `Botanical`, `Rank`, `Active` (no/false hides a plant), `Blurb`, and `Photo`. There is one count column per size, with headers `2"`, `4"`, `Tree pot`, `1 gal` (aliases accepted: 2-inch, 4 inch, quarter tree pot, 1 gallon…). A blank count cell means the size isn't offered; 0 means sold out.

### Install into the existing Apps Script project
1. Open the existing IENN Apps Script project (the one serving `…exec?view=customer`). **File → + → Script**, name it `ienn-api`, and paste `apps-script/ienn-api.gs`.
2. In `CFG_IENN`, check `INVENTORY_SHEET` (tab name) and `SPREADSHEET_ID` (leave "" if the project is bound to the sheet). If `getSettings()` doesn't hold the team emails, fill in `TEAM_EMAILS` (Eric, Andrew, Keith, Raylene).
3. Make this the **first line** inside the existing `doGet(e)`:
   ```js
   if (e && e.parameter && e.parameter.api) return ienn_api_doGet_(e);
   ```
4. If there is no `doPost`, add:
   ```js
   function doPost(e) { return ienn_api_doPost_(e); }
   ```
   Otherwise make this the first line of the existing `doPost(e)`: `if (e && e.parameter && e.parameter.api) return ienn_api_doPost_(e);`
5. Run `ienn_publicInventory_` once in the editor to authorize (Sheets, Mail) and check the log output.
6. **Deploy → Manage deployments → (existing web app) → Edit → Version: New version → Deploy.** The /exec URL stays the same. "Who has access" must be **Anyone** for the public site.
7. Set `CONFIG.EXEC_URL` in `order.html` to the `/exec` URL (no query string) and push.

### What an order does
The server takes a script lock and re-reads counts. If any line is short, it rejects with `{ok:false, error:"insufficient_stock", short:[…]}`; the site then shows those items and refreshes availability. Otherwise it decrements the size cells and appends a row to the `Orders` tab (Order ID, Received, Name, Phone, Email, Fulfillment, Items, Subtotal, Notes, Status=New, Paid=No, Payment method, Pickup address sent, Our response, Claimed by). It then emails the team "New IENN order #ID — name" with a link to the row (one person claims it and replies), and returns the order ID, which the confirmation screen shows.

### Replying to customers
Run `ienn_buildCustomerReply_("W…")` in the editor and copy the text from the log, or use `templates/customer-response.md`. Nothing is sent automatically. Fill **Pickup address sent** only after you confirm the order.

Dev testing: serve the repo locally and open `order.html?inventory=dev/sample-inventory.json&order=<mock-url>` (localhost only).
