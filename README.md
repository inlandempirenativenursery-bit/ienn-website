# IENN Website & Customer Order Form

Repo for the Inland Empire Native Nursery site and customer-facing order experience.

## Goals
- Amazon-style shopping for native plants
- Live inventory from Google Sheet / Apps Script
- ONE public order path: the website (`order.html`). The Apps Script invoice tool is team-only (phone, FB Marketplace)
- Clear pickup schedule, payment, and approximate location before order
- Order submission that notifies the team and sends confirmation/invoice

## Ordering
Customers order only at `order.html`. The old Apps Script customer view and Google order form are retired as public links
(do not share them). Website and internal invoices feed the same IENN Invoices + `Sold` log. Fallback contact: Andrew,
call/text (909) 609-9373. See TESTING.md.

## Agent roles
- Robo: customer order form logic & Apps Script integration
- Yuki: customer UX / layout
- Kobe: main website updates & logo
- Lobo: testing, edge cases, cleanup

Work continues in this repo so changes can be reviewed and deployed.