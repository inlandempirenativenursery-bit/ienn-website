# Promo banner comparison (for Eric)

Sample "Fall sale" content in every shot. Phone = 375px wide, desktop = 1280px.

| Option | Phone | Desktop | Source |
|---|---|---|---|
| **Lobo – PR #7** | [lobo-pr7-phone.png](lobo-pr7-phone.png) | [lobo-pr7-desktop.png](lobo-pr7-desktop.png) | branch `feature/promo-banner`, `order.html?promo-test=1` |
| **Robo – PR #1** | [robo-pr1-phone.png](robo-pr1-phone.png) | [robo-pr1-desktop.png](robo-pr1-desktop.png) | branch `order-page`, `js/promo-banner.js`, `order.html?promo=preview` (script tag added on a local copy only; branch not changed) |
| **Current main** | [main-promo-phone.png](main-promo-phone.png) | [main-promo-desktop.png](main-promo-desktop.png) | commit d470e41 (sheet-driven pop-up), `order.html?promo=preview` |

Lobo #7 and main are centered pop-ups (green vs red button). Robo #1 is a bottom sheet that leaves the page above visible.
