// node tests/batch9-cards.test.js : batch-9 card labels (Eric, Nov 12 11:50 AM PT); species rows only
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
const B = (n) => ctx.iennBasics(n);
const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
const SOILL = JSON.parse(/var SOILL = (\{[^}]*\})/.exec(shop)[1]);
const WATL = ["", "Low water", "Moderate water", "Regular water"];
const label = (n) => SOILL[B(n).soil] || B(n).soil;
const water = (n) => { const w = B(n).water; return Array.isArray(w) ? w : WATL[w]; };
const hw = (n) => JSON.stringify([B(n).h, B(n).w]);
const bloom = (n) => JSON.stringify(B(n).bloom);
const sun = (n) => JSON.stringify(B(n).sun);

// Showy milkweed: water Moderate -> Low; bloom Summer -> Spring and Summer; size unchanged
assert.strictEqual(water('Asclepias speciosa'), 'Low water', 'Showy milkweed water');
assert.strictEqual(B('Asclepias speciosa').water, 1);
assert.strictEqual(bloom('Asclepias speciosa'), '["Sp","Su"]', 'Showy milkweed Spring and Summer');
assert.ok(B('Asclepias speciosa').careIntro.includes('flowers in spring and summer'));
assert.ok(B('Asclepias speciosa').careBullets[2] === 'Water during establishment, then very little once established.');
assert.strictEqual(hw('Asclepias speciosa'), '[[2,4],[2,4]]', 'Showy size unchanged');
assert.strictEqual(sun('Asclepias speciosa'), '["full"]', 'Showy sun unchanged');
assert.strictEqual(label('Asclepias speciosa'), 'Any soil', 'Showy soil unchanged');

// Woollypod milkweed: sun full -> full/part (Sun / part sun); bloom Summer -> Spring and Summer; else unchanged
assert.strictEqual(sun('Asclepias eriocarpa'), '["full","part"]', 'Woollypod sun / part sun');
assert.ok(B('Asclepias eriocarpa').careBullets[0] === 'Give it full sun to partial shade.');
assert.strictEqual(bloom('Asclepias eriocarpa'), '["Sp","Su"]', 'Woollypod Spring and Summer');
assert.ok(B('Asclepias eriocarpa').careIntro.includes('in spring and summer'));
assert.strictEqual(water('Asclepias eriocarpa'), 'Low water', 'Woollypod water unchanged');
assert.strictEqual(hw('Asclepias eriocarpa'), '[[1,3],[1,2]]', 'Woollypod size unchanged');
assert.strictEqual(label('Asclepias eriocarpa'), 'Any soil', 'Woollypod soil unchanged');

// Narrowleaf milkweed unchanged
assert.strictEqual(bloom('Asclepias fascicularis'), '["Sp","Su","F"]', 'Narrowleaf bloom unchanged');
assert.strictEqual(hw('Asclepias fascicularis'), '[[2,3],[1,3]]', 'Narrowleaf size unchanged');
assert.strictEqual(sun('Asclepias fascicularis'), '["full"]', 'Narrowleaf sun unchanged');
assert.strictEqual(water('Asclepias fascicularis'), 'Moderate water', 'Narrowleaf water unchanged');
assert.strictEqual(label('Asclepias fascicularis'), 'Any soil', 'Narrowleaf soil unchanged');
assert.strictEqual(B('Asclepias fascicularis').careCommon, 'Narrowleaf milkweed');
assert.ok(B('Asclepias fascicularis').careIntro.includes('in spring, summer and fall'));
assert.strictEqual(B('Asclepias fascicularis').careSources.length, 3);

// genus untouched
assert.strictEqual(ctx.IENN_BASICS.Asclepias.water, 2);
assert.strictEqual(JSON.stringify(ctx.IENN_BASICS.Asclepias.sun), '["full"]');
assert.strictEqual(JSON.stringify(ctx.IENN_BASICS.Asclepias.bloom), '["Su"]');
assert.strictEqual(ctx.IENN_BASICS.Asclepias.soil, 'Adaptable');
assert.strictEqual(JSON.stringify([ctx.IENN_BASICS.Asclepias.h, ctx.IENN_BASICS.Asclepias.w]), '[[2,3],[1,3]]');
console.log('batch9-cards: passed');
