// node tests/batch6-soil.test.js : batch-6 card soil labels (Eric, Nov 12 9:28 AM PT); species rows only
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
const B = (n) => ctx.iennBasics(n);
// card label = SOILL[soil] || soil (shop.js)
const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
const SOILL = JSON.parse(/var SOILL = (\{[^}]*\})/.exec(shop)[1]);
const label = (n) => SOILL[B(n).soil] || B(n).soil;
const hwBS = () => JSON.stringify([B('Encelia californica').h, B('Encelia californica').w]);
assert.strictEqual(label('Romneya coulteri'), 'Any soil', 'Matilija poppy');
assert.strictEqual(label('Encelia farinosa'), 'Any soil', 'Brittlebush');
assert.strictEqual(label('Sphaeralcea ambigua'), 'Sandy or clay', 'Apricot mallow');
// care pages support the labels
assert.ok(B('Romneya coulteri').careBullets[1] === 'It grows in most soil types.');
assert.ok(B('Encelia farinosa').careBullets[1] === 'It grows in most soil types.');
assert.ok(B('Sphaeralcea ambigua').careBullets[1].includes('including sandy or clay soils'));
// genus entries and neighbors unchanged
assert.strictEqual(ctx.IENN_BASICS.Encelia.soil, 'Fast-draining');
assert.strictEqual(ctx.IENN_BASICS.Romneya.soil, 'Fast-draining');
assert.strictEqual(ctx.IENN_BASICS.Sphaeralcea.soil, 'Fast-draining');
assert.strictEqual(B('Encelia californica').soil, 'Adaptable', 'Bush sunflower soil unchanged (already Adaptable on main)');
assert.strictEqual(hwBS(), '[[3,4],[3,5]]', 'Bush sunflower size unchanged');
assert.ok(!B('Encelia californica').careCommon || B('Encelia californica').careCommon === 'Bush sunflower', 'Bush sunflower care unchanged');
// sizes as on the care pages (unchanged)
const hw = (n) => JSON.stringify([B(n).h, B(n).w]);
assert.strictEqual(hw('Romneya coulteri'), '[[5,8],[5,10]]');
assert.strictEqual(hw('Encelia farinosa'), '[[1,5],[2,4]]');
assert.strictEqual(hw('Sphaeralcea ambigua'), '[[3,5],[2,4]]');
console.log('batch6-soil: passed');
