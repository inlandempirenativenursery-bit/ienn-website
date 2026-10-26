// Runs widgets/ienn-widget.js against minimal Scriptable stubs (success, thresholds, offline+cache, offline no cache, bad passphrase,
// setup, in-app passphrase flow with Keychain + Alert).
const fs = require('fs'), path = require('path'), assert = require('assert');
const src0 = fs.readFileSync(path.join(__dirname, '..', 'widgets', 'ienn-widget.js'), 'utf8');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const per = (today, d7, d30, qtd, ytd) => ({ today, d7, d30, qtd, ytd });
const payload = { ok: true, updated: new Date().toISOString(), metrics: [
  { id: 'visits', label: 'Visits', unit: '', periods: per(12, 88, 301, 255, 1904), today: 12, week: 88, since: { ytd: '2026-04-24' } },
  { id: 'orders', label: 'Orders', unit: '', periods: per(1, 3, 9, 7, 41), today: 1, week: 3 },
  { id: 'revenue', label: 'Sales', unit: '$', periods: per(16.31, 31.31, 250.5, 199, 12345), today: 16.31, week: 31.31 }] };
const legacy = { ok: true, updated: payload.updated, metrics: [{ id: 'visits', label: 'Visits', unit: '', today: 5, week: 40 }] };
async function run({ family = 'medium', param = null, net, files = {}, edit = s => s, imgNet = () => ({ size: { width: 10 } }), images = {},
  keychain = { ienn_metrics_key: 'k&y' }, mode = 'widget', answers = [] }) {
  const alerts = [], presented = [];
  const texts = [], imgs = [], imgFetch = [], el = () => { const o = { addImage(i) { const r = { i }; imgs.push(r); return r; }, addText(s) { const t = { s, rightAlignText() {} }; texts.push(t); return t; }, addStack: () => el(), addSpacer() {}, layoutVertically() {}, centerAlignContent() {}, setPadding() {} }; return o; };
  let set = null;
  const g = {
    Color: Object.assign(function (h) { this.h = h; }, { white: () => ({ h: '#fff' }) }), Size: function (w, h) { this.w = w; this.h = h; },
    Font: new Proxy({}, { get: () => () => ({}) }),
    ListWidget: function () { Object.assign(this, el()); this.presentMedium = async () => { presented.push(['medium', this]); }; this.presentSmall = async () => { presented.push(['small', this]); }; },
    Keychain: { contains: k => k in keychain, get: k => { if (!(k in keychain)) throw new Error('missing'); return keychain[k]; }, set: (k, v) => (keychain[k] = v), remove: k => { delete keychain[k]; } },
    Alert: function () { const a = this, f = []; a.actions = []; a.addAction = t => a.actions.push(t); a.addDestructiveAction = t => a.actions.push(t); a.addCancelAction = () => {};
      a.addSecureTextField = (ph) => { a.secure = true; f.push(ph); }; a.addTextField = () => { throw new Error('use a secure field'); };
      a.presentAlert = async () => { alerts.push({ title: a.title, message: a.message, actions: a.actions.slice(), secure: !!a.secure });
        const ans = answers.shift() || { i: 0 }; a._text = ans.text; return ans.i; };
      a.textFieldValue = () => a._text; },
    FileManager: { local: () => ({ joinPath: (a, b) => a + '/' + b, documentsDirectory: () => '/d', fileExists: p => p in files || p in images, readString: p => files[p], writeString: (p, s) => (files[p] = s),
      modificationDate: p => images[p].t, readImage: p => images[p].img, writeImage: (p, img) => (images[p] = { img, t: new Date() }) }) },
    Request: function (u) { this.url = u; this.loadJSON = async () => net(u); this.loadImage = async () => { imgFetch.push(u); return imgNet(u); }; },
    DateFormatter: function () { this.string = d => d.toISOString().slice(11, 16); },
    config: { runsInWidget: mode === 'widget', runsInApp: mode === 'app', widgetFamily: mode === 'widget' ? family : null }, args: { widgetParameter: param }, Script: { setWidget: w => (set = w), complete() {} },
  };
  await new AsyncFn(...Object.keys(g), edit(src0))(...Object.values(g));
  if (mode === 'widget') assert(set, 'widget set');
  return { alerts, presented, keychain, w: set, imgs, imgFetch, images, texts: texts.map(t => t.s), colors: texts.map(t => t.textColor && t.textColor.h), files };
}
const cfg = s => s;   // the script needs no editing any more (endpoint prefilled, passphrase from Keychain)
const EXEC = 'https://script.google.com/macros/s/AKfycby_sfzJNwCYq1Sf6qwcBb_batYrvGDR3LUlc5YJFs-C-hbd4vAkH7rvBrkDATWrVX3X/exec';
// The shared file must carry no secret: no hardcoded key constant, no key-looking literal.
assert(!/\bKEY\s*=\s*["']/.test(src0) && !/key=[A-Za-z0-9]{8,}/.test(src0), 'no hardcoded key in the script');
assert(src0.includes(`const ENDPOINT = "${EXEC}"`), 'endpoint prefilled with the site\'s /exec URL');
(async () => {
  // default (no Parameter) = 7 days
  let r = await run({ net: u => { assert.strictEqual(u, EXEC + '?view=metrics&key=k%26y'); return payload; }, edit: cfg });
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
  r = await run({ net: () => ({ ok: false, error: 'unauthorized' }), edit: cfg });
  assert(r.texts.includes('Passphrase not accepted — open Scriptable and run IENN'), r.texts); assert.strictEqual(r.keychain.ienn_metrics_key, 'k&y', 'widget never clears the Keychain by itself');
  r = await run({ keychain: {}, net: () => assert.fail('no fetch without a passphrase') });
  assert(r.texts.includes('Open Scriptable and run IENN once to set it up'), r.texts); assert.strictEqual(r.alerts.length, 0, 'no alerts inside a widget');

  // ---- in the app ----
  // first run: secure prompt -> saved to Keychain -> tested -> "Connected" -> medium preview
  let net = []; r = await run({ mode: 'app', keychain: {}, answers: [{ i: 0, text: '  s3cret pass ' }, { i: 0 }], net: u => { net.push(u); return payload; } });
  assert.strictEqual(r.alerts[0].message, 'Enter your IENN widget passphrase'); assert(r.alerts[0].secure, 'secure text field');
  assert.strictEqual(r.keychain.ienn_metrics_key, 's3cret pass'); assert(net[0].endsWith('key=s3cret%20pass'));
  assert.strictEqual(r.alerts[1].title, 'Connected'); assert.strictEqual(r.presented[0][0], 'medium');
  // wrong passphrase: cleared + told so, nothing previewed
  r = await run({ mode: 'app', keychain: {}, answers: [{ i: 0, text: 'nope' }, { i: 0 }], net: () => ({ ok: false, error: 'unauthorized' }) });
  assert(!('ienn_metrics_key' in r.keychain)); assert.strictEqual(r.alerts[1].title, 'Passphrase not accepted'); assert.strictEqual(r.presented.length, 0);
  // offline while setting up: kept, user told
  r = await run({ mode: 'app', keychain: {}, answers: [{ i: 0, text: 'abc' }, { i: 0 }], net: () => { throw new Error('offline'); } });
  assert.strictEqual(r.keychain.ienn_metrics_key, 'abc'); assert(/couldn't be reached/.test(r.alerts[1].message));
  // cancel / empty: nothing saved, no fetch
  r = await run({ mode: 'app', keychain: {}, answers: [{ i: -1 }], net: () => assert.fail('no fetch') }); assert.deepStrictEqual(r.keychain, {});
  r = await run({ mode: 'app', keychain: {}, answers: [{ i: 0, text: '  ' }, { i: 0 }], net: () => assert.fail('no fetch') }); assert.deepStrictEqual(r.keychain, {});
  // key saved: menu -> preview medium / small
  r = await run({ mode: 'app', answers: [{ i: 0 }], net: () => payload });
  assert.deepStrictEqual(r.alerts[0].actions, ['Preview widget (medium)', 'Preview widget (small)', 'Change passphrase', 'Remove passphrase']);
  assert.strictEqual(r.presented[0][0], 'medium'); assert(r.texts.includes('12'));
  r = await run({ mode: 'app', answers: [{ i: 1 }], net: () => payload }); assert.strictEqual(r.presented[0][0], 'small');
  // change passphrase (accepted) / remove passphrase / cancel menu
  r = await run({ mode: 'app', answers: [{ i: 2 }, { i: 0, text: 'new-one' }, { i: 0 }], net: () => payload }); assert.strictEqual(r.keychain.ienn_metrics_key, 'new-one');
  r = await run({ mode: 'app', answers: [{ i: 3 }, { i: 0 }], net: () => assert.fail('no fetch') }); assert(!('ienn_metrics_key' in r.keychain)); assert.strictEqual(r.alerts[1].title, 'Removed');
  r = await run({ mode: 'app', answers: [{ i: -1 }], net: () => assert.fail('no fetch') }); assert.strictEqual(r.keychain.ienn_metrics_key, 'k&y'); assert.strictEqual(r.presented.length, 0);
  // the passphrase never ends up in local files (only the metrics JSON is cached)
  r = await run({ mode: 'app', keychain: {}, answers: [{ i: 0, text: 'zz-secret-zz' }, { i: 0 }], net: () => payload });
  assert(!JSON.stringify(r.files).includes('zz-secret-zz'));
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
