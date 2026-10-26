# Plant search, 2026-10-25

**Rev 2 (Eric's feedback):** "smaller, more to the right", "I don't like the icons". As a compromise with Amazon's pinned search bar, the plant icons are gone. Search is now a plain magnifier circle in the header that opens a search bar sliding down from the top.

## Files
- `plant-search.js`: the button and the slide-down bar.
- `shop.js`: the filter, `window.iennSearch(q)`, applied in `render()`. Unchanged from rev 1.
- `shop.css`: the plant-search section at the end.
- `shop-settings.js`: `SEARCH_PLACEMENT`.
- Loaded on both index.html and order.html.

## Placement: `SEARCH_PLACEMENT` (preview with `?searchplace=corner`)

### `header` (default)
A small circle with a magnifier glyph: cream fill, lilac edge, sage glyph, light shadow.
- **Mobile:** sits on the title row, right of "Inland Empire Native Nursery".
- **Desktop:** sits just left of the Instagram link.
- **Unchanged:** the logo, title and script tagline don't move or shrink.
- **Size:** fitted to the free space beside the title, with at least 5px of gap:

  | Screen | Circle | Gap to title | From edge |
  |---|---|---|---|
  | 360 | 28px | 5px | 4px |
  | 390 | 31px | 7px | 4px |
  | 430 | 38px | — | — |
  | Desktop | 38px | — | — |

  The tap target is always 44×44.
- **Pinned while scrolling:**
  - index.html: the header is already sticky.
  - order.html: the header isn't sticky, so only the button is fixed at the title-row height in the top-right corner. It stays under the checkout drawer (z-index 59).
- **Visible on the whole page,** hidden only while the search bar is open.

### `corner`
A 40px circle with a lilac fill.
- **Position:** bottom-right, 8px from the edge, respecting the iPhone safe area.
- **Visibility:** shows only while the plant grid is on screen (it reaches the top 40% of the screen), and hides after the last plant card.
- **Tray bar:** sits 10–12px above the tray bar when it shows.

## Search bar (both placements)
- **Opening:** tap the circle. A full-width bar slides down from the top (0.24 s). It holds a magnifier, the "Search plants…" field (already focused, 16px so iOS doesn't zoom), clear ⊗ and close ✕.
- **Filtering:** live, with a 120 ms debounce.
- **Scrolling:** the page scrolls so the results start just under the bar (and under the sticky header on index). Typing from the story section below the grid jumps back up to the grid.
- **Clear ⊗:** shows all plants again and keeps the bar open.
- **Close ✕ and Esc:** clear the search, show all plants, slide the bar away and return focus to the circle.
- **Enter:** dismisses the keyboard.
- **Reduced motion:** turns the slide animation off.

## Matching (unchanged from rev 1)
- Searches the common name as displayed (e.g. "Datura"), the feed name, and the botanical name.
- Ignores case, accents and punctuation, so "st catherines" finds St. Catherine's lace.
- Every typed word must appear somewhere; partial words are OK.
- Matches keep the normal card order. Hidden plants never appear.
- No matches shows: No plants match "x". Clear search.

## Accessibility
- The button has `aria-label="Search plants"`, `aria-expanded` and `aria-controls`.
- The bar has `role="search"`, and the input has a label.
- When the bar is closed, it is `aria-hidden` and its controls are removed from the tab order.
- A polite live region announces "N plants match".

## Screenshots
In `docs/screenshots/plant-search/`:
- `header-top-360.png`
- `header-top-390.png`
- `header-pinned-mid-page-390.png`
- `search-open-sage-390.png`
- `search-no-results-390.png`
- `corner-mid-grid-390.png`
- `corner-search-open-390.png`
- `desktop-header-1280.png`
- `desktop-search-salvia-1280.png`
- `header-search-clip-390.mp4`
