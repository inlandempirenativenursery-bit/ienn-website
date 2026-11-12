// node tests/datura-card-note.test.js : no card note on any plant (Eric, Nov 11: removed); taglines/desc never render; "toxic if eaten" nowhere
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
// no plant carries a card note, at genus or species level
for (const g of Object.keys(ctx.IENN_BASICS)) assert.ok(!ctx.IENN_BASICS[g].cardNote, 'genus ' + g + ' must not have a cardNote');
for (const k of Object.keys(ctx.IENN_BASICS_SPECIES)) assert.ok(!ctx.IENN_BASICS_SPECIES[k].cardNote, k + ' must not have a cardNote');
// Datura's hidden desc keeps the short wording (data only, not displayed)
assert.strictEqual(ctx.iennBasics('Datura wrightii').desc, 'Large white trumpet flowers open in the evening for night-flying moths. All parts of the plant are toxic.');
// the shop never displays card notes, taglines or desc
const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
assert.ok(!/cardNote|card-note/.test(shop), 'shop.js renders no card note');
assert.ok(!/\.tag\b/.test(shop) && !/\.desc\b/.test(shop), 'shop.js never displays tag or desc');
assert.ok(!/card-note/.test(fs.readFileSync(path.join(root, 'shop.css'), 'utf8')), 'no card-note style');
// "toxic if eaten" never ships in a page, script or style the shop serves
const files = ['index.html', 'order.html', 'plant-care.html', 'pickup-info.html', 'shop.js', 'shop.css', 'stock-view.js', 'inventory.js', 'plant-search.js', 'plant-photos.js'];
for (const f of files) assert.ok(!fs.readFileSync(path.join(root, f), 'utf8').includes('toxic if eaten'), f + ': no "toxic if eaten"');
console.log('datura-card-note: passed (no card notes; taglines/desc not displayed)');
