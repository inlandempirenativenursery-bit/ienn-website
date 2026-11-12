// node tests/batch8-cards.test.js : batch-8 card labels (Eric, Nov 12 11:21 AM PT); species rows only
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
const sun = (n) => JSON.stringify(B(n).sun);

// Conejo buckwheat: soil Clay-tolerant -> Adaptable ("Any soil"); other card fields unchanged
assert.strictEqual(label('Eriogonum crocatum'), 'Any soil', 'Conejo buckwheat soil');
assert.strictEqual(B('Eriogonum crocatum').soil, 'Adaptable');
assert.ok(B('Eriogonum crocatum').careBullets[1] === 'It grows in most soil types.', 'Conejo care page supports Any soil');
assert.strictEqual(hw('Eriogonum crocatum'), '[[1,3],[2,3]]', 'Conejo size unchanged');
assert.strictEqual(bloom('Eriogonum crocatum'), '["Sp","Su"]', 'Conejo bloom unchanged');
assert.strictEqual(sun('Eriogonum crocatum'), '["full"]', 'Conejo sun unchanged');
assert.strictEqual(B('Eriogonum crocatum').ie, false, 'Conejo ie unchanged');
// third source on this sheet only
assert.strictEqual(B('Eriogonum crocatum').careSources.length, 3);
assert.strictEqual(B('Eriogonum crocatum').careSources[2].name, 'CNPS Orange County');
assert.strictEqual(B('Eriogonum crocatum').careSourceName, 'Calscape (CNPS)');

// Morning glory: no card changes (still genus numbers)
assert.strictEqual(label('Calystegia macrostegia'), 'Any soil', 'Morning glory soil unchanged');
assert.strictEqual(sun('Calystegia macrostegia'), '["full","part"]', 'Morning glory sun unchanged');
assert.strictEqual(hw('Calystegia macrostegia'), '[[3,10],[3,6]]', 'Morning glory size unchanged');
assert.strictEqual(bloom('Calystegia macrostegia'), '["Sp","Su"]', 'Morning glory bloom unchanged');
assert.strictEqual(JSON.stringify(B('Calystegia macrostegia').water), '2', 'Morning glory water unchanged');
assert.ok(B('Calystegia macrostegia').careCommon === 'Morning glory');
assert.ok(B('Calystegia macrostegia').careIntro.includes('3–10 feet long and 3–6 feet wide'));
assert.ok(B('Calystegia macrostegia').careBullets[1] === 'It grows in most soil types.');
assert.ok(B('Calystegia macrostegia').careBullets[0].startsWith('Give it full sun to partial shade.'));
assert.strictEqual(B('Calystegia macrostegia').careSources.length, 2);

// genus entries and California buckwheat unchanged
assert.strictEqual(ctx.IENN_BASICS.Eriogonum.soil, 'Fast-draining', 'Eriogonum genus soil unchanged');
assert.strictEqual(ctx.IENN_BASICS.Calystegia.soil, 'Adaptable', 'Calystegia genus soil unchanged');
assert.strictEqual(label('Eriogonum fasciculatum'), 'Fast-draining', 'California buckwheat soil unchanged');
assert.strictEqual(hw('Eriogonum fasciculatum'), '[[2,4],[3,5]]', 'California buckwheat size unchanged');
assert.ok(B('Eriogonum fasciculatum').careCommon === 'California buckwheat', 'California buckwheat care unchanged');
assert.strictEqual(label('Eriogonum giganteum'), 'Fast-draining', "St. Catherine's lace soil unchanged");
// Rock monkeyflower is not in this batch
assert.ok(!B('Diplacus calycinus') || !B('Diplacus calycinus').careBullets, 'Rock monkeyflower must not gain care');
// neighbors unchanged
assert.strictEqual(label('Artemisia californica'), 'Any soil', 'California sagebrush unchanged');
assert.strictEqual(hw('Atriplex canescens'), '[[2,4],[3,7]]', 'Four-winged saltbush size unchanged');
assert.strictEqual(bloom('Atriplex canescens'), '["Su"]', 'Four-winged saltbush bloom unchanged');
console.log('batch8-cards: passed');
