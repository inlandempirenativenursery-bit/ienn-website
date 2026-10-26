// Review Oct 20 browser check. Serve repo: python3 -m http.server 8765. LIVE=1 uses the real feed (no route mock; POST always blocked).
const { chromium } = require(process.env.PW || 'playwright'); const assert = require('assert');
const BASE = (process.env.BASE || 'http://localhost:8765/') + 'order.html', SHOTS = process.env.SHOTS || 'docs/screenshots/review-oct20/';
const S = (key, size, price, qty) => ({ key, size, price, qty }), ask = () => [S('2"', '2-inch pot', 3, null), S('Tree pot', 'Quarter tree pot', 10, null)];
const counted = { version: 3, plants: [
  { name: 'White Sage', fullName: 'White Sage (Salvia apiana)', botanical: 'Salvia apiana', sizes: [...ask(), S('4"', '4-inch pot', 6, 12), S('1 gal', '1-gallon', 15, 3)] },
  { name: 'Yarrow', fullName: 'Yarrow (Achillea millefolium)', botanical: 'Achillea millefolium', sizes: [...ask(), S('4"', '4-inch pot', 6, 0), S('1 gal', '1-gallon', 15, 8)] },
  { name: 'Toyon', fullName: 'Toyon (Heteromeles arbutifolia)', botanical: 'Heteromeles arbutifolia', sizes: [...ask(), S('4"', '4-inch pot', 6, 0), S('1 gal', '1-gallon', 15, 0)] }] };
