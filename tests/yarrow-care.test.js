/* Species-only Yarrow care: Achillea millefolium has careBullets; other plants must not.
   Card shows compact "More info & care" link only — no long intro/bullets in the card. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
const y = ctx.iennBasics('Achillea millefolium');
assert.ok(y && Array.isArray(y.careBullets) && y.careBullets.length === 5);
assert.strictEqual(y.careBotanical, 'Achillea millefolium');
assert.strictEqual(y.genusLevel, false);
for (const name of ['Salvia apiana', 'Eriogonum fasciculatum', 'Diplacus longiflorus', 'Stipa pulchra']) {
  const b = ctx.iennBasics(name);
  assert.ok(!b || !b.careBullets, name + ' must not expose careBullets');
}
assert.ok(!ctx.IENN_BASICS.Achillea.careBullets, 'genus Achillea must not carry careBullets');
const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
assert.ok(shop.includes('function speciesCareLink'));
assert.ok(!shop.includes('function speciesCareBlock'));
assert.ok(!shop.includes('x.desc'), 'must not newly render generic desc');
assert.ok(shop.includes('if (!x || !x.careBullets || !x.careBullets.length || !x.careBotanical) return null'));
assert.ok(shop.includes('More info & care'));
assert.ok(shop.includes('plant-care.html?species='));
/* No long care prose/list rendered inside the plant card */
assert.ok(!shop.includes('careIntro'));
assert.ok(!shop.includes('species-care-list'));
assert.ok(!shop.includes('species-care-title'));
assert.ok(!shop.includes('x.careBullets.forEach'));
assert.ok(!shop.includes('Full care & print'));
console.log('yarrow-care: all passed');
