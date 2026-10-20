# IENN order reply: uniform template

One team member handles each reply. In Apps Script, run `buildResponseEmail("<invoice #>")`
to get this pre-filled from the IENN Invoices row, or copy it by hand.

**Subject:** Your IENN order #{{invoice}}

```
Hi {{first name}},

Thanks for your order with Inland Empire Native Nursery! Here are the details for order #{{invoice}}:

{{qty}} x {{plant}} ({{size}}) @ ${{price}} = ${{line total}}
...

Subtotal: ${{subtotal}}
Sales tax (estimate): ${{tax}}
Total: ${{total}}

Payment status: {{Paid | Not yet paid}}
Payment form: {{Cash | Zelle | ...}}            [TODO confirm accepted methods]

Pickup address: {{exact address, ONLY after the order is confirmed}}
Pickup date/time: {{window, default Saturdays 10 AM - 2 PM}}

Your notes:
> {{customer notes, quoted}}

Our response:
{{our answer / substitutions / anything else}}

Thank you for planting natives!
Inland Empire Native Nursery
```

Rules
- Prices by size: 2" $3, 4" $6, Tree pot $10, 1 gal $15. Tax shown as an estimate (8.75%) [TODO Eric confirm].
- The address prints only when the invoice Status is `Confirmed`/`Ready`; otherwise it says it will follow.
- Fields come from IENN Invoices columns set in `IENN_CFG.INVOICE_COLS` [TODO confirm names].