const uncounted = { version: 3, baseline: null, plants: counted.plants.map(p => ({ ...p, sizes: p.sizes.map(z => ({ ...z, qty: z.qty == null ? null : 0 })) })) };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); let posts = 0;
  async function open(w, feed) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 }, hasTouch: w < 500 }); await require('./stub-analytics')(ctx); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && !/404|favicon/.test(m.text()) && errs.push(m.text()));
    await page.route(/script\.google\.com/, r => { if (r.request().method() === 'POST') { posts++; return r.abort(); } if (feed) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) }); return r.continue(); });
    await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.card:not(.skel)', { timeout: 20000 });
    return { ctx, page, errs };
  }
  // 1) chips neutral, green only after tap; zero-stock hidden; Ask-us threshold
  { const { ctx, page, errs } = await open(375, counted);
    assert.deepStrictEqual(await page.locator('.card h3').evaluateAll(es => es.map(e => e.lastChild.textContent)), ['White Sage', 'Yarrow'], 'Toyon (all 0) hidden');
    assert.strictEqual(await page.locator('.chip[aria-pressed="true"]').count(), 0, 'nothing preselected');
    const bg = await page.locator('.card').first().locator('.chip').nth(2).evaluate(e => getComputedStyle(e).backgroundColor);
    assert.notStrictEqual(bg, 'rgb(46, 125, 50)', 'chip not green before tap');
    assert.strictEqual(await page.locator('.card').nth(1).locator('.chip', { hasText: '4-inch' }).count(), 0, 'qty-0 chip hidden');
    const c0 = page.locator('.card').first(); assert.strictEqual(await c0.locator('.add').textContent(), 'Add to tray'); await c0.locator('.add').click(); assert.strictEqual(await c0.locator('.size-hint').textContent(), 'Choose a size first'); assert.strictEqual(await page.locator('#cartbar').isHidden(), true, 'no add without size');
    await c0.locator('.chip', { hasText: '1-gal' }).click();
    assert.strictEqual(await c0.locator('.chip', { hasText: '1-gal' }).getAttribute('aria-pressed'), 'true');
    assert.strictEqual(await c0.locator('.chip', { hasText: '1-gal' }).evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(46, 125, 50)');
    assert.ok(await c0.locator('.ask-note').isVisible(), 'qty 3 < 5 => Ask us');
    await c0.locator('.stepper button').nth(1).click(); await c0.locator('.stepper button').nth(1).click(); await c0.locator('.stepper button').nth(1).click();
    assert.strictEqual(await c0.locator('input').inputValue(), '3', 'stepper capped');
    await c0.locator('.chip', { hasText: '4-inch' }).click(); assert.ok(!(await c0.locator('.ask-note').isVisible()), 'qty 12 => no note');
    const txt = await page.locator('main').innerText(); assert.ok(!/\b(12|3|8) left|Only \d/.test(txt), 'no exact counts');
    assert.deepStrictEqual(errs, []); await ctx.close(); }
  // 2) no baseline: nothing hidden
  { const { ctx, page, errs } = await open(375, uncounted);
    assert.strictEqual(await page.locator('.card:not(.skel)').count(), 3, 'no baseline => show all');
    assert.match(await page.locator('.card .badge').first().textContent(), /confirm availability/);
    assert.deepStrictEqual(errs, []); await ctx.close(); }
  // 3) LIVE feed at 375/1280: add -> cart bar -> Reserve -> form filled, stop before submit
  for (const w of [375, 1280]) { const { ctx, page, errs } = await open(w, null);
    const n = await page.locator('.card:not(.skel)').count(); assert.ok(n >= 1, 'live cards');
    await page.waitForTimeout(1200); await page.screenshot({ path: SHOTS + 'after-' + w + '.png' });
    const c = page.locator('.card').first(); await c.locator('.chip:not(.chip-request)').first().click();
    if (w === 375) await page.screenshot({ path: SHOTS + 'after-375-chip-selected.png' });
    await c.locator('.add').click(); assert.ok(await page.locator('#cartbar').isVisible());
    assert.match(await page.locator('#cartbar-count').textContent(), /1 item · \$/);
    await page.screenshot({ path: SHOTS + 'after-' + w + '-cartbar.png' });
    await page.locator('#cartbar-go').click(); await page.waitForTimeout(400); await page.fill('#name', 'Test Only'); await page.fill('#email', 'test@example.com');
    
    assert.ok(await page.locator('.submit-btn').isEnabled()); assert.deepStrictEqual(errs, [], 'console ' + w);
    console.log('live', w, 'cards', n); await ctx.close(); }
  // 4) home page cards: same rules (stock-view.js)
  async function home(w, feed) { const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 }, hasTouch: w < 500 }); await require('./stub-analytics')(ctx); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && !/404|favicon/.test(m.text()) && errs.push(m.text()));
    await page.route(/script\.google\.com/, r => feed ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) }) : r.continue());
    await page.goto(BASE.replace('order.html', 'index.html')); await page.waitForSelector('#plant-list .card:not(.skel)', { timeout: 40000 }); await page.waitForTimeout(feed ? 1200 : 12000); return { ctx, page, errs }; }
  { const { ctx, page, errs } = await home(375, counted);
    assert.strictEqual(await page.locator('#plant-list .card:not(.skel)').count(), 2, 'home: Toyon hidden');
    assert.strictEqual(await page.locator('#plant-list .chip[aria-pressed="true"]').count(), 0);
    const ws = page.locator('#plant-list .card:not(.skel)', { hasText: 'White Sage' }); await ws.locator('.chip', { hasText: '1-gal' }).click();
    assert.ok(await ws.locator('.ask-note').isVisible(), 'home: qty 3 => Ask us'); assert.ok(!/\d+ left|Low stock/.test(await page.locator('#plant-list').innerText()));
    assert.deepStrictEqual(errs, []); await ctx.close(); }
  { const { ctx, page, errs } = await home(375, uncounted);
    assert.strictEqual(await page.locator('#plant-list .card:not(.skel)').count(), 3, 'home: no baseline => show all'); assert.deepStrictEqual(errs, []); await ctx.close(); }
  for (const w of [375, 1280]) { const { ctx, page, errs } = await home(w, null);
    await page.locator('#plant-list').scrollIntoViewIfNeeded(); await page.screenshot({ path: SHOTS + 'home-after-' + w + '.png' });
    assert.deepStrictEqual(errs, [], 'home console ' + w); console.log('home live', w, await page.locator('#plant-list .card:not(.skel)').count()); await ctx.close(); }
  assert.strictEqual(posts, 0, 'no order submitted'); await b.close(); console.log('review-oct20 e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
