# TESTING.md — IENN website review (2026-10-20)

Branch `review/site-fixes`, built on top of `order-page` (PR #1).

## How it was tested
- HTML validation: `npx html-validate index.html order.html` (inline-style rule off). **0 errors.**
- Headless Chrome via Playwright, at 375×812 (mobile) and 1280×900 (desktop): console errors, failed requests, horizontal overflow, and tap targets.
- Order form: checked that submitting with an empty cart is blocked; the +/− steppers update the summary.

## Results
| Check | index.html | order.html |
|---|---|---|
| Viewport meta | ✅ | ✅ |
| Horizontal overflow at 375px | ✅ none | ✅ none |
| JS console errors | ✅ none | ✅ none |
| Missing assets (logo, favicon) | ✅ none | ✅ none |
| Inputs have labels, types, autocomplete | n/a | ✅ name, email, tel |
| Tap targets ≥ 44px | ✅ (only the header logo link is below; acceptable) | ✅ |
| Empty-cart submit blocked | n/a | ✅ |

## Fixes in this branch
- order.html: removed the duplicated `<main>` tags (invalid HTML).
- order.html: added an **Order terms** box covering: order request only, availability, pricing/tax, no shipping or installs, and no plant-survival guarantee.
- order.html: added a **privacy notice** at the form (CalOPPA/CCPA basics) and a note explaining the mailto behavior.
- order.html: footer now has a contact email and a © line. Submit button renamed to "Submit Order Request". Email input has `inputmode`.
- index.html: removed the duplicate "Or use our simple email order form" link, which pointed to the same page as the button. Added a trailing newline.
- Earlier, in PR #1: DOCTYPE, skip link, `<main>`, © footer, survival/tax disclaimer, logo link fixed, labels, steppers.

## Needs Eric's input ([TODO] markers in the files)
1. **Order flow:** the form uses `mailto:`, which fails for people with no email app, and orders can get lost. Choose between the Apps Script order form (the old URL is in the README; PR #1 replaced it on the home page) and a form service.
2. **Prices and CA sales tax:** no prices are shown. Decide whether tax is included or added, and confirm the seller's permit.
3. **Return/replacement policy:** if any.
4. **Privacy policy page:** review the short notice and decide whether to add a full page.
5. **Contact:** confirm that hello@inlandempirenativenursery.com receives mail; add a phone number if you want one.
6. **Plant list:** "Blue Pyramid Cypress" is an Arizona cypress cultivar, not a California native. Confirm it belongs on a native-nursery list.
7. Photos are still "Photo" placeholders on the home page.

## Shop flow (branch `feature/shop-flow`, stacked on PR #2)

**What it does (order.html):** plant cards are built from one `PLANTS` list at the top of the second-to-last `<script>` in `order.html`. Each size has its own `stock` number. Edit stock there, and set it to 0 to mark that size out of stock.
- Badges: green **Available**. Green **Get yours now • only N left** when stock ≤ `LOW_STOCK` (5). Muted **Out of stock** when every size is 0, and the Add button is disabled.
- A size that's out of stock shows struck through and can't be picked. 1-gallon is picked by default when it's in stock.
- Pick size → set quantity (44px −/+ buttons) → **Add**. The quantity is capped at the stock that's left. The button shows "Max added" when the cart holds all of that size.
- Cart: "Your order" list with Remove buttons. A sticky bottom bar shows the item count and **Review order** (it floats bottom-right on desktop). The cart is saved in `localStorage` (`ienn-cart-v1`) and survives a reload. Items that are now out of stock are dropped from it on load.
- Submit: checks there's at least one plant, a name, and a valid email, with inline errors. It then adds the list to Notes, opens the email app (the **mailto delivery is unchanged**), and shows a confirmation panel with the order summary and a "Start a new order" button (which clears the cart).
- Styling uses only the existing palette (`--sage`, `--sage-dark`, `--cream`, `--lilac`, `--red`) and the existing card, stepper, and notice classes. The logo and imagery are untouched, and photos use the existing "Photo" placeholder (set `img` per plant later).
- The required notices from PR #2 (pickup, order terms, privacy, footer contact/©) are unchanged.

**Order delivery options (owner decision, not changed here):**
1. Current: `mailto:`. No backend, but it only works if the customer has an email app set up, and they must press Send.
2. Google Apps Script web app (or the existing Google order form): POST the same fields to a sheet. This is the most reliable free option.
3. A form service (Formspree, Netlify Forms, and similar): change the form `action` and keep everything else.

**[TODO]**
- Hook `PLANTS` to a published Google Sheet CSV so stock updates without editing code.
- Add prices once confirmed. None are shown on purpose.
- Add real stock numbers. The ones in the file are sample values.
- Home-page "Available now" cards are still static. They could read from the same list later.

**Tests run (headless Chrome, 2026-10-20):**
- `npx html-validate -c '{no-inline-style: off}' index.html order.html` → **0 errors**
- 375px and 1280px: no horizontal overflow, 0 console errors, and every button and size chip is at least 44px tall
- Flow: add 3 + 1 + 3 → bar shows "7 plants in order"; reload → the cart persists; Woolly 1-gal (stock 0) is disabled; Woolly 4-inch caps at 3 → "Max added"; a plant set to 0 for every size → "Out of stock" badge and Add disabled
- Submit with no email → blocked with an error. With valid input → confirmation shown and Notes filled with the list
- Screenshots: `/workspace/ienn-website-shots/shop-375.png`, `shop-1280.png`, `cart-375.png` (on the review box, not committed)

---

## Live inventory feed (`feature/inventory-feed`, stacked on #3)

The plant list in `order.html` now comes from **one setting**, `INVENTORY_URL`, near the bottom of the file.
It accepts **JSON** (an Apps Script `doGet` web app) or a **published-sheet CSV** ("File > Share > Publish to web > CSV").
Any new active row in the sheet shows up on the site on the next page load. No code changes needed.

**What was found:** the repo's only Google link is the existing IENN web app
the existing Apps Script customer view (URL removed: retired as a public link; the website is the only public order path)
(page title "Inland Empire Native Nursery — Invoice"). It returns HTML only (the customer order/invoice form), so it can't be fetched as data yet.
Its public server functions are `doGet, getSettings, saveTeamEmails, nextInvoiceNumber, getAvailableStock, getInitial, submitInvoice, buildReceiptText`.
`getInitial()` already returns `{plants, sizes, defaultPrices, stock: {plant: {'4"': n, '1 gal': n}}}`, and `order.html` reads that shape directly.
**Easiest wiring:** add a `view=json` branch to the existing `doGet` (see `docs/inventory-apps-script.gs`), redeploy, and set
`INVENTORY_URL = '<web app>/exec?view=json'`.

### Expected sheet columns (one row per plant per size) [TODO confirm the real names]
| column | required | example | meaning |
|---|---|---|---|
| name | yes | White Sage | plant name; rows with the same name are grouped into one card |
| size | yes | 1 gal / 4" | normalized to `1-gallon`, `4-inch`, and so on |
| stock | yes | 12 | on hand; 0 means "Out of stock" and Add is disabled |
| note | no | Classic aromatic sage | card blurb |
| image | no | images/white-sage.jpg | photo URL or path |
| rank | no | 1 | explicit sort order (lowest first) |
| featured | no | yes | pins it near the top |
| active | no | no | `no/false/0/hidden` hides the row from the site |
Aliases also work: plant/common name, qty/quantity/on hand, notes/description, photo, sort/priority, popular, show/visible.
The richer form `sizes: "4-inch:6|1-gallon:2"` in one cell also works.

### Sort order
1. Explicit `rank`. 2. `featured`. 3. Popular defaults (`POPULAR_DEFAULTS`: white sage, monkeyflower, California poppy, Cleveland sage, penstemon, ceanothus, buckwheat, woolly blue curls, milkweed, yarrow). 4. Everything else: in stock first, then A to Z.

### Fallbacks
- If the fetch fails or times out (10 s), the page shows "Live stock unavailable right now" and the **last cached list** (localStorage `ienn-inventory-v1`).
- If nothing is cached, it shows the **DEV_SAMPLE** list, labeled "Sample list (dev only) • not live stock". `INVENTORY_URL` must be set before launch.
- A "Live stock • updated <time>" line appears above the cards (it uses the feed's `updated` field, otherwise the fetch time).

### Tests run (headless Chrome, 2026-10-20). Mocks are in `test/mock/`, loaded with `?inventory=` (localhost only)
- `inventory.json`: rank first (Desert Mallow), then White Sage and Sticky Monkeyflower; the **new row** "Zauschneria (New Test Plant)" appears; the `active:no` row is hidden; Coyote Brush (stock 0) is Out of stock with Add disabled. ✅
- `inventory.csv`: a quoted CSV field and the `4"` size parse correctly; the featured new plant appears first; 0-stock rows are disabled. ✅
- `getinitial.json` (the existing Apps Script shape): renders, and stock maps by short name. ✅
- Missing URL (404): shows the notice and the cached list; with the cache cleared, it shows the labeled dev sample. ✅
- `npx html-validate -c '{no-inline-style: off}' index.html order.html`: **0 errors**. No horizontal overflow and no console errors at 375 or 1280.

---

## Orders, pricing, and one-system stock (`feature/orders-pricing`, stacked on #4)

Built on Eric's real setup: **one Apps Script project** (Index = internal; the old customer view is being retired) on the
**IENN Inventory** spreadsheet (`Catalog` + `Submissions`), invoices in **IENN Invoices** via `submitInvoice`.
The tool stays the single source of truth; the only new storage is one small **`Sold`** tab in the tool's own spreadsheet.

### What changed
- **order.html**: price per size on every size chip, line totals, subtotal, est. tax (8.75%) and est. total in the cart
  and the sticky bar ("4 plants • $51.00"). Tax is labeled an estimate, confirmed at pickup. 2-inch ($3) and quarter
  tree pots ($10) are shown as **available on request** (no weekly counts exist for them).
  Submit POSTs JSON as `text/plain` (no CORS preflight) to `ORDER_ENDPOINT`; success shows **Order received** with the
  invoice number, clears the cart, and re-fetches stock. Out-of-stock reply shows which line is short and refreshes stock.
  Network/server failure falls back to the existing mailto. `ORDER_ENDPOINT = ''` keeps mailto only.
  Size names map site ↔ tool: `4-inch ↔ 4"`, `1-gallon ↔ 1 gal`, `2-inch ↔ 2"`, `Quarter tree pot ↔ Tree pot`.
- **docs/inventory-apps-script.gs** (drop-in file for the existing project):
  - `getAvailableStock()` wrapper = existing latest-week aggregate − `Sold` rows for that week. Weekly counts are never edited.
  - `submitInvoice()` wrapper = LockService + oversell check + existing submit + log lines to `Sold`. **Both the Index
    invoices and website orders decrement stock**, and website orders land in IENN Invoices with the existing team email.
  - `?view=json` (website feed: Catalog names + available 4"/1 gal, prices, tax, week), `doPost` (orders),
    `?view=print` (printable plant list, IENN colors, popular-first, Counted / Sold since / Available, date, Print/Save-as-PDF
    button), `?view=csv` (spreadsheet export).
  - Optional short team email "New IENN order #<invoice>" with a link to the invoice row. Recipients come from
    `getSettings()` (saved by `saveTeamEmails`) or `TEAM_EMAILS` [TODO fill]. No addresses are hard-coded.
  - `buildResponseEmail(invoiceNo)` pre-fills `docs/order-response-template.md`.

### Tests (2026-10-20)
- `node test/gs.test.js`: **12/12 pass** (stubbed SpreadsheetApp/MailApp/LockService/ContentService and the existing
  `getAvailableStockRaw_`/`submitInvoiceRaw_`): feed shape; website order → invoice + Sold rows + stock drops + Submissions
  untouched + email subject/link + lock released; Index invoice also decrements; **oversell rejected** (no invoice, no Sold,
  no mail); back-to-back orders; new count week resets the offset; on-request sizes refused online; validation; no team
  emails; response email (address hidden until Confirmed, Paid/Not yet paid, quoted notes); bad JSON; print + CSV.
- `test/e2e.playwright.js` (headless Chrome, mocked endpoints, 375 + 1280): chip prices, line totals, subtotal $51.00,
  tax $4.46, total $55.46; POST is `text/plain` with tool size names; confirmation with order #; cart cleared; stock re-fetched;
  out-of-stock message; HTTP 500 → mailto fallback; no endpoint → mailto. **0 console errors, no horizontal overflow.**
- `npx html-validate index.html order.html` (inline-style off): **0 errors.**
- Screenshots (review box, not committed): `/workspace/ienn-website-shots/prices-375.png`, `confirm-375.png`.

### Assumptions / open questions [TODO confirm]
1. `getAvailableStock()` returns `{ "<common name>": { '4"': n, '1 gal': n } }` from Submissions JSON keys `four` / `gal1`.
2. Submissions has a **`Week`** column; the latest week is the max value. Sold rows count only against that week.
3. `submitInvoice(payload)` accepts `{customer:{name,email,phone}, items:[{plant,size,qty,price}], notes, source}` and returns
   `{invoiceNo}` or the number. If the Index form uses other keys, edit only `ienToInvoicePayload_`.
4. Catalog columns `id` / `Common name`; IENN Invoices column names in `INVOICE_COLS`; set `INVOICES_SPREADSHEET_ID`.
5. **2" and Tree pot**: no counts, so "on request" (not orderable online). Eric: add counts to Submissions, or keep as is?
6. Tax 8.75% estimate and whether it's added on top. Accepted payment methods (page says Cash or Zelle).
7. Logo on the print page: set `IENN_LOGO_URL` to a public copy of the locked logo (text header used until then).

### Deploy checklist for Eric
1. Open the IENN inventory Apps Script project (Extensions > Apps Script from IENN Inventory).
2. **+ File > Script**, name it `website`, paste all of `docs/inventory-apps-script.gs`.
3. In the existing code: rename `function getAvailableStock(` → `function getAvailableStockRaw_(` and
   `function submitInvoice(` → `function submitInvoiceRaw_(`.
4. At the top of the existing `doGet(e)` add: `var web = ienWebsiteGet_(e); if (web) return web;`
5. In the Index view's HTML menu add: `<a href="?view=print" target="_top">Print plant list</a>`.
6. In `IENN_CFG` set `INVOICES_SPREADSHEET_ID` (and `INVOICES_SHEET` if not the first tab); check the column names.
   Make sure team emails are saved (Eric, Andrew, Keith, Raylene) via the existing team-email setting, or fill `TEAM_EMAILS`.
7. Run `inventoryFeed_` once from the editor to authorize; check the new `Sold` tab appears after a test invoice.
8. **Deploy > Manage deployments > Edit > New version**, Execute as **Me**, access **Anyone**. Keep the same /exec URL.
9. In `order.html` set `INVENTORY_URL = '<exec>?view=json'` and `ORDER_ENDPOINT = '<exec>'`.
10. Test: place a 1-plant website order → invoice in IENN Invoices, team email, `Sold` row, number drops on the site and Index.

---

## Simplicity check (usability review)

```
Weekly counts (Index › Count) ──► Submissions ─┐
                                               ├─► getAvailableStock = latest week − Sold ──► website shop (?view=json)
Invoices (Index › Invoice) ──┐                 │                                         └─► Print list / CSV
Website order (doPost) ──────┴─► submitInvoice ─► IENN Invoices + team email ─► Sold row ─┘ (stock drops everywhere)
```

**Friction points**
1. Several URLs (Index, `?view=customer`, Google order form, website) — the team may not know which is "the" one.
2. Numbers drop between weekly counts with no explanation → confusion ("I counted 12, why does it say 9?").
3. 2" and Tree pot have prices but no counts, so the shop can't show live stock for them.
4. Two emails per website order (existing invoice email + the short "New IENN order" note).
5. Reply process: who answers, and where the pickup address/payment status live, isn't obvious.
6. Website order links still split between the order page and the old Google form (PR #1).

**Recommendations (✅ = done in this PR)**
- ✅ One URL for everything: the same /exec serves Index, customer, json, print, csv, and orders.
- ✅ Sold visibility: `Sold` tab + print/CSV columns *Counted / Sold since / Available*.
- ✅ Print plant list + CSV export; link snippet for the Index menu.
- ✅ Uniform reply via `buildResponseEmail` + template; team email says one person replies.
- ✅ 2"/Tree pot clearly labeled "on request" on the site instead of fake stock.
- Next: one home menu in Index — **Count · Invoice · Orders · Print list** (needs the Index HTML, not in this repo).
- Next: turn off `WEBSITE_TEAM_NOTICE` if the existing invoice email is enough (one email per order).
- Next: retire the Google order form link so the website is the one customer entry point.


---

## Update: Eric's clarifications (2026-10-20, same PR)
- **One public order path: the website.** README no longer lists the Apps Script customer URL; index.html CTAs and footer
  point to `order.html`. The Index invoice tool is **team-only** (phone, FB Marketplace). Both channels go through
  `submitInvoice` → IENN Invoices + `Sold`, tagged **Source = Website** or **Source = Internal**.
  `.gs` notes that `?view=customer` should be retired or redirected to the website (`WEBSITE_ORDER_URL`) [TODO Eric].
- **2" and Tree pot:** consistent "Ask us, available on request" wording on the site, print list and CSV.
- **Andrew owns order-to-pickup.** The team email goes to everyone and says "Andrew claims and handles this order".
  New invoice rows get **Claimed by = Andrew** and **Status = New** (columns are added if missing). Flow:
  New → Claimed → Confirmed → Ready → Picked up. The pickup address appears in the reply only at Confirmed or later.
  The reply is signed "Andrew, for Inland Empire Native Nursery".
- **Taxes included in all prices.** The 8.75% math is removed everywhere (site, `.gs`, email, template, print/CSV).
  Total = sum of line totals. A single "Taxes included" note sits under the cart total on the order page. The `.gs` adds
  no tax; backing tax out for reporting is a [TODO Eric]. Earlier references in this file to 8.75% tax, "est. tax" and
  $4.46/$55.46 are **superseded**.
- **Fallback contact:** Andrew, call/text **(909) 609-9373** (`tel:` + `sms:` links) in the order page's
  send note and "didn't go through" message, the order-page and home footers, and the reply template. Email/mailto stays
  as the secondary fallback. The "didn't go through" note hides when an order succeeds.
- Kept narrow for Kobe's design pass: no new styles or classes; only text, one `id` (`fallback-note`), and JS logic.

### Tests (re-run)
- `node test/gs.test.js`: **12/12 pass**. Added: Source=Website/Internal on invoice + Sold, Status=New + Claimed by=Andrew
  created on the invoice row, email says Andrew claims it and lists the status flow, total $48.00 (taxes included, no tax
  field), reply signed by Andrew with the phone number, address still hidden at Claimed, print/CSV say "Taxes included"
  and "Ask us".
- Playwright 375 + 1280: total **$51.00** = sum of lines, exactly **one** "Taxes included" note, no "8.75"/"sales tax"
  anywhere, footer `tel:` link, fallback `tel:`/`sms:` links on server failure, fallback note hidden on success.
  0 console errors, no horizontal overflow.
- `npx html-validate index.html order.html`: **0 errors** (phone numbers use non-breaking space/hyphen).
- Screenshots refreshed: `/workspace/ienn-website-shots/prices-375.png`, `confirm-375.png`.

### Deploy checklist additions
- In IENN_CFG set `WEBSITE_ORDER_URL`, then redirect or remove the `?view=customer` branch in `doGet`.
- Stop sharing the old customer-view / Google order form links anywhere public (bio links, FB posts).
- Make sure IENN Invoices can take the `Source`, `Status` and `Claimed by` columns (added automatically on first order).
