# IENN Website & Customer Order Form

Repo for the Inland Empire Native Nursery site and customer-facing order experience.

## Goals
- Amazon-style shopping for native plants
- Live inventory from Google Sheet / Apps Script
- Distinct customer order portal (not the internal invoice view)
- Clear pickup schedule, payment, and approximate location before order
- Order submission that notifies the team and sends confirmation/invoice

## Ordering
**The only public order path is the website `order.html`.** The Apps Script invoice tool is **team-only** (phone orders, FB Marketplace, in-person). Its sales still decrement the shared stock. Don't share the Apps Script `?view=customer` link with customers; see the optional redirect patch below.

## Agent roles
- Robo: customer order form logic & Apps Script integration
- Yuki: customer UX / layout
- Kobe: main website updates & logo
- Lobo: testing, edge cases, cleanup

Work continues in this repo so changes can be reviewed and deployed.
## Live inventory + orders + printable list (setup — NOT deployed yet)
**One system:** the existing IENN inventory/invoice Apps Script project (internal Index view) is the single source of truth. `apps-script/ienn-api.gs` is an **add-on file** for that project. It uses the tool's own spreadsheet (no new spreadsheet or ID) and adds two tabs to it: **Stock Adjustments** (ledger) and **Web Orders** (website contact/claim/reply tracking). It never edits the weekly count JSON in `Submissions`.

- **Live stock** = existing `getAvailableStock()` (latest week, `4"` and `1 gal`) plus the Stock Adjustments rows for that same week key. A new weekly count resets the baseline.
- **Website** (`order.html`, `CONFIG.EXEC_URL`): `GET ?api=inventory` returns Catalog plants with live stock. 2" and Tree pot are priced, but the weekly count doesn't track them, so they show "Available on request — ask us" (price shown, not addable), on the site and the printable list. `POST ?api=order` (text/plain JSON) takes a lock, re-checks live stock, then calls the **existing `submitInvoice()`**. That gives the same invoice number, IENN Invoices row and team email; the note carries the customer details and a link to the Web Orders row. It then writes the adjustments.
- **Prices:** 2" $3, 4" $6, Tree pot $10, 1 gal $15. They are **tax-inclusive**, like the invoice app (subtotal = total / 1.0875, tax 8.75%). The site shows "Taxes included" only next to totals.
- **Printable list:** `<exec>?view=plantlist` (add `&instock=1` for in-stock only) with a Print/Save-as-PDF button, plus a CSV export at `<exec>?api=plantlist&format=csv`.

### Install into the existing Apps Script project
1. Open the existing project → **File → + → Script** → name it `ienn-api` → paste `apps-script/ienn-api.gs`.
2. **doGet patch:** make this the first line inside the existing `doGet(e)`:
   ```js
   if (e && e.parameter && (e.parameter.api || e.parameter.view === "plantlist")) return ienn_api_doGet_(e);
   ```
3. **doPost:** if the project has none, add `function doPost(e) { return ienn_api_doPost_(e); }`. Otherwise make `if (e && e.parameter && e.parameter.api) return ienn_api_doPost_(e);` its first line.
4. **submitInvoice patch** (so in-person invoices also decrement stock): right after the invoice number is assigned and the row is written (before `return`), add:
   ```js
   try { ienn_recordSale_(data.lines, invno, data.source || "invoice"); } catch (err) { console.error(err); }
   ```
   Use the variable names the function actually has (`data` = its argument, `invno` = the number it returns). This call can safely run more than once: website orders call it again and nothing is double-counted.
5. **Spreadsheet lookup:** if the project already has a function that returns the tool's spreadsheet, put its name in `CFG_IENN.SPREADSHEET_RESOLVER`. Otherwise `ienn_ss_()` tries common helper names, then the bound spreadsheet, then the single Drive file named "IENN Inventory".
5b. **Retire the public customer view (recommended):** set `CFG_IENN.WEBSITE_ORDER_URL` and make this the first line of `doGet`: `if (e && e.parameter && e.parameter.view === "customer") return ienn_redirectToWebsite_();`
6. **Index button (optional):** in the internal Index HTML add
   `<a href="https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec?view=plantlist" target="_blank">Print plant list</a>` (or `<?= ScriptApp.getService().getUrl() ?>?view=plantlist` if Index is a template).
7. Run `ienn_getLiveStock_` once in the editor to authorize, and check the log.
8. **Deploy → Manage deployments → Edit → New version** (the URL stays the same; access must be Anyone for the website).
9. Set `CONFIG.EXEC_URL` in `order.html` to the `/exec` URL and push.

**Fixing a wrong count:** add a row to **Stock Adjustments** with the current week key, plant, size, Delta (+/-) and Source=`manual`, or just submit a new weekly count.

**Order owner:** every order email goes to the whole team, but says **Andrew claims & handles this order**, and Web Orders → Claimed by defaults to Andrew (`CFG_IENN.ORDER_OWNER`).

**Replying to customers:** run `ienn_buildCustomerReply_("<invoice no>")` and copy the text from the log, or use `templates/customer-response.md`. Nothing is sent automatically.

See `docs/SYSTEM-GUIDE.md` for the weekly flow and the usability notes.

Dev testing: `order.html?inventory=dev/sample-inventory.json&order=<mock-url>` (localhost only).
