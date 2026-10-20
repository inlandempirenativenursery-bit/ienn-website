# Promos tab (website promo banner)

The Promos tab is in the IENN Inventory sheet. Running `iennSetup` creates the tab with example rows set to Active = No. On an existing tab, it adds a **Bottom info** column if that column is missing and fills in the default only on untouched example rows (Message still starts with `EXAMPLE:`). The site shows the **first** row where Active = Yes and today (Pacific time) falls between Start date and End date. Those dates are inclusive, and a blank date means open-ended. The banner shows once per browser session. To preview it, add `?promo=preview` to any page link.

| Column | Also accepted | Required | Shown as |
|---|---|---|---|
| Active | On, Enabled | yes | Yes / No |
| Title | Name | yes | Large title, e.g. "Fall Sale" |
| Message | Text, Body | no | Main text |
| Start date | Start, From | no | e.g. 2026-11-01 or 11/1/2026 |
| End date | End, Until, To | no | "Through Nov 30" under the message |
| Discount note | Discount, Note | no | Optional pill in the red area. Leave blank: IENN is not running discounts |
| Bottom info | Footer, Info, Details, Fine print | no | Cream footer strip. A line break or ` \| ` starts a new line. Blank → `IENN_PROMO_BOTTOM_DEFAULT` in `IENN_Config.gs` ("Pickup Saturdays 10 AM – 2 PM in Fontana. \| Cash or Zelle at time of pickup.") |

Code: `apps-script/IENN_Config.gs` (`PROMO_*_HEADERS`, `IENN_PROMO_HEADERS`), `apps-script/IENN_Promos.gs`, and `promo.js` on the site.
