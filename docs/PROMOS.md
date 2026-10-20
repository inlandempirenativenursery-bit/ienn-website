# Promo banner (Fall / Spring / Summer sales)

A pop-up the customer taps to close, shown on top of the shop when a promo is on. The shop and order flow are unchanged underneath.
Data lives in the **same inventory spreadsheet** the site already reads for stock, in one new tab: **Promos**.

## 1. Sheet change (the only one): add a tab named `Promos`
Row 1 headers (exact names not required, case doesn't matter):

| Active | Title | Message | Start date | End date | Discount note | Pages |
|---|---|---|---|---|---|---|
| no | Fall sale | Fall is the best time to plant natives. Stock up for the rainy season and pick up in Fontana on Saturday. | 2026-11-01 | 2026-11-30 | [Eric to fill] | all |
| no | Spring sale | Spring bloom is here. Reserve your natives online and pick up Saturday in Fontana. | [Eric to fill] | [Eric to fill] | [Eric to fill] | all |
| no | Summer sale | [Eric to fill] | [Eric to fill] | [Eric to fill] | [Eric to fill] | all |

- **Active**: `yes` or `no`. Only `yes` rows can show.
- **Title**: big heading (also the label on the small "reopen" pill). Required.
- **Message**: one or two sentences.
- **Start date / End date**: real dates or `yyyy-mm-dd` / `m/d/yyyy`. Both **inclusive**, Pacific time. Blank start = starts now, blank end = no end.
- **Discount note** (optional): shown in red, e.g. a % off. Anything in `[brackets]` is treated as a placeholder and never shown.
- **Pages** (optional): `order`, `home`, or `all` (blank = all).
- If several rows qualify, the **top one** wins. No discount amounts were invented; Eric fills them in.

## 2. Turning it on and off (team)
- **On**: set Active to `yes` and check the dates. Customers see it on their next page load (no redeploy).
- **Off**: set Active to `no` (or let the End date pass).
- Each customer sees a promo once. After they close it, a small pill with the title stays at the bottom-left, and tapping it reopens the promo. Changing the Title or Start date counts as a new promo and shows again.

## 3. Deploy (one time)
1. In the inventory tool's Apps Script project: **+ → Script**, name it `IENN_Promos`, and paste `apps-script/IENN_Promos.gs`.
2. Replace `IENN_Website.gs` with this repo's version. The only change is one line in `iennRoute_`: `if (p.view === 'promos') ...`.
3. **Deploy → Manage deployments → Edit → New version → Deploy** (same /exec URL, access "Anyone").
4. Check `<exec URL>?view=promos`. It should return `{"ok":true,"today":"…","promos":[]}`. No Promos tab = empty list, not an error.
5. The site already includes `promo.js` and `promo.css` on `index.html` and `order.html`.

## Testing
- `order.html?promo-test=1` / `index.html?promo-test=1`: sample Fall sale with no network and no date check. `?promo-test=reset` clears saved dismissals.
- `node tests/apps-script.test.js` (feed rules) and `python3 -m http.server 8766` + `NODE_PATH=<playwright> node tests/promo.e2e.js` (browser).
- If the feed fails or has no promo, nothing shows (silent).
