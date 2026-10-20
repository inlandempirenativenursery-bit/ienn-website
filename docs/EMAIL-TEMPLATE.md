# Customer confirmation email (uniform template)

Built by `iennBuildReply_` in `apps-script/IENN_Drafts.gs`, using the `RESPONSE_TEMPLATE` there plus the constants in `apps-script/IENN_Config.gs`.
How to use it: in IENN Invoices, select the order row, type any notes in **Our response**, then choose **IENN → Draft reply for selected order**. A Gmail **draft** is created. Look it over, check it, then send. Nothing is sent automatically.

**Still to fill in:** the exact pickup address. `PICKUP_ADDRESS` in `IENN_Config.gs` is still `{{PICKUP_ADDRESS}}`.

## Filled sample (EXAMPLE ORDER, made-up customer and items)

> **To:** ana@example.com  ·  **Subject:** Your Inland Empire Native Nursery order INV-1234

```
Hi Ana Lopez,

Thanks for your order! Please look it over below and let us know if anything needs to change.

Order number: INV-1234

Items:
  - 2 × White Sage (4") @ $6 = $12.00
  - 1 × Sticky Monkeyflower (1 gal) @ $15 = $15.00

Total: $27.00 (taxes included)

Payment: Cash or Zelle at time of pickup
Payment status: Not paid yet (pay at pickup)

Pickup location: {{PICKUP_ADDRESS}}, Fontana
Pickup hours: Saturdays 10 AM – 2 PM
Grand Terrace pickup available upon request.
Other pickup times available case by case upon request.

Your notes: Can I pick up after 1 PM?

Our notes: Yes, 1 PM works. See you Saturday!

Questions? Call or text Andrew: (909) 609-9373

Thank you for supporting native plants!
Inland Empire Native Nursery
```

## Team new-order email recipients
- **To:** Andrew (`TEAM_EMAIL_TO`)
- **CC:** Eric and Keith (`TEAM_EMAIL_CC`)
- Raylene is not on order emails.
Addresses are still placeholders, and placeholder addresses are skipped. Note that the existing `submitInvoice` sends the team notice. This extra To/CC email only goes out if `IENN_EXTRA_TEAM_EMAIL = true`.
