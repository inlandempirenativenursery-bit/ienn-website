// Photo wiring check: node tests/photos.e2e.js (serve repo on :8765). Uses mock feed with several plants.
const { chromium } = require(process.env.PW || 'playwright'); const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:8793/', OUT = process.env.SHOTS || '/workspace/ienn-website-shots/photos/';
const S = (k, l, p, q) => ({ key: k, size: l, price: p, qty: q });
const names = [['Rock Monkeyflower','Diplacus calycinus'],['Matilija Poppy','Romneya coulteri'],['Sticky Monkeyflower','Diplacus aurantiacus'],['White Sage','Salvia apiana'],['California Poppy','Eschscholzia californica'],['Showy Penstemon','Penstemon spectabilis'],['Narrow-leaf Milkweed','Asclepias fascicularis'],['Showy Milkweed','Asclepias speciosa'],['Woollypod Milkweed','Asclepias eriocarpa'],['Deergrass','Muhlenbergia rigens'],['Scarlet Bugler','Penstemon centranthifolius'],['California Encelia','Encelia californica'],['Morning Glory','Calystegia macrostegia'],['Yucca','Hesperoyucca whipplei'],['Sugarbush','Rhus ovata'],['Black Sage','Salvia mellifera']];
const feed = { version: 3, taxIncluded: true, plants: names.map(([n, b]) => ({ name: n, fullName: `${n} (${b})`, botanical: b, sizes: [S('4"', '4-inch pot', 6, 10), S('1 gal', '1-gallon', 15, 5)] })) };
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); let fail = 0;
  for (const page_ of ['order.html', 'index.html']) for (const w of [375, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 }, hasTouch: w < 500 }); const p = await ctx.newPage();
    const errs = [], bad = [], bytes = {}; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    p.on('response', async r => { if (/\.(jpg|png)$/.test(r.url())) { if (!r.ok()) bad.push(r.status() + ' ' + r.url()); else try { bytes[r.url()] = (await r.body()).length; } catch (e) {} } });
    p.on('requestfailed', r => bad.push('failed ' + r.url()));
    await p.route(/script\.google\.com/, r => /view=inventory/.test(r.request().url()) ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) }) : r.fulfill({ contentType: 'text/html', body: '<h1>x</h1>' }));
    await p.goto(BASE + page_); await p.waitForTimeout(800);
    for (let y = 0; y < 8000; y += 600) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(120); }
    await p.waitForLoadState('networkidle');
    const info = await p.evaluate(() => ({ ovf: document.documentElement.scrollWidth > innerWidth + 1, credits: [...document.querySelectorAll('.photo-credit a')].map(a => a.textContent + ' -> ' + a.href), imgs: [...document.querySelectorAll('img[src*="images/plants/"]')].map(i => ({ alt: i.alt, ok: i.complete && i.naturalWidth > 0, cur: i.currentSrc.split('/').pop() })) }));
    console.log('credits', JSON.stringify(info.credits));
    const broken = info.imgs.filter(i => !i.ok || !i.alt);
    const kb = Math.round(Object.values(bytes).reduce((a, c) => a + c, 0) / 1024);
    const order = await p.evaluate(() => [...document.querySelectorAll('.card h3, .plant-card h3, h3')].map(h => h.textContent.replace(/^[A-Z]\d+\s*/, '').trim()).slice(0, 10).join(' > ')); console.log(order);
    console.log(page_, w, `plant imgs=${info.imgs.length} broken=${broken.length} badReq=${bad.length} overflow=${info.ovf} errors=${errs.length} imageKB=${kb}`, info.imgs.map(i => i.cur).join(','));
    if (broken.length || bad.length || info.ovf || errs.length) { fail++; console.log(broken, bad, errs); }
    if (page_ === 'order.html') { const y = await p.evaluate(() => document.querySelector('.ph').getBoundingClientRect().top + scrollY - 20); await p.screenshot({ path: OUT + `cards-${w}.png`, fullPage: true, clip: { x: 0, y, width: w, height: w < 500 ? 1900 : 2300 } }); }
    await ctx.close();
  }
  await b.close(); console.log(fail ? 'FAIL' : 'PASS'); process.exit(fail ? 1 : 0);
})();
