# Promos tab (website promo banner)

The Promos tab is in the IENN Inventory sheet. Running `iennSetup` creates the tab with example rows set to Active = No. On an existing tab, it adds a **Bottom info** column if that column is missing. The site shows the **first** row where Active = Yes and today (Pacific time) falls between Start date and End date. Those dates are inclusive, and a blank date means open-ended. The banner shows once per browser session. To preview it, add `?promo=preview` to any page link.

**House style:** keep it warm and seasonal ("Fall is the best time to get plants started…"). The team prefers **no discounts or percentages** in promos.

| Column | Also accepted | Required | Shown as |
|---|---|---|---|
| Active | On, Enabled | yes | Yes / No |
| Title | Name | yes | Large title, e.g. "Fall Sale" |
| Message | Text, Body | no | Main text |
| Start date | Start, From | no | e.g. 2026-11-01 or 11/1/2026 |
| End date | End, Until, To | no | "Ends Nov 30" in the default footer strip (if you fill in Bottom info, write the end date there yourself) |
| Highlight | Discount note, Discount, Note (old headers) | no | Optional short bold line, e.g. "New fall plants in stock". Leave blank normally. |
| Bottom info | Footer, Info, Details, Fine print | no | Cream footer strip. Line breaks (Alt+Enter) are kept. |

**If Bottom info is blank,** the strip shows "Ends <end date> · Pickup Saturdays 10 AM–2 PM in Fontana · Taxes included", then "Grand Terrace pickup available upon request. Other pickup times available case by case upon request." The Highlight is added above it only if one is filled in.

Example Fall row: Title `Fall Sale`, Message `Native plants are available now. Fall is the best time to get plants started, with cool weather and winter rains to help roots settle in.`, Bottom info `Ends Nov 30 · Pickup Saturdays 10 AM–2 PM in Fontana · Taxes included` plus the fine print line.

Code: `apps-script/IENN_Config.gs` (`PROMO_*_HEADERS`, `IENN_PROMO_HEADERS`), `apps-script/IENN_Promos.gs`, and `promo.js` on the site.
