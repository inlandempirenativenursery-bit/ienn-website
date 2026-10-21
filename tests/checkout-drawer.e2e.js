// Checkout drawer against the LIVE feed (serve repo, BASE=http://localhost:PORT/). Order POSTs are blocked: no real order is sent.
const { chromium } = require(process.env.PW || 'playwright'); const assert = require('assert');
const BASE = process.env.BASE || 'http://localhost:8765/', SHOTS = process.env.SHOTS || 'docs/screenshots/checkout-drawer/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); let posts = 0;
  for (const w of [375, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 }, hasTouch: w < 500 }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && !/404|favicon/.test(m.text()) && errs.push(m.text()));
    await page.route(/script\.google\.com/, r => { if (r.request().method() === 'POST') { posts++; return r.abort(); } return r.continue(); });
    await page.goto(BASE + 'order.html'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.card:not(.skel)', { timeout: 30000 });
    for (const i of [0, 1]) { const c = page.locator('.card').nth(i); await c.locator('.chip:not(.chip-request)').first().click(); await c.locator('.add').click(); }
    assert.match(await page.locator('#cartbar').innerText(), /2 items[\s\S]*Check out/); await page.screenshot({ path: SHOTS + 'tray-' + w + '.png' });
    await page.click('#cartbar-go'); await page.waitForTimeout(450); assert.ok(await page.locator('#checkout').isVisible());
    assert.match(await page.locator('#summary-body').innerText(), /Total: \$[\d.]+ Taxes included/);
    await page.screenshot({ path: SHOTS + 'drawer-open-' + w + '.png' });
    if (w < 500) { const bb = await page.locator('#checkout').boundingBox(); assert.ok(bb.height >= 800 && bb.y <= 1, 'full height on phone'); }
    else { const bb = await page.locator('#checkout').boundingBox(); assert.ok(bb.width <= 460 && bb.x > 700, 'side drawer on desktop'); }
    if (w < 500) await page.click('#checkout-close'); else await page.mouse.click(10, 300); await page.waitForTimeout(400); assert.ok(await page.locator('#checkout').isHidden(), 'X / tap outside closes'); assert.ok(await page.locator('#cartbar').isVisible(), 'tray kept');
    await page.click('#cartbar-go'); await page.waitForTimeout(450);
    await page.fill('#name', 'Test Only'); await page.fill('#email', 'test@example.com'); await page.fill('#phone', '9095550100'); await page.fill('#notes', 'Preview test, not a real order.');
    await page.locator('.submit-btn').scrollIntoViewIfNeeded(); assert.strictEqual(await page.locator('.submit-btn').textContent(), 'Place order');
    await page.screenshot({ path: SHOTS + 'drawer-filled-' + w + '.png' });
    assert.deepStrictEqual(errs, [], 'console ' + w); await ctx.close(); console.log('checkout drawer ok', w);
  }
  assert.strictEqual(posts, 0); await b.close(); console.log('checkout-drawer e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
