// Stock requests (extra/canRequest, notices, stock rejection). Serve repo: python3 -m http.server PORT; BASE=http://localhost:PORT/
// Feed and POSTs are fully MOCKED (page.route): no request ever reaches Apps Script, no real order is placed.
const { chromium } = require(process.env.PW || 'playwright'); const assert = require('assert');
const BASE = process.env.BASE || 'http://localhost:8765/', SHOTS = process.env.SHOTS || 'docs/screenshots/stock-requests/';
const S = (key, size, price, qty, extra) => ({ key, size, price, qty, extra, canRequest: extra > 0 });
const ask = () => [S('2"', '2-inch pot', 3, null, null), S('Tree pot', 'Quarter tree pot', 10, null, null)];
const feed = { version: 3, countDate: '2026-10-20', sortedBy: 'pin,popularity90d', plants: [
  { name: 'Yarrow', fullName: 'Yarrow (Achillea millefolium)', botanical: 'Achillea millefolium', rank: 1, sizes: [...ask(), S('4"', '4-inch pot', 6, 0, 6), S('1 gal', '1-gallon', 15, 0, 0)] },
  { name: 'White Sage', fullName: 'White Sage (Salvia apiana)', botanical: 'Salvia apiana', rank: 2, sizes: [...ask(), S('4"', '4-inch pot', 6, 3, 4), S('1 gal', '1-gallon', 15, 12, 0)] },
  { name: 'Toyon', fullName: 'Toyon (Heteromeles arbutifolia)', botanical: 'Heteromeles arbutifolia', rank: 3, sizes: [...ask(), S('4"', '4-inch pot', 6, 0, 0), S('1 gal', '1-gallon', 15, 0, null)] }] };
