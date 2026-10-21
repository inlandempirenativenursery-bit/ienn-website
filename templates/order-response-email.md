# IENN customer order confirmation (uniform "look, verify, confirm" template)

Built by `apps-script/IENN_Drafts.gs` (IENN menu > **Draft reply for selected order**). It is filled automatically from the order's row in **IENN Invoices** and saved as a **Gmail draft**. It is never sent automatically. The team member only has to **look** at the draft, **verify** the items, pickup date and address, and send it to **confirm**.

Keep this file and `RESPONSE_TEMPLATE` in `IENN_Drafts.gs` in sync.

| Field | Filled from |
|---|---|
| `{{CUSTOMER_NAME}}`, `{{ORDER_ID}}` | Order row |
| `{{ITEMS}}` | One line per item: qty × plant (size) @ $price = $line total (prices include tax) |
| `{{TOTAL}}` | Sum of the displayed prices (taxes included) |
| `{{PICKUP_ADDRESS}}` | **Stays as a placeholder.** The exact address isn't known yet, so type it in before sending (or set `PICKUP_ADDRESS` in `IENN_Config.gs`) |
| `{{PICKUP_AREA}}` | "Fontana area, near Sierra & Baseline, about 10 minutes from the 210" (context) |
| `{{PICKUP_SCHEDULE}}` | "Saturdays 10 a.m. – 2 p.m." |
| `{{PICKUP_DATE}}` | First Saturday on or after the order date (Pacific). Verify it before sending |
| `{{PAYMENT_TERMS}}` / `{{PAYMENT_CHOICE}}` | "Cash or Zelle at time of pickup." plus the customer's choice |
| `{{PAID_STATUS}}` | Paid column / Status |
| `{{CUSTOMER_NOTES}}`, `{{OUR_RESPONSE}}` | Customer's notes; the "Our response" column |
| `{{OWNER}}`, `{{PHONE}}` | Andrew, (909) 609-9373 |
| `{{PICKUP_FINE_PRINT}}` | Grand Terrace / other pickup times fine print |

---

**Subject:** Your Inland Empire Native Nursery order {{ORDER_ID}}

Hi {{CUSTOMER_NAME}},

Thanks for your order with Inland Empire Native Nursery! Please look it over and reply to confirm (or tell us what to change).

Order number: {{ORDER_ID}}

Your plants:
{{ITEMS}}

Total: ${{TOTAL}} (taxes included)

Pickup location: {{PICKUP_ADDRESS}} ({{PICKUP_AREA}})
Pickup schedule: {{PICKUP_SCHEDULE}}
Your pickup date: {{PICKUP_DATE}}

Payment: {{PAYMENT_TERMS}} (you chose …)
Payment status: {{PAID_STATUS}}

Your notes: {{CUSTOMER_NOTES}}

Our notes: {{OUR_RESPONSE}}

Questions or changes? Call or text {{OWNER}}: {{PHONE}}

Thank you for supporting native plants!
Inland Empire Native Nursery

Grand Terrace pickup available upon request.
Other pickup times available case by case upon request.
