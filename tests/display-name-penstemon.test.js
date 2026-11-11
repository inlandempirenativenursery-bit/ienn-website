// node tests/display-name-penstemon.test.js : site display name for Penstemon grinnellii (Eric, Nov 10 6:30 PM PT)
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'plant-photos.js'), 'utf8'), ctx);
assert.strictEqual(ctx.iennDisplayName("Grinnell's beardtongue"), 'Southern woodland penstemon');
assert.strictEqual(ctx.iennDisplayName("grinnell's BEARDTONGUE"), 'Southern woodland penstemon', 'case-insensitive');
assert.strictEqual(ctx.iennDisplayName('Southern woodland penstemon'), 'Southern woodland penstemon', 'already renamed in the sheet: unchanged');
// existing overrides untouched
assert.strictEqual(ctx.iennDisplayName('Sacred datura'), 'Datura');
assert.strictEqual(ctx.iennDisplayName('Sticky monkeyflower'), 'Southern bush monkeyflower');
assert.strictEqual(ctx.iennDisplayName('California brittlebush'), 'Bush sunflower');
assert.strictEqual(ctx.iennDisplayName('Showy penstemon'), 'Showy penstemon');
// photo resolves under both names
assert.strictEqual(JSON.stringify(ctx.ienPhoto('Southern woodland penstemon')), JSON.stringify(ctx.ienPhoto("Grinnell's beardtongue")));
assert.ok(JSON.stringify(ctx.ienPhoto('Southern woodland penstemon')).includes('grinnell-s-beardtongue'));
// no care added
assert.ok(ctx.iennHasApprovedCare('Penstemon grinnellii') && ctx.iennBasics('Penstemon grinnellii').careCommon === 'Southern woodland penstemon', 'care sheet uses the new name');
console.log('display-name-penstemon: passed');
// old-slug prefill alias in shop.js (order.html?grinnell-s-beardtongue=N -> southern-woodland-penstemon)
const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
const m = /var SLUG_ALIAS = (\{[^}]*\})/.exec(shop);
assert.ok(m, 'SLUG_ALIAS present');
const SA = JSON.parse(m[1]);
const slug = (t) => String(t).toLowerCase().replace(/\(.*?\)/g, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   // same as shop.js slug()
assert.strictEqual(SA[slug("Grinnell's beardtongue")], slug('Southern woodland penstemon'));
assert.strictEqual(SA['grinnells-beardtongue'], 'southern-woodland-penstemon');
assert.ok(shop.includes('parts[0] = SLUG_ALIAS[parts[0]] || parts[0];'), 'prefill applies the alias');
for (const f of ['index.html', 'order.html']) assert.ok(fs.readFileSync(path.join(root, f), 'utf8').includes('shop.js?v=alias1110'), f + ' shop.js cache string');
console.log('display-name-penstemon: slug alias passed');
