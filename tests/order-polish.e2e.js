// Browser tests for the polish pass. Serves the repo via python http.server on :8765 and mocks the Apps Script /exec.
const { chromium } = require('playwright'); const assert = require('assert');
const BASE = 'http://localhost:8765/', SHOTS = process.env.SHOTS || 'docs/screenshots/v2/';  // serve repo: python3 -m http.server 8765; needs playwright
const S = (k, label, price, qty) => ({ key: k, size: label, price, qty });
const ask = () => [S('2"', '2-inch pot', 3, null), S('Tree pot', 'Quarter tree pot', 10, null)];
const feed = () => ({ version: 3, updated: new Date().toISOString(), taxIncluded: true, plants: [
  { name: 'Yarrow', fullName: 'Yarrow (Achillea millefolium)', botanical: 'Achillea millefolium', sizes: [...ask(), S('4"', '4-inch pot', 6, 20), S('1 gal', '1-gallon', 15, 8)] },
  { name: 'White Sage', fullName: 'White Sage (Salvia apiana)', botanical: 'Salvia apiana', sizes: [...ask(), S('4"', '4-inch pot', 6, 12), S('1 gal', '1-gallon', 15, 9)] },
  { name: 'Sticky Monkeyflower', fullName: 'Sticky Monkeyflower (Diplacus aurantiacus)', botanical: 'Diplacus aurantiacus', sizes: [...ask(), S('4"', '4-inch pot', 6, 0), S('1 gal', '1-gallon', 15, 4)] },
  { name: 'Woolly Blue Curls', fullName: 'Woolly Blue Curls (Trichostema lanatum)', botanical: 'Trichostema lanatum', sizes: [...ask(), S('4"', '4-inch pot', undefined, 0)] },
  { name: 'Toyon', fullName: 'Toyon (Heteromeles arbutifolia)', botanical: 'Heteromeles arbutifolia', sizes: [...ask(), S('4"', '4-inch pot', '', 0), S('1 gal', '1-gallon', null, 0)] }] });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); const out = [];
  async function open(w, mode, page_ = 'order.html') {
    const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 }, hasTouch: w < 500 }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && !/Failed to load resource|net::/.test(m.text()) && errs.push(m.text()));
    await page.route(/script\.google\.com/, async r => {
      const u = r.request().url();
      if (r.request().method() === 'POST') { if (mode === 'fail') return r.fulfill({ status: 500, body: 'x' }); return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, orderId: 'INV-1042', total: JSON.parse(r.request().postData()).items.length ? undefined : 0 }) }); }
      if (/view=inventory/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed()) });
      return r.fulfill({ contentType: 'text/html', body: '<h1>print list</h1>' });
    });
    await page.goto(BASE + page_); return { ctx, page, errs };
  }
  const ovf = p => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  for (const w of [375, 1280]) {
    const { ctx, page, errs } = await open(w); await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.waitForSelector('.card:not(.skel)');
    const names = await page.locator('.card h3').allTextContents();
    assert.match(names[0], /White Sage/, 'popular first: ' + names.join(','));
    // sold-out fixes
    const woolly = page.locator('.card', { hasText: 'Woolly Blue Curls' }); const toyon = page.locator('.card', { hasText: 'Toyon' });
    const wChips = await woolly.locator('.chip').allTextContents();
    assert.deepStrictEqual(wChips, ['2-inch pot · $3 · Ask us', 'Quarter tree pot · $10 · Ask us', '4-inch pot · $6 · sold out']);
    assert.strictEqual(await woolly.locator('.chip[aria-pressed="true"]').textContent(), '4-inch pot · $6 · sold out');
    assert.strictEqual(await woolly.locator('.price').textContent(), 'Sold out in this size');
    assert.ok(!/\$3 each|NaN/.test(await woolly.innerText()));
    assert.strictEqual(await woolly.locator('.add').textContent(), 'Sold out'); assert.ok(await woolly.locator('.add').isDisabled());
    assert.match(await woolly.locator('.badge').textContent(), /Sold out/);
    assert.deepStrictEqual((await toyon.locator('.chip').allTextContents()).slice(2), ['4-inch pot · $6 · sold out', '1-gallon · $15 · sold out']);
    for (const c of await page.locator('.chip-request').all()) assert.notStrictEqual(await c.evaluate(e => getComputedStyle(e).textDecorationLine), 'line-through');
    await woolly.locator('.chip-request').first().click(); assert.match(await woolly.locator('.price').textContent(), /Ask us: add “2-inch pot” in Notes/);
    assert.ok(await woolly.locator('.add').isDisabled());
    assert.strictEqual(await page.locator('p.hint', { hasText: 'Ask us' }).count(), 1, 'on-request note once');
    assert.strictEqual(await page.locator('.card', { hasText: 'available on request' }).count(), 0, 'no per-card on-request note');
    // monkeyflower defaults to 1 gal (first in-stock), not 2"
    const mf = page.locator('.card', { hasText: 'Sticky Monkeyflower' }); assert.match(await mf.locator('.chip[aria-pressed="true"]').textContent(), /1-gallon/);
    // tap targets
    const small = await page.evaluate(() => [...document.querySelectorAll('main button, .cartbar a, main a')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 40 && !e.closest('p,li')).map(e => e.textContent.trim()));
    assert.deepStrictEqual(small, [], 'small targets: ' + small);
    // pickup shown once in pickup box
    assert.strictEqual(((await page.locator('.notice').first().innerText()).match(/Saturdays 10 AM – 2 PM/g) || []).length, 1);
    assert.match(await page.locator('#steps').innerText(), /Pick plants & sizes[\s\S]*Nothing charged online[\s\S]*Saturday in Fontana/);
    assert.match(await page.locator('body').innerText(), /Connecting people to native plants/);
    assert.ok(!/\[TODO|Photo coming soon/.test(await page.locator('body').innerText()));
    if (w === 375) { await page.screenshot({ path: SHOTS + 'phone-top.png' }); await page.locator('#plant-list').scrollIntoViewIfNeeded(); await page.evaluate(() => document.getElementById('plant-list').scrollIntoView()); await page.screenshot({ path: SHOTS + 'phone-cards.png' }); }
    else await page.screenshot({ path: SHOTS + 'desktop-full-1280.png', fullPage: true });
    // add flow
    const ws = page.locator('.card', { hasText: 'White Sage' });
    await ws.locator('.stepper button').last().click(); await ws.locator('.add').click();
    await mf.locator('.add').click();
    await page.locator('.card', { hasText: 'Yarrow' }).locator('.chip', { hasText: '4-inch' }).click(); await page.locator('.card', { hasText: 'Yarrow' }).locator('.add').click();
    const tot = await page.locator('#summary-body').innerText(); assert.match(tot, /Total: \$33\.00/); // 2x$6 (WS 4") + $15 (MF 1 gal) + $6 (Yarrow 4")
    // cart: size label not broken
    const nw = await page.evaluate(() => [...document.querySelectorAll('#summary-body .nw')].every(s => s.getClientRects().length === 1));
    assert.ok(nw, 'size labels unbroken');
    const rm = await page.locator('.rm').first().boundingBox(); assert.ok(rm.height >= 44 && rm.width >= 44);
    await page.locator('.cartbar a').click(); await page.waitForTimeout(700);
    const rv = await page.locator('#review').boundingBox(); assert.ok(rv.y < (w < 500 ? 812 : 900) && rv.y > -50, 'Review order jumps to cart');
    if (w === 375) await page.screenshot({ path: SHOTS + 'phone-cart.png' }); else { await page.screenshot({ path: SHOTS + 'desktop-cart-1280.png' }); }
    await page.fill('#name', 'Ana Ruiz'); await page.fill('#email', 'ana@example.com'); await page.click(".submit-btn"); await page.waitForTimeout(1500);
    assert.ok(await page.locator('#confirm').isVisible()); assert.ok(await page.locator('#order-form').isHidden()); assert.ok(await page.locator('.submit-btn').isHidden());
    assert.match(await page.locator('#confirm').innerText(), /INV-1042[\s\S]*Total: \$33\.00/);
    const cb = await page.locator('#confirm').boundingBox(); assert.ok(cb.y >= -5 && cb.y < 200, 'confirm at top: ' + cb.y);
    assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'confirm');
    assert.match(await page.locator('#steps li.on').innerText(), /Pick up/);
    if (w === 375) await page.screenshot({ path: SHOTS + 'phone-confirm.png' }); else await page.screenshot({ path: SHOTS + 'desktop-confirm-1280.png' });
    await page.click('#new-order'); await page.waitForTimeout(600); assert.ok(await page.locator('#order-form').isVisible()); assert.ok(await page.locator('#confirm').isHidden());
    out.push({ w, overflow: await ovf(page), errs }); assert.ok(!out.at(-1).overflow); assert.deepStrictEqual(errs, []); await ctx.close();
  }
  // failure fallback + click-through
  { const { ctx, page, errs } = await open(375, 'fail'); await page.waitForSelector('.card:not(.skel)');
    await page.locator('.card').first().locator('.add').click(); await page.fill('#name', 'A'); await page.fill('#email', 'a@b.co'); await page.click('.submit-btn'); await page.waitForTimeout(600);
    const se = page.locator('#server-error'); assert.ok(await se.isVisible());
    assert.deepStrictEqual(await se.locator('a').evaluateAll(a => a.map(x => x.getAttribute('href').split(':')[0])), ['tel', 'sms', 'mailto']);
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ t: a.textContent.trim().slice(0, 30), h: a.getAttribute('href') })));
    out.push({ order_links: links, errs }); await ctx.close(); }
  { const { ctx, page, errs } = await open(375, 'ok', 'index.html'); await page.waitForTimeout(800);
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ t: a.textContent.trim().slice(0, 30), h: a.getAttribute('href') })));
    for (const l of links) if (/^(order|index)\.html/.test(l.h)) { const r = await page.request.get(BASE + l.h.split('?')[0]); assert.strictEqual(r.status(), 200, l.h); }
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim()));
    const addb = page.locator('#shop-grid button:not([disabled])', { hasText: /Add/ }).first();
    let cartOk = 'no add button';
    if (await addb.count()) { await addb.click(); await page.waitForTimeout(300); cartOk = (await page.locator('#cart-bar').isVisible()) ? await page.locator('#cart-go').getAttribute('href') : 'cart bar hidden';
      if (await page.locator('#cart-clear').isVisible()) { await page.click('#cart-clear'); cartOk += ' | clear->' + (await page.locator('#cart-bar').isHidden() ? 'hidden' : 'still visible'); } }
    out.push({ index_links: links, index_buttons: btns, cart: cartOk, overflow: await ovf(page), errs }); await ctx.close(); }
  await b.close(); console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
