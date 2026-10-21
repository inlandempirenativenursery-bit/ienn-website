# Order page review — Oct 20, 2026

Before = main at ec7d999, after = this commit. Both use the LIVE inventory feed (it has no weekly count yet, so stock shows as "We'll confirm availability").

| Shot | What it shows |
|---|---|
| before-375.png / before-1280.png | Old page: long intro and pickup box above the cards, 1 column on phones, first size preselected in green |
| after-375.png / after-1280.png | Cards right under a compact header, 2 columns on phones (4 on desktop), photos first |
| after-375-chip-selected.png | A chip turns green only after it's tapped |
| after-375-cartbar.png / after-1280-cartbar.png | Sticky cart bar: item count, total, **Reserve** |
| after-375-checkout.png / after-1280-checkout.png | Reserve jumps to the tray and the short form (stopped before submit, no order sent) |

## Fixes
1. **Size chips**: all chips start cream with a sage border. Nothing is preselected. A chip turns green (`aria-pressed="true"`) only when tapped. Add reads "Pick a size" and stays disabled until a size is chosen. With one size, Add works but the chip isn't highlighted.
2. **Stock** (`stock-view.js`): exact counts are never shown. Once a real count exists, 0-qty size chips are hidden, and plants with every tracked size at 0 are hidden. Below 5, or when the wanted quantity is more than we have, a neutral "Ask us: call or text Andrew" note appears, and the stepper is capped at what's available. Good stock shows "Available · Get yours now". **No baseline guard:** if the feed's `baseline`/`countDate` is null, or every tracked qty is 0 or null, stock is treated as unknown and every plant is shown, so the shop never goes blank. 2-inch and tree pot stay "on request".
3. **Scroll-and-add**: compact header with the slogan, the Select → Reserve → Pick up strip, and a one-line hint. The pickup/payment box (now with "near Sierra & Baseline, about 10 minutes from the 210") moved down beside the checkout form. The grid is continuous, with square photos, a big red Add button, lazy images and progressive rendering (12 cards at a time as you scroll). The sticky cart bar shows the count, total and Reserve.
4. Placeholder cards keep the soft leaf tile at the same square size.

Tests: `node tests/stock-view.test.js`, `node tests/apps-script.test.js`, `BASE=http://localhost:PORT/ node tests/review-oct20.e2e.js` (`LIVE` feed; order POSTs are blocked), `node tests/photos.e2e.js`.
