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
## Live inventory for order.html (setup — not deployed yet)
`order.html` loads plants **only** from the Apps Script endpoint in `CONFIG.INVENTORY_URL` (no hardcoded plant list). New rows in the sheet appear automatically; qty > 0 shows "Available", 0 shows "Sold out". The last good response is cached in the browser and shown with "availability last updated …" if the endpoint is down; with no cache, customers see a call/text/email message.

1. Open the IENN Inventory Google Sheet → **Extensions → Apps Script** → create a **new** project (keep the existing invoice web app untouched, it already has its own `doGet`). Or create a standalone project and set `CFG.SPREADSHEET_ID`.
2. Paste `apps-script/inventory-endpoint.gs`. Set `CFG.INVENTORY_SHEET` to the inventory tab name, and add your header names to `CFG.HEADERS` / `CFG.SIZE_COLUMNS` if they differ. Optional columns: Botanical, Price, Active/Show, Rank, Blurb, Photo URL.
3. Run `readInventory_` once from the editor to authorize and check output (View → Logs / Execution log).
4. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone**. Copy the `/exec` URL.
5. In `order.html`, set `CONFIG.INVENTORY_URL` to that URL. Optionally also set `CONFIG.ORDER_ENDPOINT` to the same URL to write orders into an `Orders` tab (otherwise orders use mailto).
6. After editing the script later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

Dev testing: serve the repo locally and open `order.html?inventory=dev/sample-inventory.json` (localhost only).
