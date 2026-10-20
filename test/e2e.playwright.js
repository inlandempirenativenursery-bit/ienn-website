const { chromium } = require('playwright'); const assert = require('assert');
const BASE = 'http://localhost:8765/order.html', SHOTS = '/workspace/ienn-website-shots/';
let stock = { ws1: 2, ws4: 6, mf: 15 };
const feed = () => ({ updated: new Date().toISOString(), plants: [
  { name: 'Sticky Monkeyflower', sizes: [{ size: '4"', stock: 4 }, { size: '1 gal', stock: stock.mf }] },
  { name: 'White Sage', rank: 1, sizes: [{ size: '4"', stock: stock.ws4 }, { size: '1 gal', stock: stock.ws1 }] },
  { name: 'Yarrow', sizes: [{ size: '1 gal', stock: 0 }] }] });
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' }); let results = [];
  for (const mode of ['ok', 'oos', 'fail', 'none']) {
    for (const w of (mode === 'ok' ? [375, 1280] : [375])) {
      stock = { ws1: 2, ws4: 6, mf: 15 };
      const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const page = await ctx.newPage();
      const errs = []; page.on('console', m => m.type() === 'error' && errs.push(m.text())); page.on('pageerror', e => errs.push(String(e)));
      await page.addInitScript(() => { window.__mailto = 0; HTMLFormElement.prototype.submit = function () { window.__mailto++; }; });
      let posted = null;
      await page.route('**/exec?view=json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed()) }));
      await page.route('**/exec', async r => {
        posted = { ct: r.request().headers()['content-type'], body: JSON.parse(r.request().postData()) };
        if (mode === 'fail') return r.fulfill({ status: 500, body: 'err' });
        if (mode === 'oos') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'out_of_stock', items: [{ name: 'Sticky Monkeyflower', size: '1 gal', requested: 2, available: 1 }] }) });
        stock.mf -= 2; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, orderId: 'W261020-007' }) });
      });
      const q = '?inventory=' + encodeURIComponent('http://localhost:8765/exec?view=json') + (mode === 'none' ? '' : '&order=' + encodeURIComponent('http://localhost:8765/exec'));
      await page.goto(BASE + q); await page.waitForSelector('.plant-card');
      const first = await page.locator('.plant-card h3').first().textContent(); assert.strictEqual(first, 'White Sage');
      const chips = await page.locator('.plant-card').first().locator('.sizes span').allTextContents();
      assert.deepStrictEqual(chips, ['4-inch$6', '1-gallon$15']);
      const mfCard = page.locator('.plant-card', { hasText: 'Sticky Monkeyflower' });
      assert.deepStrictEqual(await mfCard.locator('.sizes span').allTextContents(), ['4-inch$6', '1-gallon$15']);
      // 2 x MF 1-gal ($30) + 1 x MF 4-inch ($6) + 1 x WS 1-gal ($15) = 51
      await mfCard.locator('.plus').click(); await mfCard.locator('.add-btn').click();
      await mfCard.locator('.sizes span', { hasText: '4-inch' }).click(); await mfCard.locator('.add-btn').click();
      const ws = page.locator('.plant-card').first(); await ws.locator('.add-btn').click();
      const tot = await page.locator('#summary-body .totals').innerText();
      assert.match(tot, /Subtotal\s+\$51\.00/); assert.match(tot, /Est\. sales tax \(8\.75%\)\s+\$4\.46/); assert.match(tot, /Est\. total\s+\$55\.46/);
      assert.match(await page.locator('#summary-body li').first().innerText(), /2 × Sticky Monkeyflower \(1-gallon\) — \$30\.00/);
      assert.match(await page.locator('#cartbar-count').innerText(), /4 plants • \$51\.00/);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (mode === 'ok' && w === 375) { await page.locator('#cart').scrollIntoViewIfNeeded(); await page.screenshot({ path: SHOTS + 'prices-375.png', fullPage: true }); }
      await page.fill('#name', 'Ana Ruiz'); await page.fill('#email', 'ana@example.com'); await page.fill('#notes', 'Sat 11am');
      await page.click('.submit-btn'); await page.waitForTimeout(800);
      const r = { mode, w, overflow: ov, errs: errs.filter(e => !/net::ERR|Failed to load resource/.test(e)) };
      if (mode === 'ok') {
        assert.strictEqual(posted.ct, 'text/plain;charset=utf-8');
        assert.deepStrictEqual(posted.body.items.map(i => i.size).sort(), ['1 gal', '1 gal', '4"']);
        assert.ok(!(await page.locator('#confirm').isHidden())); assert.match(await page.locator('#confirm').innerText(), /Order received[\s\S]*Order #W261020-007/);
        assert.strictEqual(await page.evaluate(() => window.__mailto), 0);
        assert.match(await page.locator('#summary-body').innerText(), /No plants added yet/);
        // re-fetched stock: MF 1-gal now 13
        await page.waitForTimeout(300); assert.strictEqual(stock.mf, 13);
        if (w === 375) await page.screenshot({ path: SHOTS + 'confirm-375.png', fullPage: false });
      }
      if (mode === 'oos') { assert.ok(await page.locator('#confirm').isHidden()); assert.match(await page.locator('#stock-conflict').innerText(), /Sticky Monkeyflower \(1-gallon\) only 1 left/); assert.strictEqual(await page.evaluate(() => window.__mailto), 0); }
      if (mode === 'fail' || mode === 'none') { assert.strictEqual(await page.evaluate(() => window.__mailto), mode === 'fail' ? 1 : 0); assert.ok(!(await page.locator('#confirm').isHidden())); assert.match(await page.locator('#confirm-body').innerText(), /Subtotal \$51\.00, est\. tax \$4\.46, est\. total \$55\.46/); }
      if (mode === 'none') assert.strictEqual(posted, null);
      results.push(r); await ctx.close();
    }
  }
  await b.close(); console.log(JSON.stringify(results, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
