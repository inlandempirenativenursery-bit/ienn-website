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
