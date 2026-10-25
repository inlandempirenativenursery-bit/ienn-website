# Raylene's iPhone: "missing the bottom part" (2026-10-25)

## What her screenshot shows
The blank white card above "Printable plant list" is the **last plant card, Woollypod milkweed**. The feed has 31 plants and the grid has 2 columns, so this card sits alone on the left of the last row. It is a "Coming soon" plant, so it has no size buttons, stepper or "Add to tray", and the lower half of the fixed-height (436px) card is empty. Her screenshot shows only that empty lower half.

In WebKit with the iPhone 13 profile, the live page looks exactly the same: see `raylene-view-reproduced-webkit-iphone.png`. It is not a stuck loading skeleton. Her screenshot is from 2:06 PM PDT, before PR #43 (the loading-state change) went live, and the card has the normal card border, not the grey skeleton.

## Is anything missing below the shop?
**No.** I loaded the live site (v=539412a) in WebKit as iPhone 13 and in Chrome at 390px, both fresh and cached:
- All 31 cards render.
- Every section below the shop renders, fully visible: "Plants keep dying in this heat?", "Proven plants, hand-picked", "Easy as 1, 2, 3" (3 steps), "A yard that loves the heat" (5 icons), "Ready to grow the difference?" (CTA, "See all plants ↑", disclaimer), and the footer (pickup info, phone and email, Instagram, photo credits).
- There are no JavaScript errors, and no animation or opacity rule hides anything.

The page has no scroll-reveal effects. Her screenshot simply ends at "Easy as 1, 2, 3"; the rest of the page is further down.

## What changed compared with before PR #42
See `below-shop-before-vs-now-iphone.png`.
- **Reworded:** the four story blocks have Eric's new copy.
- **Added:** "A yard that loves the heat".
- **Removed:** "What success looks like" and "Skip the frustration". Removing these two was part of the PR #42 brief Eric approved.
- **Unchanged:** the 3 steps, the CTA band (only its heading text changed), the disclaimer, and the whole footer, including the Instagram link and pickup info.

Restoring the two removed sections is Eric's call, so they are **not** restored here.

## Teaser
`STARTER_TEASER_DELAY_MS` changed from 60000 to 30000. In tests, the teaser appeared after 29.2 s in WebKit and 28.8 s in Chrome. It loads its font about 1.5 s before showing, as before.