const NOTE = 'We have 3 ready now. We may have a few smaller ones; Andrew will reach out about the extra.'
const EVIL = 'Note <img src=x onerror=window.__xss=1> & <b>bold</b>';;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); let reply = null, posts = [];
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, deviceScaleFactor: 2 }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.route(/script\.google\.com/, r => {
    if (r.request().method() === 'POST') { posts.push(JSON.parse(r.request().postData())); return r.fulfill({ contentType: 'application/json', body: JSON.stringify(reply) }); }
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) });
  });
  await page.goto(BASE + 'order.html'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForSelector('.card:not(.skel)');
  const names = await page.locator('.card h3').allInnerTexts();
  assert.deepStrictEqual(names.map(n => n.replace(/^[A-Z]\d/, '')), ['Yarrow', 'White Sage'], 'feed order kept; Toyon (0 ready, no extra) hidden');
  const y = page.locator('.card').nth(0);
  assert.deepStrictEqual((await y.locator('.chip:not(.chip-request)').allInnerTexts()), ['4-inch $6'], '1 gal (0, no extra) hidden');
  assert.doesNotMatch(await page.locator('#plant-list').innerText(), /sold out|\b[0-9]+ (left|in stock)/i, 'no sold-out wording, no counts');
  await y.locator('.chip:not(.chip-request)').click(); assert.ok(await y.locator('.ask-note').isVisible(), 'qty 0 + canRequest => Ask us');
  for (let i = 0; i < 4; i++) await y.locator('.stepper button').last().click();
  assert.strictEqual(await y.locator('.stepper input').inputValue(), '5', 'no cap when canRequest');
  assert.strictEqual(await y.locator('.add').innerText(), 'Add to tray');
  await y.locator('.add').click(); assert.match(await y.locator('.incart').innerText(), /as a request/);
  await y.scrollIntoViewIfNeeded(); await y.screenshot({ path: SHOTS + 'ask-us-request-card.png' });
  // White Sage 4" qty 3 extra 4: want 6 > 3 -> request, not capped
  const w = page.locator('.card').nth(1); await w.locator('.chip:not(.chip-request)').first().click();
  for (let i = 0; i < 5; i++) await w.locator('.stepper button').last().click();
  await w.locator('.add').click(); assert.match(await page.locator('#cartbar').innerText(), /11 items/);
  // rejection: tray kept, messages in drawer (as text)
  reply = { ok: false, error: 'stock', message: 'Some plants in your order are not available right now.', problems: [{ plant: 'Yarrow', sizeKey: '4"', size: '4-inch pot', requested: 5, available: 0, ready: 0, extra: 0, message: 'Yarrow 4-inch pot is not available.' }, { plant: 'White Sage', sizeKey: '4"', size: '4-inch pot', requested: 6, available: 3, ready: 3, extra: 0, message: 'Only 3 White Sage 4-inch pot available.' }] };
  await page.click('#cartbar-go'); await page.waitForTimeout(450);
  await page.fill('#name', 'Test Only'); await page.fill('#email', 'test@example.com'); await page.fill('#notes', 'Mock test, not a real order.');
  await page.click('.submit-btn'); await page.waitForSelector('#server-error li');
  const se = await page.locator('#server-error').innerText();
  assert.match(se, /not available right now[\s\S]*Yarrow 4-inch pot is not available[\s\S]*Only 3 White Sage/);
  assert.match(await page.locator('#summary-body').innerText(), /5 × Yarrow[\s\S]*6 × White Sage/, 'tray kept');
  assert.ok(await page.locator('#checkout').isVisible());
  await page.locator('#server-error').scrollIntoViewIfNeeded(); await page.screenshot({ path: SHOTS + 'rejection-in-drawer.png' });
  // success with notices
  reply = { ok: true, orderId: 'MOCK-1042', notices: [{ plant: 'White Sage', sizeKey: '4"', size: '4-inch pot', requested: 6, ready: 3, extra: 4, message: NOTE }, { plant: 'Yarrow', message: EVIL }], total: 96, taxIncluded: true, items: [] };
  await page.click('.submit-btn'); await page.waitForSelector('#confirm:not([hidden])'); await page.waitForTimeout(700);
  assert.deepStrictEqual(await page.locator('#confirm-notices .stock-note').allInnerTexts(), [NOTE, EVIL], 'notices rendered as text');
  assert.strictEqual(await page.locator('#confirm-notices img').count(), 0); assert.ok(!(await page.evaluate(() => window.__xss)), 'no HTML injection');
  await page.evaluate(() => document.querySelectorAll('#confirm-notices .stock-note')[1].remove());   // keep the screenshot customer-like
  await page.locator('#confirm').screenshot({ path: SHOTS + 'confirmation-with-notice.png' });
  assert.strictEqual(posts.length, 2); assert.deepStrictEqual(posts[0].items.map(i => i.qty), [5, 6], 'request quantities sent uncapped');
  // old success shape (no notices) still fine
  await ctx.close();
  // home cards
  const c2 = await b.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true }); const h = await c2.newPage(); h.on('pageerror', e => errs.push(String(e)));
  await h.route(/script\.google\.com/, r => r.request().method() === 'POST' ? r.abort() : r.fulfill({ contentType: 'application/json', body: JSON.stringify(feed) }));
  await h.goto(BASE + 'index.html'); await h.waitForSelector('.plant-card');
  const hn = await h.locator('.plant-card h3').allInnerTexts(); assert.ok(!hn.some(n => /Toyon/.test(n)), 'home hides Toyon'); assert.strictEqual(hn.length, 2);
  const hy = h.locator('.plant-card', { hasText: 'Yarrow' }); assert.match(await hy.locator('.badge').innerText(), /Ask us/);
  await hy.locator('.pill:not(.req)').click(); for (let i = 0; i < 6; i++) await hy.locator('.step').last().click();
  assert.strictEqual(await hy.locator('output').innerText(), '7', 'home: no cap when canRequest'); assert.strictEqual(await hy.locator('.add-btn').innerText(), 'Add to tray');
  await hy.locator('.add-btn').click(); assert.match(await h.locator('#toast').innerText(), /Requested 7/);
  assert.doesNotMatch(await h.locator('#shop-grid').innerText(), /sold out/i);
  await c2.close(); assert.deepStrictEqual(errs, []); await b.close(); console.log('stock-requests e2e: all passed');
})().catch(e => { console.error(e); process.exit(1); });
