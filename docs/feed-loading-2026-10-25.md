# Why the shop sometimes showed only a few plants (2026-10-25)

Eric reported that the live site (v=f26275f) sometimes shows only a few plants instead of the whole inventory.

## Findings
- **The feed itself is healthy.** I made 58 requests to `?view=inventory` between 14:07 and 14:12 PDT, some of them 4 at a time. All 58 returned HTTP 200 after the usual 302 redirect, and every one had 31 plants. There were no errors, HTML pages or quota replies. But the feed is slow: latency was 4.8 s minimum, 6.9 s median, 8.8 s p90 and 10.0 s maximum. Parallel requests were no slower (6.9 s median).
- **First-time visitors see a 3-plant list for 5–10 s.** I loaded the live homepage 16 times at 390px, each in a fresh browser with nothing cached. In all 16 runs, the cards shown at 1 s and 3 s were exactly 3: Woolly Blue Curls, Southern bush monkeyflower and Yarrow. At 8 s, 4 of the 16 loads still showed those 3. The live feed arrived after 5.5–8.4 s (median 7.1 s), and then all 31 plants showed.
- **Slow 3G:** the 3-plant list stayed up until about 9–11 s.
- **Warm cache:** apart from the first visit, which showed the 3 plants, the cached full list showed instantly.
- **Root cause:** `shop.js` painted the page immediately using the built-in `FALLBACK_PLANTS` list whenever nothing was cached, and did it without any note. That list has 4 plants, one of which (Blue Pyramid Cypress) is hidden, so 3 cards showed. These look like a real but tiny inventory.
- **What made it worse:**
  - The feed fetch had no timeout. If the request hung, the 3-plant list stayed up forever with no message (scenario B "before").
  - There was no retry. A single `{ok:false}` reply or HTTP error meant the 3-plant offline list stayed (scenario C "before").
  - A short reply was shown as-is. If the backend fell back to its old 19-plant list, the page showed it, even replacing a full cached list (scenarios C2 and D1 "before").

## Fix (branch `feed-loading`)
- **First visit with nothing cached:** the page shows 6 skeleton cards and a calm "Loading today's plants…" line with a small spinner (`aria-busy` set). It never shows a partial or built-in list while it waits.
- **Timeout and retry:** each try waits up to 25 s (`FEED_TIMEOUT_MS`) and is retried once (`FEED_RETRIES`).
- **Flagged or short replies are retried:** a reply with `ok:false`, `fallback:true`, no plants, or fewer than 70% of the last good count (`FEED_SHORT_RATIO`) gets a retry. A short reply is accepted only if the retry confirms it and it isn't flagged, so a real catalog change still goes through.
- **If both tries fail:** the page shows the last good feed from localStorage with a dated note. With no cache, it shows the offline list with its note. Either way it retries quietly every 60 s.
- **No downgrades:** once a live list is showing, a failed background refresh never replaces it.
- **New cache key:** the cache key is now `ienn-inventory-v3`, which stores the plant count, and the old v2 cache is dropped. Every returning visitor therefore sees the loading state once, the first time they visit after this change.

Evidence is in `docs/screenshots/feed-loading/`: `scenarios-before.txt` and `scenarios-after.txt` (mocked feed scenarios A–E), plus the 390px screenshots.
