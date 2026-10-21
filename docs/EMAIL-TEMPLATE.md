# IENN order emails (sample, fake data)

Generated from the Apps Script code by the test suite. Exact addresses and team emails live only in Apps Script config and are shown here as {{PLACEHOLDERS}}.

## 1. Team alert (automatic) — To Andrew, CC Eric + Keith

```
To: {{TEAM_TO}}
Subject: New IENN order IEN-2026-003 — Ana Lopez
CC: {{TEAM_CC}}

A new order came in (website).

Order: IEN-2026-003
Customer: Ana Lopez <ana@example.com>

  1 × White sage (Salvia apiana) (4") = $6.00

Total: $6.00 (taxes included)
Notes: Website order — Ana Lopez · 9095550100
Pickup: Saturday
Pays by: Zelle
Sat 11

Andrew is handling this order (order-to-pickup).

View details: {{INVOICES_SHEET_URL}}
If someone else takes it, change Handled by in IENN Invoices.
```

## 2. Customer order copy (automatic, sent on submit)

Never contains an exact address or ZIP.

```
Subject: Your Inland Empire Native Nursery order — IEN-2026-003

Inland Empire Native Nursery
Fontana, CA · 1 (909) 609-9373 · plants@inlandempirenativenursery.com

Thanks for your order! Here is your copy.

Order number: IEN-2026-003
Date: 2026-10-20

Your plants:
  1 x White sage (Salvia apiana) - 4" - $6.00

TOTAL (taxes included): $6.00

Your notes: Pickup preference: Saturday
Sat 11

PICKUP
Saturdays 10 AM – 2 PM, other times case by case on request.
We’ll email to confirm your pickup time.

LOCATION
Near Sierra & Baseline in Fontana, about 10 minutes from the 210. The exact address is sent after we confirm your order.

PAYMENT
Cash or Zelle at time of pickup. You chose: Zelle.

Questions? Call or text Andrew: (909) 609-9373, or email plants@inlandempirenativenursery.com

All sales are final. Plants are sold as-is. No returns, exchanges, or refunds after pickup.
Identity is as marked on this receipt. No warranty beyond defects obvious at the time of pickup.
```

## 3. Thank-you / pickup confirmation (Gmail DRAFT, never auto-sent)

Created when Andrew runs `iennConfirmAndDraftLatest()` or `iennConfirmAndDraft('IEN-…')`. Andrew edits and presses Send.

```
Subject: Your Inland Empire Native Nursery order IEN-2026-003

Hi Ana Lopez,

Thanks for ordering, and thanks for choosing us.

Order number: IEN-2026-003

Your plants:
  - 1 × White sage (4-inch pot) @ $6 = $6.00

Total: $6.00 (taxes included)

Confirming your pickup time: Saturday, October 24, 2026 (Saturdays 10 AM – 2 PM)

Here's the location: {{PICKUP_ADDRESS}}

Payment: Cash or Zelle at time of pickup (you chose Zelle).

Your notes: Sat 11

If you have any questions, don't hesitate to reach out. Call or text Andrew: (909) 609-9373

Thank you for supporting native plants!
Inland Empire Native Nursery

Grand Terrace pickup available upon request.
Other pickup times available case by case upon request.
Alternate pickup (available upon request): {{PICKUP_ALT_ADDRESS}}
```
