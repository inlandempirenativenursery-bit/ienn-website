// Promo banner browser tests. Serve repo: python3 -m http.server 8766; needs playwright (NODE_PATH) + Chrome.
const { chromium } = require('playwright'); const assert = require('assert');
const BASE = 'http://localhost:' + (process.env.PORT || 8766) + '/', SHOTS = process.env.SHOTS || '/workspace/ienn-website-shots/promo/';
const pac = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }); const day = o => pac.format(new Date(Date.now() + o * 864e5));
const P = (x) => Object.assign({ title: 'Fall sale', message: 'Plant now.', discount: '', start: day(-1), end: day(0), pages: 'all' }, x);
let pass = 0; const ok = n => { pass++; console.log('ok -', n); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  async function open(w, promos, path = 'order.html', keepCtx) {
    const ctx = keepCtx || await b.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 }, hasTouch: w < 500 }); const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && !/Failed to load resource|net::/.test(m.text()) && errs.push(m.text()));
    await page.route(/script\.google\.com/, r => { const u = r.request().url();
      if (/view=promos/.test(u)) return promos === 'error' ? r.fulfill({ status: 500, body: 'x' }) : r.fulfill({ contentType: 'application/json', body: JSON.stringify(promos) });
      if (/view=inventory/.test(u)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 3, plants: [{ name: 'White Sage', fullName: 'White Sage', botanical: 'Salvia apiana', sizes: [{ key: '4"', size: '4-inch pot', price: 6, qty: 5 }] }] }) });
      return r.fulfill({ body: '' }); });
    await page.goto(BASE + path); await page.waitForTimeout(400); return { ctx, page, errs };
  }
  const vis = p => p.locator('.promo-backdrop').isVisible();
  const ovf = p => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  for (const pg of ['order.html', 'index.html']) {
    let o = await open(375, { ok: true, promos: [P()] }, pg); assert.ok(await vis(o.page)); assert.strictEqual(await o.page.getAttribute('.promo-modal', 'role'), 'dialog');
    assert.strictEqual(await o.page.evaluate(() => document.activeElement.textContent), 'Shop now'); ok(pg + ': active in-range promo shows, focus in dialog');
    await o.ctx.close();
    for (const [n, f] of [['out of range (future)', { ok: true, promos: [P({ start: day(2), end: day(9) })] }], ['out of range (past)', { ok: true, promos: [P({ start: day(-9), end: day(-1) })] }],
      ['empty / no tab', { ok: true, promos: [] }], ['feed error', 'error'], ['other page only', { ok: true, promos: [P({ pages: pg === 'order.html' ? 'home' : 'order' })] }]]) {
      o = await open(375, f, pg); assert.ok(!(await vis(o.page)) && !(await o.page.locator('.promo-strip').isVisible()), n); assert.deepStrictEqual(o.errs, []); await o.ctx.close(); ok(pg + ': none when ' + n);
    }
  }
  // dismiss methods + persistence
  for (const how of ['close', 'esc', 'backdrop', 'shop']) {
    const o = await open(375, { ok: true, promos: [P()] });
    if (how === 'close') await o.page.click('.promo-x'); if (how === 'esc') await o.page.keyboard.press('Escape');
    if (how === 'backdrop') await o.page.mouse.click(5, 5); if (how === 'shop') await o.page.click('.promo-go');
    assert.ok(!(await vis(o.page)), how); assert.ok(await o.page.locator('.promo-strip').isVisible(), 'strip after ' + how); ok('dismiss via ' + how);
    if (how === 'close') {
      await o.page.keyboard.press('Tab'); // focus trap check after reopen
      await o.page.click('.promo-strip'); assert.ok(await vis(o.page)); for (let i = 0; i < 4; i++) await o.page.keyboard.press('Tab');
      assert.ok(await o.page.evaluate(() => !!document.activeElement.closest('.promo-modal')), 'focus trapped'); await o.page.keyboard.press('Escape'); ok('strip reopens; Tab stays in dialog');
      const o2 = await open(375, { ok: true, promos: [P()] }, 'order.html', o.ctx); assert.ok(!(await vis(o2.page)) && await o2.page.locator('.promo-strip').isVisible()); ok('dismissal persists across loads');
      const o3 = await open(375, { ok: true, promos: [P({ title: 'Spring sale' })] }, 'order.html', o.ctx); assert.ok(await vis(o3.page)); ok('new promo (different title) shows again');
    }
    await o.ctx.close();
  }
  // layout + screenshots (mock mode)
  for (const w of [375, 1280]) for (const pg of ['order.html', 'index.html']) {
    const o = await open(w, { ok: true, promos: [] }, pg + '?promo-test=1'); assert.ok(await vis(o.page));
    assert.ok(!(await ovf(o.page)), 'overflow ' + w); assert.deepStrictEqual(o.errs, []);
    const hBtn = await o.page.locator('.promo-x').boundingBox(), hGo = await o.page.locator('.promo-go').boundingBox(); assert.ok(hBtn.height >= 44 && hBtn.width >= 44 && hGo.height >= 44);
    if (pg === 'order.html') { await o.page.screenshot({ path: SHOTS + 'promo-' + w + '.png' });
      const y0 = await o.page.evaluate(() => document.querySelector('header').getBoundingClientRect().top); await o.page.keyboard.press('Escape');
      assert.strictEqual(await o.page.evaluate(() => document.querySelector('header').getBoundingClientRect().top), y0, 'no layout shift');
      await o.page.screenshot({ path: SHOTS + 'promo-' + w + '-dismissed.png' }); }
    await o.ctx.close(); ok(pg + ' @' + w + ': mock mode, no overflow, no console errors, 44px taps, no shift');
  }
  await b.close(); console.log('\n' + pass + ' promo browser tests passed');
})().catch(e => { console.error(e); process.exit(1); });
