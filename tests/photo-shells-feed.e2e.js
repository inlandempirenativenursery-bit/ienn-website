/* Slow-feed and feed-failure: photo shells paint first, no false availability. */
const { chromium } = require(process.env.PW || 'playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const S = (k, l, p, q) => ({ key: k, size: l, price: p, qty: q });
// Omit yarrow so a first-row shell must disappear cleanly when the feed arrives.
const names = [
  ['White Sage', 'Salvia apiana'],
  ['Sticky Monkeyflower', 'Diplacus aurantiacus'],
  ['Narrow-leaf Milkweed', 'Asclepias fascicularis'],
  ['Showy Penstemon', 'Penstemon spectabilis'],
  ['California Poppy', 'Eschscholzia californica'],
  ['Deergrass', 'Muhlenbergia rigens'],
  ['Scarlet Bugler', 'Penstemon centranthifolius'],
  ['Bush Sunflower', 'Encelia californica'],
  ['Black Sage', 'Salvia mellifera'],
  ['Sugarbush', 'Rhus ovata']
];
const feed = { version: 3, taxIncluded: true, plants: names.map(([n, b]) => ({ name: n, fullName: n + ' (' + b + ')', botanical: b, sizes: [S('4"', '4-inch pot', 6, 10), S('1 gal', '1-gallon', 15, 5)] })) };

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      const f = path.join(root, decodeURIComponent(u.pathname === '/' ? '/order.html' : u.pathname));
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/' }));
  });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const list = document.querySelector('#plant-list');
    const cards = [...(list ? list.querySelectorAll('.card') : [])];
    const text = list ? list.innerText : '';
    return {
      pending: cards.filter((c) => c.classList.contains('is-pending')).length,
      skel: cards.filter((c) => c.classList.contains('skel')).length,
      live: cards.filter((c) => !c.classList.contains('is-pending') && !c.classList.contains('skel')).length,
      imgs: cards.filter((c) => c.querySelector('img[src]')).length,
      add: list ? list.querySelectorAll('button.add').length : 0,
      instock: /in stock/i.test(text),
      available: /Available · Get yours now/i.test(text),
      priceTag: list ? list.querySelectorAll('.price-tag').length : 0,
      dollars: /\$\d/.test(text),
      checking: [...(list ? list.querySelectorAll('.pending-avail') : [])].map((n) => n.textContent),
      names: cards.map((c) => ((c.querySelector('h3') || {}).textContent || '').replace(/^[A-Z]\d+\s*/, '').trim()),
      firstFetch: ((list && list.querySelector('img')) || {}).getAttribute && (list.querySelector('img') || {}).getAttribute('fetchpriority'),
      listH: list ? Math.round(list.getBoundingClientRect().height) : 0,
      busy: list ? list.getAttribute('aria-busy') : null
    };
  });
}

function assertPending(s, label) {
  if (s.pending < 4) throw new Error(label + ': expected photo shells, got pending=' + s.pending + ' names=' + s.names);
  if (s.imgs < 4) throw new Error(label + ': shells should have images, imgs=' + s.imgs);
  if (s.add) throw new Error(label + ': Add button appeared before the feed');
  if (s.instock) throw new Error(label + ': "In stock" appeared before the feed');
  if (s.available) throw new Error(label + ': "Available" appeared before the feed');
  if (s.priceTag || s.dollars) throw new Error(label + ': price appeared before the feed');
  if (!s.checking.length) throw new Error(label + ': missing Checking availability…');
  if (s.firstFetch !== 'high') throw new Error(label + ': first image fetchpriority should be high, got ' + s.firstFetch);
}

