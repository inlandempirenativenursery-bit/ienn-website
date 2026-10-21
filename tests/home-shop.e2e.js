// Home page is the shop: add to tray on index.html, ghost/glow Check out, tray carry-over + drawer auto-open on order.html. Mocked feed + POST.
const { chromium } = require(process.env.PW || 'playwright'); const assert = require('assert');
const BASE = process.env.BASE || 'http://localhost:8765/', SHOTS = process.env.SHOTS || 'docs/screenshots/four-tweaks/';
const S = (k, size, price, qty, extra) => ({ key: k, size, price, qty, extra: extra == null ? null : extra, canRequest: extra > 0 });
const ask = () => [S('2"', '2-inch pot', 3, null), S('Tree pot', 'Quarter tree pot', 10, null)];
const feed = { version: 3, countDate: '2026-10-17', sortedBy: 'pin,popularity90d', plants: [
  { name: 'White Sage', fullName: 'White Sage (Salvia apiana)', botanical: 'Salvia apiana', rank: 1, sizes: [...ask(), S('4"', '4-inch pot', 6, 12), S('1 gal', '1-gallon', 15, 3)] },
  { name: 'Yarrow', fullName: 'Yarrow (Achillea millefolium)', botanical: 'Achillea millefolium', rank: 2, sizes: [...ask(), S('4"', '4-inch pot', 6, 0, 4)] },
  { name: 'Toyon', fullName: 'Toyon (Heteromeles arbutifolia)', botanical: 'Heteromeles arbutifolia', rank: 3, sizes: [...ask(), S('4"', '4-inch pot', 6, 0, 0), S('1 gal', '1-gallon', 15, 0, 0)] }] };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 800 }, hasTouch: w < 500 }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    let posts = 0; await page.route(/script\.google\.com/, r => r.request().method() === 'POST' ? (posts++, r.fulfill({ contentType: 'application/json', body: '{"ok":true,"orderId":"INV-T"}' })) : r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) }));
    await page.goto(BASE + 'index.html'); await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.waitForFunction(() => [...document.querySelectorAll('#plant-list .card h3')].some(h => /White Sage/.test(h.textContent)));
    const names = await page.locator('#plant-list .card h3').allInnerTexts(); assert.deepStrictEqual(names.map(n => n.replace(/^[A-Z]\d/, '')), ['White Sage', 'Yarrow'], 'feed order, Toyon hidden');
    assert.ok(!/\d+ left|Only \d/.test(await page.locator('#plant-list').innerText()), 'no exact counts');
    const co = page.locator('#hdr-checkout');
    assert.strictEqual(await co.getAttribute('aria-disabled'), 'true'); assert.strictEqual(await co.textContent(), 'Check out'); assert.ok(await co.evaluate(e => e.classList.contains('is-empty')));
    assert.strictEqual(await co.evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(0, 0, 0, 0)', 'ghost');
    await co.click({ force: true }); await page.waitForTimeout(200); assert.match(page.url(), /index\.html/); assert.match(await page.locator('#co-hint').textContent(), /Add a plant first/);
    if (w < 500) await page.screenshot({ path: SHOTS + 'home-empty-ghost-phone.png' });
    const ws = page.locator('.card', { hasText: 'White Sage' });
    await ws.locator('.add').click(); assert.strictEqual(await ws.locator('.size-hint').textContent(), 'Choose a size first');
    await ws.locator('.chip', { hasText: '4-inch' }).click(); assert.strictEqual(await ws.locator('.chip[aria-pressed="true"]').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(46, 125, 50)');
    await ws.locator('.stepper button', { hasText: '+' }).click(); await ws.locator('.add').click();
    const ya = page.locator('.card', { hasText: 'Yarrow' }); await ya.locator('.chip', { hasText: '4-inch' }).click(); await ya.locator('.add').click();
    assert.strictEqual(await co.textContent(), 'Check out (3)'); assert.strictEqual(await co.getAttribute('aria-disabled'), 'false'); assert.match(await co.getAttribute('href'), /order\.html\?checkout=1/);
    await page.waitForTimeout(350); assert.strictEqual(await co.evaluate(e => getComputedStyle(e).backgroundColor), 'rgba(192, 57, 43, 0.04)', 'transparent glow'); assert.notStrictEqual(await co.evaluate(e => getComputedStyle(e).animationName), 'none', 'glow');
    assert.ok(await page.locator('#cartbar').isVisible()); assert.strictEqual(await page.locator('#cartbar-go').textContent(), 'Check out (3)');
    const tray = JSON.parse(await page.evaluate(() => localStorage.getItem('ienn-cart-v2'))); assert.deepStrictEqual(tray, { 'white-sage|4"': 2, 'yarrow|4"': 1 });
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    if (w < 500) await page.screenshot({ path: SHOTS + 'home-items-glow-phone.png' }); else await page.screenshot({ path: SHOTS + 'home-items-glow-desktop.png' });
    await co.click(); await page.waitForURL(/order\.html\?checkout=1/); await page.waitForSelector('#checkout:not([hidden])'); await page.waitForTimeout(500);
    const sum = await page.locator('#summary-body').innerText(); assert.match(sum, /2 × White Sage/); assert.match(sum, /1 × Yarrow/);
    if (w < 500) await page.screenshot({ path: SHOTS + 'order-drawer-after-handoff-phone.png' });
    await page.click('#checkout-close'); await page.waitForTimeout(400);
    assert.strictEqual(await page.locator('#cartbar-go').textContent(), 'Check out (3)'); assert.ok(await page.locator('#cartbar-go').evaluate(e => e.classList.contains('has-items')));
    assert.strictEqual(posts, 0, 'no orders sent'); assert.deepStrictEqual(errs, []); console.log('home-shop ok', w); await ctx.close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
