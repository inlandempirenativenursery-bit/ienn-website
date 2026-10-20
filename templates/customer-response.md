# Customer reply template (copy/paste — not auto-sent)

Generate a filled copy from the **Web Orders** tab with `ienn_buildCustomerReply_("<Invoice no>")` in the Apps Script editor
(check the Execution log), or fill the fields below by hand. Keep this file and the helper in sync.

---

Hi {{first name}},

Thanks for your order with Inland Empire Native Nursery! Here are the details for order #{{Invoice no}}:

{{Items — qty x plant (size) @ price = line total}}
Total: ${{Total}} (sales tax included)

Payment: {{Paid? "Paid (Cash/Zelle) — thank you!" : "Not yet paid. We accept cash or Zelle at pickup."}}
Fulfillment: {{Saturday pickup in Fontana / Grand Terrace delivery request}}
Pickup: Saturdays 10 AM – 2 PM.
Pickup address: {{ONLY after the order is confirmed — exact Fontana address near Sierra & Baseline (~10 min from the 210)}}
Grand Terrace delivery/service is handled case-by-case — we'll confirm with you directly if you requested it.

Your notes: {{Notes}}
Our response: {{Our response}}

See you soon,
Inland Empire Native Nursery

---
After sending (Web Orders tab): put your name in **Claimed by**, fill **Pickup address sent**, **Our response**, set **Status** (Confirmed / Picked up), and **Paid** / **Payment method** when paid.
