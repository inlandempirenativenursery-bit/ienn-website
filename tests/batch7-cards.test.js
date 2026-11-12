// node tests/batch7-cards.test.js : batch-7 card labels (Eric, Nov 12 10:52 AM PT); species rows only
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
const B = (n) => ctx.iennBasics(n);
const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
const SOILL = JSON.parse(/var SOILL = (\{[^}]*\})/.exec(shop)[1]);
const label = (n) => SOILL[B(n).soil] || B(n).soil;
const hw = (n) => JSON.stringify([B(n).h, B(n).w]);
const bloom = (n) => JSON.stringify(B(n).bloom);

// the three card values
assert.strictEqual(label('Artemisia californica'), 'Any soil', 'California sagebrush soil');
assert.strictEqual(hw('Atriplex canescens'), '[[2,4],[3,7]]', 'Four-winged saltbush 2–4 × 3–7 ft');
assert.strictEqual(bloom('Atriplex canescens'), '["Su"]', 'Four-winged saltbush Summer only');
// care pages agree with the labels
assert.ok(B('Artemisia californica').careBullets[1] === 'It grows in most soil types.');
assert.ok(B('Atriplex canescens').careIntro.includes('2–4 feet tall and 3–7 feet wide'));
assert.ok(B('Atriplex canescens').careIntro.includes('flowers in summer'));
// Deerweed: no card changes (still the genus numbers)
assert.strictEqual(label('Acmispon glaber'), 'Any soil', 'Deerweed soil unchanged');
assert.strictEqual(hw('Acmispon glaber'), '[[2,3],[3,3]]', 'Deerweed size unchanged');
assert.strictEqual(bloom('Acmispon glaber'), '["Sp","Su"]', 'Deerweed bloom unchanged');
// genus entries unchanged
assert.strictEqual(ctx.IENN_BASICS.Artemisia.soil, 'Fast-draining');
assert.strictEqual(JSON.stringify([ctx.IENN_BASICS.Atriplex.h, ctx.IENN_BASICS.Atriplex.w]), '[[1,10],[3,7]]');
assert.strictEqual(JSON.stringify(ctx.IENN_BASICS.Atriplex.bloom), '["W","Sp","Su","F"]');
assert.strictEqual(ctx.IENN_BASICS.Atriplex.soil, 'Adaptable');
assert.strictEqual(ctx.IENN_BASICS.Acmispon.soil, 'Adaptable');
assert.strictEqual(JSON.stringify([ctx.IENN_BASICS.Acmispon.h, ctx.IENN_BASICS.Acmispon.w]), '[[2,3],[3,3]]');
assert.strictEqual(JSON.stringify(ctx.IENN_BASICS.Acmispon.bloom), '["Sp","Su"]');
// other cards unchanged (neighbors + batch 6)
assert.strictEqual(label('Romneya coulteri'), 'Any soil', 'Matilija poppy unchanged');
assert.strictEqual(label('Encelia farinosa'), 'Any soil', 'Brittlebush unchanged');
assert.strictEqual(label('Sphaeralcea ambigua'), 'Sandy or clay', 'Apricot mallow unchanged');
assert.strictEqual(label('Encelia californica'), 'Any soil', 'Bush sunflower soil unchanged');
assert.strictEqual(hw('Encelia californica'), '[[3,4],[3,5]]', 'Bush sunflower size unchanged');
assert.strictEqual(hw('Artemisia californica'), '[[3,5],[3,5]]', 'California sagebrush size still from genus');
assert.strictEqual(bloom('Artemisia californica'), '["F"]', 'California sagebrush bloom still Fall');
console.log('batch7-cards: passed');
