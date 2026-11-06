/* Species-only Yarrow care: Achillea millefolium has careBullets; other plants must not. */
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('path').join(__dirname, '..', 'data', 'plant-basics.js'), 'utf8'), ctx);
const y = ctx.iennBasics('Achillea millefolium');
assert.ok(y && Array.isArray(y.careBullets) && y.careBullets.length === 5);
assert.strictEqual(y.careBotanical, 'Achillea millefolium');
assert.strictEqual(y.genusLevel, false);
for (const name of ['Salvia apiana', 'Eriogonum fasciculatum', 'Diplacus longiflorus', 'Stipa pulchra']) {
  const b = ctx.iennBasics(name);
  assert.ok(!b || !b.careBullets, name + ' must not expose careBullets');
}
assert.ok(!ctx.IENN_BASICS.Achillea.careBullets, 'genus Achillea must not carry careBullets');
const shop = fs.readFileSync(require('path').join(__dirname, '..', 'shop.js'), 'utf8');
assert.ok(shop.includes('function speciesCareBlock'));
assert.ok(!shop.includes('x.desc'), 'must not newly render generic desc');
assert.ok(shop.includes('if (!x || !x.careBullets || !x.careBullets.length) return null'));
console.log('yarrow-care: all passed');
