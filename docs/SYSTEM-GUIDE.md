# IENN system guide (one page)

## The flow
```
Weekly count (inventory tool → Submissions)
      │  getAvailableStock() = latest week's counts (4", 1 gal)
      ▼
LIVE STOCK = weekly count + Stock Adjustments (this week)
      │                                   ▲
      ├──► Website order (order.html) ────┤  -qty rows (source=website)
      │      checks live stock, calls submitInvoice()
      ├──► In-person invoice (tool) ──────┤  -qty rows (source=invoice)
      │      submitInvoice()
      ▼
IENN Invoices row + team email (existing)  ──► Web Orders row (website only)
      │
      ▼
ONE person claims it (Web Orders → Claimed by) → replies with template
(ienn_buildCustomerReply_) → sends address after confirming → marks Paid at pickup
      │
      ▼
Printable plant list (?view=plantlist) / CSV for flyers, Saturdays, partners
```

## Who does what each week
| When | Who | Task |
|---|---|---|
| Before Saturday | counters (Eric/Andrew/Keith/Raylene) | Submit the weekly count in the tool. This resets live stock. |
| As orders come in | whoever claims first | Put your name in **Claimed by**, reply with the template, send the pickup address only after you confirm. |
| Friday | one person | Open **Print plant list**, check it, print or save the PDF. |
| Saturday 10–2 | pickup crew | Ring sales on the invoice tool (stock goes down automatically). Mark web orders Paid/Payment method. |
| After Saturday | one person | Look over Web Orders for anything not picked up and set Status. |

## Fixing a wrong number
- **Small fix:** add a row in **Stock Adjustments**: Week key = current week, Plant, Size (`4"` / `1 gal`), Delta `+2` or `-1`, Source `manual`, and a Note.
- **Big fix:** submit a new weekly count. Old adjustments stop applying.
- Never edit the count JSON in **Submissions** by hand.

## Usability concerns and recommendations
1. **Too many links.** There's an invoice web app, a Netlify invoice v1, the website, the Sheet, and now a plant list. Keep **one internal URL** (the tool) with tabs for **Count / Invoice / Orders / Print list**, and one public URL (`order.html`). Retire or redirect the Netlify v1 so nobody invoices in two places.
2. **Duplicate shop.** A separate shoppable grid on `index.html` (another branch) would duplicate `order.html` and its stock logic. Keep `index.html` as marketing only, with "Shop / Order" linking to `order.html`.
3. **Only 4" and 1 gal are counted.** 2" and Tree pot can't be sold online ("ask us"). Either add them to the weekly count or decide that's intended.
4. **Tax is inclusive.** The invoice app treats $3/$6/$10/$15 as tax-included. The site says "prices include sales tax". Confirm that's the policy before launch.
5. **Who answers?** Every order emails the whole team. Without the **Claimed by** habit, two people will reply or nobody will. Set a rule (e.g. claim within 2 hours) and maybe a default owner per day.
6. **Website orders are invoices immediately.** They take an invoice number and decrement stock even if the customer never shows. Decide on a no-show rule (e.g. release after the next Saturday by adding a `+qty` adjustment with Source `release`).
7. **Customer receipt.** For web orders the existing receipt email is off by default (`SEND_CUSTOMER_RECEIPT=false`), because orders are unpaid and the address isn't sent yet. The template reply is the customer's first message.
8. **Name matching.** Stock is matched by common name (the part before "(...)"). Renaming a plant in Catalog mid-week can split its stock. Rename right after a weekly count.
9. **Public access.** The web app must be "Anyone" for the website. That exposes counts and the printable list publicly, but no customer data: GET returns only plants, sizes, prices and counts.
10. **Keep internal edits small.** The only changes to existing code are 3 one-line patches (doGet, doPost, submitInvoice) and one optional button.
