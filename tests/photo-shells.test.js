/* Photo shells shown before the inventory feed: images only, no availability. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

const ctx = {};
ctx.window = ctx;
ctx.console = console;
vm.createContext(ctx);
for (const f of ['plant-photos.js', 'data/plant-basics.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
}

const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
assert.ok(shop.includes('function photoShellPlants'));
assert.ok(shop.includes('Checking availability'));
assert.ok(shop.includes('is-pending'));
assert.ok(shop.includes('fetchpriority'));
assert.ok(!/pendingCard[\s\S]{0,800}(Add to tray|In stock|price-tag)/.test(shop), 'pendingCard must not include Add/stock/price');

const slugSrc = shop.match(/function slug\(t\) \{[^}]+\}/)[0];
const start = shop.indexOf('function photoShellPlants()');
const end = shop.indexOf('function preloadShellPhotos');
assert.ok(start > 0 && end > start, 'could not extract photoShellPlants');
const fnSrc = shop.slice(start, end);
vm.runInContext(slugSrc + '\n' + fnSrc, ctx);
const plants = ctx.photoShellPlants();
assert.ok(plants.length >= 8, 'enough stills for a first viewport, got ' + plants.length);
plants.forEach((p) => {
  assert.ok(p.image, p.name + ' has a photo');
  assert.ok(!p.sizes || p.sizes.length === 0, p.name + ' has no sizes/prices');
  assert.strictEqual(p.pending, true);
  assert.ok(!ctx.iennHidden(p), p.name + ' must not be a hidden plant');
});
assert.ok(plants[0].image.indexOf('yarrow') >= 0, 'yarrow painted first for LCP, got ' + plants[0].image);
['coyote-brush', 'bush-poppy', 'arizona-cypress', 'cleveland-sage', 'purple-sage', 'hummingbird-sage'].forEach((slugName) => {
  assert.ok(!plants.some((p) => (p.image || '').indexOf('/' + slugName + '.') >= 0 || (p.image || '').indexOf('/' + slugName + '-') >= 0), slugName + ' hidden');
});
assert.ok(plants.some((p) => /bush sunflower/i.test(p.name) || (p.image || '').indexOf('california-encelia') >= 0), 'bush sunflower still present');

const css = fs.readFileSync(path.join(root, 'shop.css'), 'utf8');
assert.ok(css.includes('.card.is-pending'));
assert.ok(css.includes('440px'));

for (const f of ['index.html', 'order.html']) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  assert.ok(html.includes('shop.js?v=feed1120'), f);
  assert.ok(html.includes('shop.css?v=feed1120'), f);
  assert.ok(html.includes('yarrow-400.webp'), f + ' preloads yarrow');
  assert.ok(html.includes('fetchpriority="high"'), f);
}

console.log('photo-shells: ' + plants.length + ' shells, first=' + plants[0].name + '; all passed');
