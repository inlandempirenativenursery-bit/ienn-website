/* Species-only Yarrow care: Achillea millefolium has careBullets; plants without approved care must not (White sage: tests/white-sage-care.test.js).
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
for (const name of ['Eriogonum fasciculatum', 'Diplacus longiflorus', 'Stipa pulchra']) {
  const b = ctx.iennBasics(name);
  assert.ok(!b || !b.careBullets, name + ' must not expose careBullets');
}
assert.ok(!ctx.IENN_BASICS.Achillea.careBullets, 'genus Achillea must not carry careBullets');

assert.strictEqual(y.careCommon, 'Common yarrow');
assert.strictEqual(y.careIntro, 'is a perennial with feathery leaves and flat clusters of white flowers, usually growing 1–3 feet tall.');
const bullets = [
  'Give it full sun to partial shade. Inland, some afternoon shade is often a better fit.',
  'It tolerates many soils; avoid constantly wet ground.',
  'Water during establishment, then adjust for drainage, heat and site conditions. Established plants have low water needs.',
  'Blooms from spring into fall and attracts pollinators.',
  'Spreads by rhizomes (underground stems) and can reseed, so give it room.'
];
bullets.forEach((line, i) => { assert.strictEqual(y.careBullets[i], line, 'bullet ' + (i + 1)); });
assert.ok(Array.isArray(y.careSources) && y.careSources.length === 3);
assert.strictEqual(y.careSources[0].name, 'Calscape (CNPS)');
assert.strictEqual(y.careSources[1].name, 'Theodore Payne Foundation');
assert.strictEqual(y.careSources[2].name, 'Las Pilitas Nursery');
assert.strictEqual(y.careSources[0].url, 'https://calscape.org/Achillea-millefolium-(Common-Yarrow)');
assert.strictEqual(y.careSources[1].url, 'https://store.theodorepayne.org/products/theodore-payne-foundation-achillea-millefolium');
assert.strictEqual(y.careSources[2].url, 'https://www.laspilitas.com/nature-of-california/plants/14--achillea-millefolium-californica');
assert.strictEqual(y.careSourceName, 'Calscape (CNPS)');
assert.strictEqual(y.careSourceUrl, y.careSources[0].url);
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
