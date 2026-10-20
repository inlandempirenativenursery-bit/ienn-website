# IENN customer order response (uniform template)

Used by `apps-script/IENN_Drafts.gs` (IENN menu > **Draft reply for selected order**), which fills it from the order's rows in the "Sold" tab and saves it as a **Gmail draft** in the handler's account. It never sends to customers automatically. Review the draft, edit it, then send it yourself.

Keep this file and `RESPONSE_TEMPLATE` in `IENN_Drafts.gs` in sync.

Placeholders that stay visible until the team fills them in: `{{PICKUP_ADDRESS}}` (exact address, sent after confirmation) and `{{PAYMENT_METHOD}}` (e.g. Cash or Zelle; don't add a Zelle handle until it's confirmed).

---

**Subject:** Your Inland Empire Native Nursery order {{ORDER_ID}}

Hi {{CUSTOMER_NAME}},

Thanks for your order! Here's what we have for you:

Order: {{ORDER_ID}}

{{ITEMS}}
(one line per item: qty × plant (size) @ $price = $line total; prices include tax)

Total: ${{TOTAL}} (taxes included)

Payment status: {{PAID_STATUS}}
Payment method: {{PAYMENT_METHOD}}

Pickup: {{PICKUP_ADDRESS}} (Fontana) · Saturdays 10 AM – 2 PM
(Grand Terrace pickup available upon request. Other pickup times available case by case upon request.)

Your notes: {{CUSTOMER_NOTES}}

Our response:
{{OUR_RESPONSE}}

Questions? Call or text Andrew: (909) 609-9373

Thank you for supporting native plants!
Inland Empire Native Nursery
