// Runs widgets/ienn-widget.js against minimal Scriptable stubs (success, thresholds, offline+cache, offline no cache, bad key, setup).
const fs = require('fs'), path = require('path'), assert = require('assert');
const src0 = fs.readFileSync(path.join(__dirname, '..', 'widgets', 'ienn-widget.js'), 'utf8');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const per = (today, d7, d30, qtd, ytd) => ({ today, d7, d30, qtd, ytd });
const payload = { ok: true, updated: new Date().toISOString(), metrics: [
  { id: 'visits', label: 'Visits', unit: '', periods: per(12, 88, 301, 255, 1904), today: 12, week: 88, since: { ytd: '2026-04-24' } },
  { id: 'orders', label: 'Orders', unit: '', periods: per(1, 3, 9, 7, 41), today: 1, week: 3 },
  { id: 'revenue', label: 'Sales', unit: '$', periods: per(16.31, 31.31, 250.5, 199, 12345), today: 16.31, week: 31.31 }] };
const legacy = { ok: true, updated: payload.updated, metrics: [{ id: 'visits', label: 'Visits', unit: '', today: 5, week: 40 }] };
async function run({ family = 'medium', param = null, net, files = {}, edit = s => s, imgNet = () => ({ size: { width: 10 } }), images = {} }) {
  const texts = [], imgs = [], imgFetch = [], el = () => { const o = { addImage(i) { const r = { i }; imgs.push(r); return r; }, addText(s) { const t = { s, rightAlignText() {} }; texts.push(t); return t; }, addStack: () => el(), addSpacer() {}, layoutVertically() {}, centerAlignContent() {}, setPadding() {} }; return o; };
  let set = null;
  const g = {
    Color: Object.assign(function (h) { this.h = h; }, { white: () => ({ h: '#fff' }) }), Size: function (w, h) { this.w = w; this.h = h; },
    Font: new Proxy({}, { get: () => () => ({}) }),
    ListWidget: function () { Object.assign(this, el()); this.presentMedium = async () => {}; this.presentSmall = async () => {}; },
    FileManager: { local: () => ({ joinPath: (a, b) => a + '/' + b, documentsDirectory: () => '/d', fileExists: p => p in files || p in images, readString: p => files[p], writeString: (p, s) => (files[p] = s),
      modificationDate: p => images[p].t, readImage: p => images[p].img, writeImage: (p, img) => (images[p] = { img, t: new Date() }) }) },
    Request: function (u) { this.url = u; this.loadJSON = async () => net(u); this.loadImage = async () => { imgFetch.push(u); return imgNet(u); }; },
    DateFormatter: function () { this.string = d => d.toISOString().slice(11, 16); },
    config: { runsInWidget: true, widgetFamily: family }, args: { widgetParameter: param }, Script: { setWidget: w => (set = w), complete() {} },
  };
  await new AsyncFn(...Object.keys(g), edit(src0))(...Object.values(g));
  assert(set, 'widget set'); return { w: set, imgs, imgFetch, images, texts: texts.map(t => t.s), colors: texts.map(t => t.textColor && t.textColor.h), files };
}
const cfg = s => s.replace('"PASTE_WEB_APP_URL_HERE"', '"https://script.google.com/macros/s/X/exec"').replace('"PASTE_METRICS_KEY_HERE"', '"k&y"');
(async () => {
  // default (no Parameter) = 7 days
  let r = await run({ net: u => { assert(u.endsWith('?view=metrics&key=k%26y'), u); return payload; }, edit: cfg });
  assert(r.texts.includes('today · 7 days') && r.texts.includes('12') && r.texts.includes('7d  ') && r.texts.includes('88') && r.texts.includes('$16'), r.texts);
  assert(r.texts.some(t => /^Updated /.test(t)) && !r.texts.some(t => /from Apr/.test(t)), r.texts);
  assert(!r.colors.includes('#2a6e40') && !r.colors.includes('#a33a37'), 'neutral with no thresholds');
  const cached = r.files['/d/ienn-widget-cache.json']; assert(cached);
  // small + 30d
  r = await run({ family: 'small', param: '30d', net: () => payload, edit: cfg });
  assert(r.texts.includes('today · 30d') && r.texts.includes('301') && r.texts.includes('$251') && !r.texts.includes('88'), r.texts);
  // medium + ytd: clipped visits get * and the footer explains
  r = await run({ param: 'YTD', net: () => payload, edit: cfg });
  assert(r.texts.includes('today · year to date') && r.texts.includes('YTD  ') && r.texts.includes('1,904*') && r.texts.includes('$12.3k') && r.texts.includes('41'), r.texts);
  assert(r.texts.some(t => / · \*from /.test(t)), r.texts);
  // qtd label
  r = await run({ param: 'qtd', net: () => payload, edit: cfg }); assert(r.texts.includes('today · this quarter') && r.texts.includes('255'));
  // medium 'all': header row + every period for every metric
  r = await run({ param: 'all', net: () => payload, edit: cfg });
  for (const t of ['Today', '7d', '30d', 'QTD', 'YTD', '12', '88', '301', '255', '1,904*', '41', '$12.3k']) assert(r.texts.includes(t), t + ' in ' + r.texts);
  // 'all' on small falls back to 7d; junk parameter falls back to 7d
  r = await run({ family: 'small', param: 'all', net: () => payload, edit: cfg }); assert(r.texts.includes('today · 7d') && r.texts.includes('88'));
  r = await run({ family: 'small', param: 'banana', net: () => payload, edit: cfg }); assert(r.texts.includes('today · 7d'));
  // thresholds per period
  const th = s => cfg(s).replace('const THRESHOLDS = {};', 'const THRESHOLDS = { visits: { today: { good: 10 }, d30: { bad: 400 } }, orders: { d7: { good: 5, bad: 3 }, d30: { good: 9 } } };');
  r = await run({ family: 'small', param: '30d', net: () => payload, edit: th });
  assert.strictEqual(r.colors[r.texts.indexOf('12')], '#2a6e40'); assert.strictEqual(r.colors[r.texts.indexOf('301')], '#a33a37');
  assert.strictEqual(r.colors[r.texts.indexOf('9')], '#2a6e40'); assert.strictEqual(r.colors[r.texts.indexOf('$251')], '#5a6859', 'no threshold = neutral');
  r = await run({ family: 'small', net: () => payload, edit: th }); assert.strictEqual(r.colors[r.texts.indexOf('3')], '#a33a37', 'd7 threshold');
  // legacy 'week' threshold key still works for d7
  r = await run({ family: 'small', net: () => payload, edit: s => cfg(s).replace('const THRESHOLDS = {};', 'const THRESHOLDS = { visits: { week: { good: 50 } } };') });
  assert.strictEqual(r.colors[r.texts.indexOf('88')], '#2a6e40');
  // older endpoint (today/week only) still renders; other periods show –
  r = await run({ net: () => legacy, edit: cfg }); assert(r.texts.includes('5') && r.texts.includes('40'));
  r = await run({ param: 'ytd', net: () => legacy, edit: cfg }); assert(r.texts.includes('–'));
  // offline with cache / without cache / bad key / not configured
  r = await run({ param: 'ytd', net: () => { throw new Error('offline'); }, files: { '/d/ienn-widget-cache.json': cached }, edit: cfg });
  assert(r.texts.includes('1,904*') && r.texts.some(t => /^Offline · Updated /.test(t)), r.texts);
  r = await run({ net: () => { throw new Error('offline'); }, edit: cfg }); assert(r.texts.includes('No connection yet — will retry.'));
  r = await run({ net: () => ({ ok: false, error: 'unauthorized' }), edit: cfg }); assert(r.texts.includes('Key not accepted'));
  r = await run({ net: () => assert.fail('no fetch before setup') }); assert(r.texts.some(t => /paste ENDPOINT/.test(t)));
  // images: logo + size-matched background downloaded once, cached, reused; logo scaled only (full 1500:847 frame)
  r = await run({ family: 'small', net: () => payload, edit: cfg });
  assert.deepStrictEqual(r.imgFetch.map(u => u.replace(/\?v=\d+$/, '')).sort(), ['https://www.inlandempirenativenursery.com/widgets/bg-small.jpg', 'https://www.inlandempirenativenursery.com/widgets/logo.jpg']);
  assert(r.w.backgroundImage && r.imgs.length === 1 && !r.texts.includes('IENN'), 'logo replaces the text title');
  const sz = r.imgs[0].imageSize; assert(Math.abs(sz.w / sz.h - 1500 / 847) < 0.02, 'logo aspect kept: ' + JSON.stringify(sz));
  let r2 = await run({ family: 'small', net: () => payload, edit: cfg, images: r.images }); assert.strictEqual(r2.imgFetch.length, 0, 'cached images reused');
  r2 = await run({ net: () => payload, edit: cfg, images: r.images }); assert(r2.imgFetch.some(u => /bg-medium\.jpg/.test(u)), 'medium has its own background');
  // images unavailable (offline, never cached): plain cream + text title, numbers still shown
  r = await run({ net: () => payload, edit: cfg, imgNet: () => { throw new Error('offline'); } });
  assert(!r.w.backgroundImage && r.w.backgroundColor.h === '#f8f6f3' && r.texts.includes('Inland Empire Native Nursery') && r.texts.includes('12'));
  console.log('widget stub: all passed');
})().catch(e => { console.error(e); process.exit(1); });
