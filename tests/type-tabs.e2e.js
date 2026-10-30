// Plant-type tabs: counts, filtering, no page jump, sessionStorage, search pick on filtered-out card. Uses the live feed (GET only).
const { chromium } = require(process.env.PW || 'playwright'); const assert = require('assert');
const BASE = process.env.BASE || 'http://localhost:8765/', SHOTS = 'docs/screenshots/type-tabs/';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  for (const w of [375, 390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 }, hasTouch: w < 500 }); await require('./stub-analytics')(ctx);
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.route(/script\.google\.com/, r => r.request().method() === 'POST' ? r.abort() : r.continue());
    await page.goto(BASE + 'index.html'); await page.waitForSelector('.type-tabs .type-chip');
    const chips = await page.$$eval('.type-chip', a => a.map(x => x.dataset.type + ':' + x.querySelector('small').textContent)); console.log(w, chips.join(' '));
    assert.strictEqual(chips.join(' '), 'all:33 shrub:14 perennial:12 wild:2 grass:3 more:2', 'tab counts');   // growth-form scheme 2026-10-30
    assert.strictEqual(await page.getAttribute('.type-chip[data-type=all]', 'aria-pressed'), 'true');
    const tabs = page.locator('.type-tabs'); await tabs.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -60));
    await page.screenshot({ path: SHOTS + `all-${w}.png` });
    const y0 = await tabs.evaluate(e => e.getBoundingClientRect().top);
    await page.click('.type-chip[data-type=grass]');
    const y1 = await tabs.evaluate(e => e.getBoundingClientRect().top); assert.ok(Math.abs(y1 - y0) < 2, 'no jump ' + y0 + ' ' + y1);
    const vis = await page.$$eval('#plant-list .card', a => a.filter(c => c.offsetParent).map(c => c.dataset.group)); assert.ok(vis.length && vis.every(g => g === 'grass'), 'grass only');
    assert.strictEqual(await page.evaluate(() => sessionStorage.getItem('ienn-type-tab')), 'grass');
    await page.screenshot({ path: SHOTS + `grasses-${w}.png` });
    await page.click('.type-chip[data-type=perennial]');
    const pv = await page.$$eval('#plant-list .card', a => a.filter(c => c.offsetParent).map(c => c.dataset.group)); assert.ok(pv.length === 12 && pv.every(g => g === 'perennial'), 'perennials only');
    await tabs.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -60)); await page.screenshot({ path: SHOTS + `perennials-${w}.png` });
    await page.focus('.type-chip[data-type=shrub]'); await page.keyboard.press('Enter'); assert.strictEqual(await page.getAttribute('.type-chip[data-type=shrub]', 'aria-pressed'), 'true');
    await page.reload(); await page.waitForSelector('.type-chip'); assert.strictEqual(await page.getAttribute('.type-chip[data-type=shrub]', 'aria-pressed'), 'true', 'remembered');
    const shrubId = await page.$eval('#plant-list .card[data-group=wild]', c => c.dataset.id);
    const c = await page.evaluate(id => !!window.iennCardFor(id), shrubId); assert.ok(c);
    assert.strictEqual(await page.getAttribute('.type-chip[data-type=all]', 'aria-pressed'), 'true', 'search pick switches to All');
    assert.deepStrictEqual(errs, []); await ctx.close();
  }
  await b.close(); console.log('type-tabs OK');
})().catch(e => { console.error(e); process.exit(1); });
