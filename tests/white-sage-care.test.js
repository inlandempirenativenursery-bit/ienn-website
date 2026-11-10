/* White sage (Salvia apiana) approved care sheet: exact copy, sources, and only approved species expose care. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
const s = ctx.iennBasics('Salvia apiana');
assert.strictEqual(s.careCommon, 'White sage');
assert.strictEqual(s.careBotanical, 'Salvia apiana');
assert.strictEqual(s.genusLevel, false);
assert.strictEqual(s.careIntro, 'is a shrub with fragrant silver-white leaves and tall wands of white flowers, sometimes with a hint of lavender, in spring and summer, usually growing 3–5 feet tall and 3–8 feet wide.');
assert.deepStrictEqual(Array.from(s.careBullets), [
  'Give it full sun.',
  'It needs well-drained soil and tolerates many soil types, including heavier soil, as long as it does not stay wet.',
  'Water during establishment, then very little once established. Too much water, especially in summer, can harm the plant.',
  'Give it room to reach 3–8 feet wide.',
  'After the flowers finish in late summer, spent stalks can be cut off. Sprawling branches can be trimmed at any time.'
]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(s.careSources.map((x) => [x.name, x.url]))), [
  ['Calscape (CNPS)', 'https://calscape.org/Salvia-apiana-(White-Sage)'],
  ['Theodore Payne Foundation', 'https://store.theodorepayne.org/products/theodore-payne-foundation-salvia-apiana'],
  ['Las Pilitas Nursery', 'https://www.laspilitas.com/nature-of-california/plants/604--salvia-apiana']
]);
assert.strictEqual(s.careSourceName, 'Calscape (CNPS)');
assert.strictEqual(s.careSourceUrl, s.careSources[0].url);
// existing basics untouched
assert.deepStrictEqual(Array.from(s.h), [3, 5]); assert.deepStrictEqual(Array.from(s.w), [3, 8]); assert.deepStrictEqual(Array.from(s.bloom), ['Sp', 'Su']);
assert.strictEqual(s.desc, 'Striking silver-white leaves with a strong fragrance and tall flower wands bees crowd around. Water very little once established.');
assert.ok(!ctx.IENN_BASICS.Salvia.careBullets, 'genus Salvia must not carry careBullets');
for (const name of ['Salvia mellifera', 'Salvia spathacea', 'Salvia clevelandii', 'Salvia leucophylla']) {
  const b = ctx.iennBasics(name); assert.ok(!b || !b.careBullets || b.careBotanical === name, name + ' must not inherit White sage care');
}
// full approved-care allowlist is data-driven in tests/care-sheets.test.js
assert.ok(ctx.IENN_BASICS_SPECIES['Salvia apiana'].careBullets);
for (const f of ['index.html', 'order.html', 'plant-care.html']) assert.ok(fs.readFileSync(path.join(root, f), 'utf8').includes('data/plant-basics.js?v=care2-1110'), f + ' cache string');
console.log('white-sage-care: all passed');
