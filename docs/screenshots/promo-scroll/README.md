# Promo banner: scroll style options

Both versions are CSS only and pull their text from the active Promos row. To preview on any page, add `?promo=preview` to its link. The long-text shots use a made-up sample promo.

| | Current (on main) | Alternative (ribbon with notched tails) |
|---|---|---|
| 375px | ![](current-375.png) | ![](alt-375.png) |
| 375px, long text | ![](current-375-long.png) | ![](alt-375-long.png) |
| 1280px | ![](current-1280.png) | ![](alt-1280.png) |

The alternative's code is on branch `kobe/promo-scroll-alt`. It is not merged.

## With bottom info

There is a cream footer strip at the bottom of the scroll, modeled on the footer strip from Lobo's #7 that Eric liked. It shows the discount, the end date and the pickup fine print.

| 375px (blank Bottom info → default) | 375px, long text (custom Bottom info) | 1280px |
|---|---|---|
| ![](bottom-info-375.png) | ![](bottom-info-375-long.png) | ![](bottom-info-1280.png) |

**To edit it in the sheet:** use the **Bottom info** column in the Promos tab. Its header can also be named Footer, Info, Details or Fine print. Type whatever you want the footer to say. Alt+Enter (Mac: Ctrl+Option+Enter) starts a new line inside the cell.

If you leave it blank, the strip shows the Discount note, then "Ends <end date>", then "Pickup Saturdays 10 AM–2 PM in Fontana. Taxes included. Grand Terrace pickup and other times available upon request." When Bottom info is filled in, the discount and dates show in the red area instead. See [PROMOS.md](../../../PROMOS.md).
