# Plant search, 2026-10-25

Rev 4: suggest, then navigate. Nothing jumps while you type.

## Why
Eric's iPhone recording of rev 3 showed two problems:
- Typing filtered the grid and scrolled the page, which was overwhelming.
- With the keyboard open, the search bar and its suggestions scrolled off screen.

## Behavior
- **The button:** a magnifier circle top-right in the header. It's the default, `SEARCH_PLACEMENT = "header"`. The `"corner"` alternative is still available with `?searchplace=corner`.
  - The circle is fitted beside the title: 28px at 360, 31px at 390, 38px on desktop. The tap target is always 44px.
  - It is pinned while scrolling.
- **Opening:** tap the circle. A search bar slides down from the top with "Search plants…" focused, clear ⊗ and close ✕.
- **Typing:** only the suggestion list changes. **The page doesn't scroll and the grid isn't filtered.**
  - Up to 6 suggestions, from the first letter.
  - Each row has a 32px photo, the common name with the match in bold, and the botanical name in small italics.
  - Order: common name starts with it, then a common word starts with it, then botanical starts with it, then a botanical word, then any other match.
  - Case, accents and punctuation are ignored. Hidden plants are never suggested, and plants appear by their site name ("Datura").
  - No match shows a row inside the list: No plants match "x".
- **Picking:** tap a suggestion, or use ↑/↓ then Enter.
  1. The keyboard closes and the bar closes back into the circle.
  2. The page smooth-scrolls until the card sits 12px below the sticky header (12px from the top on order.html).
  3. The card glows lilac for about 1.2 s.
  4. Focus moves to the card for screen readers.

  All plants stay on the page. If the card isn't rendered yet (the grid loads in batches of 12), the batches up to it are rendered first.
- **Enter with nothing highlighted:** goes to the top suggestion. With no match, it does nothing and the "No plants match" row stays.
- **Closing:**
  - Esc closes the list first; a second Esc closes the bar.
  - Close ✕ closes the bar.
  - Clear ⊗ empties the field and keeps it focused.
  - A tap outside the bar closes the list.
  - Closing never moves the page.
- **Reduced motion:** the scroll is instant and the glow is a static ring.
- **Removed:** the filtered-grid mode, its "N plants match" announcement, the in-grid no-results box and the jump to the grid.
- **Screen readers:** a polite live region announces the number of suggestions ("6 suggestions", "No plants match") and "Showing <plant>" after a pick.

## iOS keyboard handling
- The bar is `position:fixed`, and its `top` follows `visualViewport.offsetTop` while open. If Safari pans the page under the keyboard, the bar stays at the top of what's actually visible.
- The list's max height is capped at the visible space (`visualViewport.height`), so the keyboard never covers it; the list scrolls inside if needed.
- No `scrollIntoView` is used. The input is focused with `preventScroll`, and arrow-key highlighting scrolls only the list.
- The input is 16px, so iOS doesn't zoom.
- After a pick, the scroll waits about 0.3 s for the keyboard to finish closing.
- **Tested** in WebKit with an emulated iPhone 13. A stand-in visual viewport simulated the keyboard panning the page down 180px and leaving 330px visible: the bar moved to y=180, and the list ended at 506 (visible bottom 510).

## Code
- `shop.js` exposes `iennSearchPlants()`, `iennSearchNorm()` and `iennCardFor(id)`. The last one renders more batches if needed and returns the card.
- `plant-search.js` has all of the UI.
- `shop.css` has the plant-search section.
- Loaded on index.html and order.html.

## Screenshots
In `docs/screenshots/plant-search/`:
- `typing-sa-mid-page-390.png`
- `no-match-row-390.png`
- `picked-card-glow-390.png`
- `desktop-suggest-keyboard-1280.png`
- `desktop-picked-1280.png`
- `suggest-navigate-clip-390.mp4`
- Unchanged: `header-top-360.png`, `header-top-390.png`, `header-pinned-mid-page-390.png`, `desktop-header-1280.png`, `corner-mid-grid-390.png`
