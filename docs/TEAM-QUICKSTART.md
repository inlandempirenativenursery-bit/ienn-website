# IENN team quickstart (1 page)

**Team home:** `…/exec?view=hub` (bookmark it). It has four tiles: Counts & invoices · Orders · Print plant list · Website shop.

## 1. Weekly count (counters)
- Submit counts once a week in the internal view (4" and 1 gal per plant). Count after Saturday pickups and enter it the same day.
- A new count is the new starting stock. Website and team orders since that count are subtracted automatically. Never edit other people's submissions.

## 2. Orders (Andrew owns order-to-pickup)
- Regular pickup: **Fontana · Saturdays 10 AM – 2 PM**. Other times on request, case by case; Grand Terrace only on request. The customer's choice is in the invoice note ("Pickup: …").
- Customers order only on the website. Phone and Facebook Marketplace orders: enter them in the internal view (same stock check, same IENN Invoices).
- Everyone gets the order email. New orders show **Handled by = Andrew**.
- In IENN Invoices: **IENN > Claim selected order (Andrew)**. Type the reply in **Our response**, then **IENN > Draft reply**. Check the Gmail draft and send it.
- Statuses: **New → Claimed → Paid → Picked up**. **Cancelled** returns the plants to stock.

## 3. Prices
2" $3 · 4" $6 · Tree pot $10 · 1 gal $15. These are final prices, taxes included. 2" and Tree pot are "available on request" (not counted yet).

## 4. Printable plant list
**Print plant list** (or IENN menu): Print, Export PDF, Export CSV, or save to Drive / Google Sheet.

Customer questions: call or text Andrew, (909) 609-9373.

## Run a sale (pop-up on the website)

1. Open the **IENN Inventory** spreadsheet and go to the **Promos** tab.
2. Fill in a row: **Active** = yes, **Title**, **Message**, **Start date**, **End date**, and an optional **Discount note**. Replace the "EXAMPLE" text.
3. That's it. The website shows the pop-up between those dates, start and end included, Pacific time. No redeploy is needed.
4. To stop the sale early, set **Active** = no. If more than one row is active, the site uses the first one listed.

**One time only (whoever deploys the code):** add `IENN_Promos.gs` to the Apps Script project, run `iennSetup()` to create the tab, then deploy a **new version** of the existing web app.
To preview the pop-up, open the shop page with `?promo=preview` added to the end of the address.
