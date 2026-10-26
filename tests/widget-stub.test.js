// Runs widgets/ienn-widget.js against minimal Scriptable stubs (success, thresholds, offline+cache, offline no cache, bad key, setup).
const fs = require('fs'), path = require('path'), assert = require('assert');
const src0 = fs.readFileSync(path.join(__dirname, '..', 'widgets', 'ienn-widget.js'), 'utf8');
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const payload = { ok: true, updated: new Date().toISOString(), metrics: [
  { id: 'visits', label: 'Visits', today: 12, week: 88, unit: '' }, { id: 'orders', label: 'Orders', today: 1, week: 3, unit: '' },
  { id: 'revenue', label: 'Sales', today: 16.31, week: 31.31, unit: '$' }] };
async function run({ family = 'medium', net, files = {}, edit = s => s }) {
  const texts = [], el = () => { const o = { addText(s) { const t = { s, rightAlignText() {} }; texts.push(t); return t; }, addStack: () => el(), addSpacer() {}, layoutVertically() {}, centerAlignContent() {}, setPadding() {} }; return o; };
  let set = null;
  const g = {
    Color: Object.assign(function (h) { this.h = h; }, { white: () => ({ h: '#fff' }) }), Size: function () {},
    Font: new Proxy({}, { get: () => () => ({}) }),
    ListWidget: function () { Object.assign(this, el()); this.presentMedium = async () => {}; this.presentSmall = async () => {}; },
    FileManager: { local: () => ({ joinPath: (a, b) => a + '/' + b, documentsDirectory: () => '/d', fileExists: p => p in files, readString: p => files[p], writeString: (p, s) => (files[p] = s) }) },
    Request: function (u) { this.url = u; this.loadJSON = async () => net(u); },
    DateFormatter: function () { this.string = d => d.toISOString().slice(11, 16); },
    config: { runsInWidget: true, widgetFamily: family }, Script: { setWidget: w => (set = w), complete() {} },
  };
  await new AsyncFn(...Object.keys(g), edit(src0))(...Object.values(g));
  assert(set, 'widget set'); return { texts: texts.map(t => t.s), colors: texts.map(t => t.textColor && t.textColor.h), files };
}
const cfg = s => s.replace('"PASTE_WEB_APP_URL_HERE"', '"https://script.google.com/macros/s/X/exec"').replace('"PASTE_METRICS_KEY_HERE"', '"k&y"');
(async () => {
  let r = await run({ net: u => { assert(u.endsWith('?view=metrics&key=k%26y'), u); return payload; }, edit: cfg });
  assert(r.texts.includes('12') && r.texts.includes('7d  88') && r.texts.includes('$16') && r.texts.some(t => /^Updated /.test(t)), r.texts);
  assert(!r.colors.includes('#2f7d4a') && !r.colors.includes('#b0413e'), 'neutral with no thresholds');
  const cached = r.files['/d/ienn-widget-cache.json']; assert(cached);
  r = await run({ family: 'small', net: () => payload, edit: s => cfg(s).replace('const THRESHOLDS = {};', 'const THRESHOLDS = { visits: { today: { good: 10 } }, orders: { week: { good: 5, bad: 3 } } };') });
  assert(r.texts.includes('IENN')); const i = r.texts.indexOf('12'); assert.strictEqual(r.colors[i], '#2f7d4a'); assert.strictEqual(r.colors[r.texts.indexOf('3')], '#b0413e');
  r = await run({ net: () => { throw new Error('offline'); }, files: { '/d/ienn-widget-cache.json': cached }, edit: cfg });
  assert(r.texts.includes('12') && r.texts.some(t => /^Offline · Updated /.test(t)), r.texts);
  r = await run({ net: () => { throw new Error('offline'); }, edit: cfg }); assert(r.texts.includes('No connection yet — will retry.'));
  r = await run({ net: () => ({ ok: false, error: 'unauthorized' }), edit: cfg }); assert(r.texts.includes('Key not accepted'));
  r = await run({ net: () => assert.fail('no fetch before setup') }); assert(r.texts.some(t => /paste ENDPOINT/.test(t)));
  console.log('widget stub: all passed');
})().catch(e => { console.error(e); process.exit(1); });
