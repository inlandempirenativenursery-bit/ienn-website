# Cloudflare Web Analytics, 2026-10-25

Eric approved adding Cloudflare Web Analytics to count site traffic.

- **No cookies, no banner:** it doesn't set cookies or use local storage, so there is no cookie banner.
- **Dashboard:** Cloudflare dashboard → Analytics & Logs → Web Analytics.
- **Token:** `00379ec8474248f69ace426cd21d2126`. It's a public site token, fine to keep in the repo.

## Where
The snippet sits just before `</body>` on the public pages:
- `index.html`
- `order.html`
- `credits.html`

```html
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "00379ec8474248f69ace426cd21d2126"}'></script><!-- End Cloudflare Web Analytics -->
```

**Not added to:**
- `confirm.html`: Eric's internal order-confirm link page (noindex, no-referrer). Its URL carries the order id and a one-time token (`?id=…&t=…`), and the beacon reports the page URL to Cloudflare, so it's left out.
- `apps-script/`, `apps-script-inventory/`: the Google Apps Script back end (untouched).
- `docs/`: internal notes, not part of the site.

## Performance
- `type='module'` scripts are deferred: they don't block HTML parsing or first paint, and run after the page is parsed.
- The beacon is about 6 KB and cached for a day.
- There is no visual change, and nothing else on the site depends on it. If Cloudflare is down or blocked by an ad blocker, the page works exactly the same.
- The site has no Content-Security-Policy meta tag, so nothing needed allow-listing.
- **If a CSP is added later,** it needs `script-src https://static.cloudflareinsights.com` and `connect-src https://cloudflareinsights.com`.

## Tests
- **The stub:** `tests/stub-analytics.js` answers the beacon locally (an empty script) in every e2e browser context. This keeps runs hermetic and keeps test page views from localhost out of the real dashboard.
  - Without it, the console-error checks in checkout-drawer and photos fail, because cloudflareinsights.com rejects the `http://localhost:8765` origin.
- **Beacon check (2026-10-25):**
  - Headless Chrome and WebKit loaded index.html, order.html and credits.html.
  - Each page requested `https://static.cloudflareinsights.com/beacon.min.js` and got a 200.
  - The beacon then sent its page-view POST to `cloudflareinsights.com/cdn-cgi/rum`. It was answered locally, so nothing reached the dashboard.
  - No console errors.
