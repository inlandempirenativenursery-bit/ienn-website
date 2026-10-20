# IENN order reply: uniform template

**Andrew owns order-to-pickup.** The team email goes to everyone; Andrew claims each order
(`Claimed by` = Andrew) and sends this reply. Status flow in IENN Invoices:
**New → Claimed → Confirmed → Ready → Picked up**.
In Apps Script, run `buildResponseEmail("<invoice #>")` to get this pre-filled from the invoice row.

**Subject:** Your IENN order #{{invoice}}

```
Hi {{first name}},

Thanks for your order with Inland Empire Native Nursery! Here are the details for order #{{invoice}}:

{{qty}} x {{plant}} ({{size}}) @ ${{price}}
...

Total: ${{total}} (taxes included)

Payment status: {{Paid | Not yet paid}}
Payment form: {{Cash | Zelle | ...}}            [TODO confirm accepted methods]

Pickup address (Fontana): {{exact address, ONLY once Status is Confirmed or later}}
Pickup date/time: {{window, default Saturdays 10 AM - 2 PM}}

Your notes:
> {{customer notes, quoted}}

Our response:
{{our answer / substitutions / anything else}}

Questions? Call or text me at (909) 609-9373.

Thank you for planting natives!
Andrew, for Inland Empire Native Nursery
```

Rules
- Pickup is in Fontana. Grand Terrace pickup only if the customer asked and we agreed (upon request).
- Prices by size, **taxes included**: 2" $3, 4" $6, Tree pot $10, 1 gal $15. 2" and Tree pot: Ask us, available on request.
- Total = sum of the lines. No tax is added. (If tax must be reported, back it out of the total [TODO Eric].)
- Fields come from IENN Invoices columns in `IENN_CFG.INVOICE_COLS` [TODO confirm names].
