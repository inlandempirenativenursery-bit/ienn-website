// Browser tests for the polish pass. Serves the repo via python http.server on :8765 and mocks the Apps Script /exec.
const { chromium } = require(process.env.PW || 'playwright'); const assert = require('assert');
const BASE = process.env.BASE || 'http://localhost:8765/', SHOTS = process.env.SHOTS || 'docs/screenshots/v2/';  // serve repo: python3 -m http.server 8765; needs playwright
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
      if (r.request().method() === 'POST') { if (mode === 'fail') return r.fulfill({ status: 500, body: 'x' }); const pl = JSON.parse(r.request().postData()); global.lastPayload = pl;
        if (!pl.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pl.email) || !pl.items.length || !pl.items.every(i => i.plant && i.sizeKey && i.qty >= 1)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'invalid', message: 'bad payload' }) });
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, orderId: 'INV-1042', total: JSON.parse(r.request().postData()).items.length ? undefined : 0 }) }); }
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
    assert.match(names[0], /Yarrow/, 'feed order (no rank fields): ' + names.join(','));
    // review-oct20 rules: counted feed => all-zero plants hidden, 0-qty chips hidden, nothing preselected, no exact counts
    assert.strictEqual(await page.locator('.card', { hasText: 'Woolly Blue Curls' }).count(), 0, 'woolly (all 0) hidden');
    assert.strictEqual(await page.locator('.card', { hasText: 'Toyon' }).count(), 0, 'toyon (all 0) hidden');
    assert.strictEqual(await page.locator('.chip[aria-pressed="true"]').count(), 0, 'no preselected chip');
    const mf = page.locator('.card', { hasText: 'Sticky Monkeyflower' });
    assert.strictEqual(await mf.locator('.chip', { hasText: '4-inch' }).count(), 0, '0-qty chip hidden');
    assert.ok(await mf.locator('.add').isEnabled(), 'single counted size => Add works'); assert.strictEqual(await mf.locator('.chip[aria-pressed="true"]').count(), 0, 'single size not highlighted');
    const ya = page.locator('.card', { hasText: 'Yarrow' }); assert.strictEqual(await ya.locator('.add').textContent(), 'Add to tray'); await ya.locator('.add').click(); assert.strictEqual(await ya.locator('.size-hint').textContent(), 'Choose a size first');
    await mf.locator('.chip', { hasText: '1-gal' }).click(); assert.ok(await mf.locator('.ask-note').isVisible(), 'qty 4 < 5 => Ask us');
    for (const c of await page.locator('.chip-request').all()) assert.notStrictEqual(await c.evaluate(e => getComputedStyle(e).textDecorationLine), 'line-through');
    assert.ok(!/\d+ left|Only \d|NaN/.test(await page.locator('#plant-list').innerText()), 'no exact counts');
    assert.strictEqual(await page.locator('p.hint', { hasText: 'on request' }).count(), 1, 'on-request note once');
    // tap targets
    const small = await page.evaluate(() => [...document.querySelectorAll('main button, .cartbar a, main a')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 40 && !e.closest('p,li')).map(e => e.textContent.trim()));
    assert.deepStrictEqual(small, [], 'small targets: ' + small);
    // pickup shown once in pickup box
    assert.strictEqual(await page.locator('.notice').count(), 0, 'old pickup box merged into drawer'); assert.strictEqual(await page.locator('form').count(), 1, 'one form');
    assert.strictEqual(await page.locator('#steps').count(), 0, 'how-it-works removed'); assert.strictEqual(await page.locator('header img[alt="Inland Empire Native Nursery logo"]').count(), 1);
    assert.match(await page.locator('body').innerText(), /Connecting people to native plants/);
    assert.ok(!/\[TODO|Photo coming soon/.test(await page.locator('body').innerText()));
    if (w === 375) { await page.screenshot({ path: SHOTS + 'phone-top.png' }); await page.locator('#plant-list').scrollIntoViewIfNeeded(); await page.evaluate(() => document.getElementById('plant-list').scrollIntoView()); await page.screenshot({ path: SHOTS + 'phone-cards.png' }); }
    else await page.screenshot({ path: SHOTS + 'desktop-full-1280.png', fullPage: true });
    // add flow
    const ws = page.locator('.card', { hasText: 'White Sage' });
    await ws.locator('.chip', { hasText: '4-inch' }).click(); await ws.locator('.stepper button').last().click(); await ws.locator('.add').click();
    await mf.locator('.add').click();
    await page.locator('.card', { hasText: 'Yarrow' }).locator('.chip', { hasText: '4-inch' }).click(); await page.locator('.card', { hasText: 'Yarrow' }).locator('.add').click();
    const tot = await page.locator('#summary-body').innerText(); assert.match(tot, /Total: \$33\.00/); // 2x$6 (WS 4") + $15 (MF 1 gal) + $6 (Yarrow 4")
    assert.ok(!/Reserve/.test(await page.locator('body').innerText()), 'no Reserve wording');
    assert.match(await page.locator('#cartbar-go').textContent(), /^Check out \(\d+\)$/);
    await page.locator('#cartbar-go').click(); await page.waitForTimeout(400);
    assert.ok(await page.locator('#checkout').isVisible(), 'drawer opens'); assert.strictEqual(await page.locator('#checkout').getAttribute('aria-modal'), 'true');
    assert.match(await page.locator('#checkout').innerText(), /Sierra & Baseline[\s\S]*Cash or Zelle/); assert.ok(!/\d+ [A-Z][a-z]+ (Ave|St|Rd|Blvd)/.test(await page.locator('#checkout').innerText()), 'no street address');
    assert.match(await page.locator('label[for=phone]').textContent(), /optional, for text updates/);
    // Esc closes and keeps the tray; reopen
    await page.keyboard.press('Escape'); await page.waitForTimeout(400); assert.ok(await page.locator('#checkout').isHidden()); assert.ok(await page.locator('#cartbar').isVisible());
    await page.locator('#cartbar-go').click(); await page.waitForTimeout(400);
    // focus trap
    for (let i = 0; i < 40; i++) await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => document.getElementById('checkout').contains(document.activeElement)), 'focus trapped');
    // tray qty edit inside drawer
    const q0 = await page.locator('#summary-body .tq span').first().textContent(); await page.locator('#summary-body li .tq').first().locator('button').last().click();
    assert.strictEqual(Number(await page.locator('#summary-body .tq span').first().textContent()), Number(q0) + 1); await page.locator('#summary-body li .tq').first().locator('button').first().click();
    const small2 = await page.evaluate(() => [...document.querySelectorAll('#checkout button, #checkout input, #checkout select')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e => e.id || e.textContent)); assert.deepStrictEqual(small2, [], 'drawer targets');
    // cart: size label not broken
    const nw = await page.evaluate(() => [...document.querySelectorAll('#summary-body .nw')].every(s => s.getClientRects().length === 1));
    assert.ok(nw, 'size labels unbroken');
    const rm = await page.locator('.rm').first().boundingBox(); assert.ok(rm.height >= 44 && rm.width >= 44);
    if (w === 375) await page.screenshot({ path: SHOTS + 'phone-cart.png' }); else { await page.screenshot({ path: SHOTS + 'desktop-cart-1280.png' }); }
    await page.fill('#name', 'Ana Ruiz'); await page.fill('#email', 'ana@example.com'); await page.click(".submit-btn"); await page.waitForTimeout(1500);
    assert.ok(await page.locator('#confirm').isVisible()); assert.ok(await page.locator('#checkout').isHidden());
    assert.deepStrictEqual(Object.keys(global.lastPayload).sort(), ['email', 'items', 'name', 'notes', 'payment', 'phone', 'pickup']); assert.match(global.lastPayload.items[0].plant, /\(/, 'fullName sent');
    assert.match(await page.locator('#confirm').innerText(), /Email us: plants@inlandempirenativenursery\.com/); assert.ok(await page.locator('.submit-btn').isHidden());
    assert.match(await page.locator('#confirm').innerText(), /INV-1042[\s\S]*Total: \$33\.00/);
    const cb = await page.locator('#confirm').boundingBox(); assert.ok(cb.y >= -5 && cb.y < 200, 'confirm at top: ' + cb.y);
    assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'confirm');
    if (w === 375) await page.screenshot({ path: SHOTS + 'phone-confirm.png' }); else await page.screenshot({ path: SHOTS + 'desktop-confirm-1280.png' });
    await page.click('#new-order'); await page.waitForTimeout(600); assert.ok(await page.locator('#confirm').isHidden());
    out.push({ w, overflow: await ovf(page), errs }); assert.ok(!out.at(-1).overflow); assert.deepStrictEqual(errs, []); await ctx.close();
  }
  // failure fallback + click-through
  { const { ctx, page, errs } = await open(375, 'fail'); await page.waitForSelector('.card:not(.skel)');
    await page.locator('.card').first().locator('.chip:not(.chip-request)').first().click(); await page.locator('.card').first().locator('.add').click(); await page.click('#cartbar-go'); await page.fill('#name', 'A'); await page.fill('#email', 'a@b.co'); await page.click('.submit-btn'); await page.waitForTimeout(600);
    const se = page.locator('#server-error'); assert.ok(await se.isVisible());
    assert.deepStrictEqual(await se.locator('a').evaluateAll(a => a.map(x => x.getAttribute('href').split(':')[0])), ['tel', 'sms', 'mailto']);
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ t: a.textContent.trim().slice(0, 30), h: a.getAttribute('href') })));
    out.push({ order_links: links, errs }); await ctx.close(); }
  { const { ctx, page, errs } = await open(375, 'ok', 'index.html'); await page.waitForTimeout(1500);
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ t: a.textContent.trim().slice(0, 30), h: a.getAttribute('href') })));
    for (const l of links) if (/^(order|index)\.html/.test(l.h)) { const r = await page.request.get(BASE + l.h.split('?')[0]); assert.strictEqual(r.status(), 200, l.h); }
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim()));
    assert.strictEqual(await page.locator('#plant-list .chip[aria-pressed="true"]').count(), 0, 'home: no preselected size');
    assert.strictEqual(await page.locator('#plant-list .card', { hasText: 'Toyon' }).count(), 0, 'home: all-zero plant hidden');
    assert.ok(!/\d+ left|Only \d|Low stock/.test(await page.locator('#plant-list').innerText()), 'home: no exact counts');
    const hc = page.locator('#plant-list .card:not(.skel)').first(); await hc.locator('.chip:not(.chip-request)').first().click();
    assert.strictEqual(await hc.locator('.chip[aria-pressed="true"]').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(46, 125, 50)');
    await hc.locator('.add').click(); await page.waitForTimeout(300);
    const cartOk = (await page.locator('#cartbar').isVisible()) ? await page.locator('#hdr-checkout').getAttribute('href') : 'tray bar hidden';
    assert.ok(/order\.html\?checkout=1/.test(cartOk), 'home cart: ' + cartOk); assert.deepStrictEqual(errs, []);
    out.push({ index_links: links, index_buttons: btns, cart: cartOk, overflow: await ovf(page), errs }); await ctx.close(); }
  await b.close(); console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
