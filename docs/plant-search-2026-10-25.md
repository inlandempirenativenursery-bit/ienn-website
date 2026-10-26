# Plant search, 2026-10-25

Eric picked a floating, plant-themed search button with no filter chips.

## Files
- `plant-search.js`: the button, search pill and icons.
- `shop.js`: the filter, `window.iennSearch(q)`, applied inside `render()`.
- `shop.css`: styles at the end of the file.
- `shop-settings.js`: `SEARCH_ICON`.
- Loaded on both index.html and order.html.

## Button and visibility
- **Button:** 54px round, lilac, with a light "juicy" edge and shadow.
- **Position:** bottom-right, 12px in, respecting iOS safe areas.
- **Above the tray bar:** when "View tray / Check out" shows, the button sits 12px above it. A MutationObserver watches the tray bar.
- **Above the keyboard:** while the search is open, it uses `visualViewport` to stay above the on-screen keyboard.
- **Layering:** z-index 55, so it's above the tray bar (50) and below the checkout drawer (60/61), the teaser and dialogs.
- **When it shows:** an IntersectionObserver on `#plant-list` with `rootMargin: 0px 0px -60% 0px`. It fades and springs in once the grid reaches the top 40% of the screen, and fades out once the last plant card scrolls above that line.
  - It never shows while the grid only has loading skeletons.
  - `prefers-reduced-motion` turns the animation off.

## Search
- **Opening:** tap the button. A pill (54px tall, up to 420px wide) grows out of the button, and the input gets focus.
  - It contains the icon, the "Search plants…" field, a clear (⊗) button and a close (✕) button.
  - Every button is a 44px tap target.
  - The input is 16px, so iOS doesn't zoom.
- **Filtering:** live, with a 120 ms debounce.
- **What it matches:**
  - Common name as displayed (e.g. "Datura"), the feed name, and the botanical name.
  - Case-, accent- and punctuation-insensitive, so "st catherines" finds St. Catherine's lace.
  - Each typed word must appear somewhere; partial words are OK ("monk" finds all three monkeyflowers).
- **Order:** matches keep the normal card order.
- **Hidden plants:** they stay hidden. They're removed before search ever sees them.
- **No results:** "No plants match "x". Clear search".
- **Scrolling:** if the grid start has scrolled above the screen while you type, the page jumps so the results are just under the header.
- **Clear (⊗):** shows all plants and keeps the field open.
- **Close (✕) and Esc:** clear the search, show all plants and return focus to the button.
- **Enter:** dismisses the keyboard.
- **Accessibility:** `role="search"`; the button has `aria-label="Search plants"` and `aria-expanded`; the input has a label; a polite live region announces "N plants match".

## Icons
Set with `SEARCH_ICON` in shop-settings.js, or preview with `?searchicon=`.
- `sprout` (default): a seedling inside a magnifier. It keeps the classic magnifier outline, so it still reads as "search" at small size, with the plant inside.
- `leaf`: a leaf with a small lens.
- `sage`: a sage sprig with a lens.

## Screenshots
In `docs/screenshots/plant-search/`, at 390px (iPhone 13, WebKit, mocked real feed):
- `visible-mid-grid-{sprout,leaf,sage}-390.png`
- `icons-side-by-side.png`
- `search-sage-390.png`
- `search-salvia-390.png`
- `search-no-results-390.png`
- `visible-with-tray-bar-390.png`
- `hidden-above-grid-390.png`
- `hidden-after-last-plant-390.png`
- `search-button-scroll-390.mp4` (15 s clip)
