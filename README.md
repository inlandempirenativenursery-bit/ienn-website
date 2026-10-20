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
## Updating plant stock (order.html)
All plants on the order page come from one list near the bottom of `order.html`, marked `STOCK: edit here` (`var PLANTS = [...]`).
- Sold out: change `inStock: true` to `inStock: false`. The card then shows "Sold out" and its Add button is turned off.
- Back in stock: set it to `true` again.
- Add a plant: copy one line and change `id`, `name`, and `sizes`. Use `image: "images/your-photo.jpg"` if a photo exists.
- Optional live stock: set `STOCK_CSV_URL` to a published Google Sheet CSV with the columns `id,inStock`. It's off (`""`) by default. If the sheet can't be loaded, the page uses the list above.