(async () => {
  const { srv, url } = await startServer();
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  let fail = 0;
  try {
    // --- Slow feed ---
    {
      const ctx = await browser.newContext({ viewport: { width: 400, height: 812 } });
      if (fs.existsSync(path.join(__dirname, 'stub-analytics.js'))) await require('./stub-analytics')(ctx);
      const page = await ctx.newPage();
      let release;
      const gate = new Promise((r) => { release = r; });
      await page.route(/script\.google\.com/, async (route) => {
        if (!/view=inventory/.test(route.request().url())) return route.fulfill({ contentType: 'text/html', body: '<h1>x</h1>' });
        await gate;
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) });
      });
      await page.goto(url + 'order.html', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#plant-list .card.is-pending img, #plant-list .card.is-pending', { timeout: 8000 });
      await page.waitForTimeout(400);
      const before = await snapshot(page);
      console.log('slow-before', JSON.stringify(before));
      try { assertPending(before, 'slow-feed before'); } catch (e) { fail++; console.error(e.message); }
      const hadYarrow = before.names.some((n) => /yarrow/i.test(n));
      const hBefore = before.listH;
      await page.evaluate(() => {
        document.querySelectorAll('#plant-list .card.is-pending img').forEach((img, i) => { img.dataset.shellKeep = String(i); });
      });
      release();
      await page.waitForFunction(() => !document.querySelector('#plant-list .card.is-pending') && document.querySelector('#plant-list button.add'), null, { timeout: 15000 });
      const after = await snapshot(page);
      console.log('slow-after', JSON.stringify(after));
      try {
        if (after.pending) throw new Error('pending shells still present after feed');
        if (after.add < 4) throw new Error('Add buttons missing after feed, add=' + after.add);
        if (!after.instock && !after.available) throw new Error('live stock labels missing after feed');
        if (hadYarrow && after.names.some((n) => /yarrow/i.test(n))) throw new Error('yarrow shell should drop when the feed omits it');
        if (after.listH + 80 < hBefore && after.live >= 8) throw new Error('list collapsed after a dropped shell: ' + hBefore + ' -> ' + after.listH);
        const reuse = await page.evaluate(() => {
          const kept = [...document.querySelectorAll('#plant-list img[data-shell-keep]')].map((i) => ({ keep: i.dataset.shellKeep, alt: i.alt, inFirst: !!i.closest('.card') }));
          return { kept, firstKept: !!document.querySelector('#plant-list .card:not(.is-pending) img[data-shell-keep]') };
        });
        console.log('slow-reuse', JSON.stringify(reuse));
        if (!reuse.firstKept) throw new Error('feed render replaced shell photos instead of reusing them (LCP would reset)');
      } catch (e) { fail++; console.error('slow-after: ' + e.message); }
      await ctx.close();
    }

    // --- Feed failure ---
    {
      const ctx = await browser.newContext({ viewport: { width: 400, height: 812 } });
      if (fs.existsSync(path.join(__dirname, 'stub-analytics.js'))) await require('./stub-analytics')(ctx);
      const page = await ctx.newPage();
      await page.route(/script\.google\.com/, async (route) => {
        if (!/view=inventory/.test(route.request().url())) return route.fulfill({ contentType: 'text/html', body: '<h1>x</h1>' });
        return route.abort('failed');
      });
      await page.goto(url + 'order.html', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#plant-list .card.is-pending', { timeout: 8000 });
      await page.waitForTimeout(300);
      const mid = await snapshot(page);
      console.log('fail-before', JSON.stringify(mid));
      try { assertPending(mid, 'feed-fail before'); } catch (e) { fail++; console.error(e.message); }
      // After retries, fallback list may appear; it must not have been preceded by false availability (checked above).
      await page.waitForFunction(() => !document.querySelector('#plant-list .card.is-pending') || /unavailable|offline/i.test((document.querySelector('.inv-status') || {}).textContent || ''), null, { timeout: 20000 });
      const after = await snapshot(page);
      const status = await page.evaluate(() => (document.querySelector('.inv-status') || {}).textContent || '');
      console.log('fail-after', JSON.stringify(after), 'status=', status);
      try {
        // Either still pending (retrying) with no Add/stock, or fallback/offline — never a silent fake in-stock from shells.
        if (after.pending) assertPending(after, 'feed-fail still-pending');
        if (!/unavailable|offline|confirm availability/i.test(status) && after.pending === 0 && after.live === 0) {
          throw new Error('feed failed but no fallback note or list, status=' + status);
        }
        // Shells themselves must be gone or still clearly pending — not mixed with live Add on pending cards
        const mixed = await page.evaluate(() => !!document.querySelector('#plant-list .card.is-pending button.add'));
        if (mixed) throw new Error('pending card gained an Add button after a failed feed');
      } catch (e) { fail++; console.error('fail-after: ' + e.message); }
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.close();
  }
  console.log(fail ? 'FAIL' : 'PASS');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
