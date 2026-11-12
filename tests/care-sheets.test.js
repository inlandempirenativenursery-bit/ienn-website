// node tests/care-sheets.test.js : data-driven checks for approved care sheets (one spec per plant in tests/care-sheets/)
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), dir = path.join(__dirname, 'care-sheets'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
const plain = (v) => JSON.parse(JSON.stringify(v));
const specs = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => Object.assign({ file: f }, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
const FIXED = ['Achillea millefolium', 'Salvia apiana'];   // own tests: yarrow-care / white-sage-care
for (const sp of specs) {
  const x = ctx.iennBasics(sp.key);
  assert.ok(x && x.careBullets, sp.file + ': care missing for ' + sp.key);
  assert.strictEqual(x.careCommon, sp.careCommon, sp.file + ' careCommon');
  assert.strictEqual(x.careBotanical, sp.careBotanical, sp.file + ' careBotanical');
  assert.strictEqual(x.careBotanical, sp.key, sp.file + ' careBotanical must equal its own species key');
  assert.strictEqual(x.careIntro, sp.careIntro, sp.file + ' careIntro');
  assert.deepStrictEqual(plain(x.careBullets), sp.careBullets, sp.file + ' careBullets');
  assert.deepStrictEqual(plain(x.careSources), sp.careSources, sp.file + ' careSources');
  assert.strictEqual(x.careSourceName, sp.careSources[0].name, sp.file + ' careSourceName');
  assert.strictEqual(x.careSourceUrl, sp.careSources[0].url, sp.file + ' careSourceUrl');
  assert.strictEqual(ctx.iennHasApprovedCare(sp.key), true, sp.file);
}
// allowlist: exactly the fixed sheets + the specs present; nothing at genus level
const expected = [...FIXED, ...specs.map((s) => s.key)].sort();
const approved = Object.keys(ctx.IENN_BASICS_SPECIES).filter((k) => ctx.IENN_BASICS_SPECIES[k].careBullets).sort();
assert.deepStrictEqual(plain(approved), expected, 'species with care = Yarrow + White sage + tests/care-sheets specs');
for (const g of Object.keys(ctx.IENN_BASICS)) assert.ok(!ctx.IENN_BASICS[g].careBullets && !ctx.IENN_BASICS[g].careIntro, 'genus ' + g + ' must not carry care');
// no leaking: any botanical that resolves to care must resolve to its own sheet (aliases resolve to their target)
const ALIAS = plain(ctx.IENN_BASICS_ALIAS);
const probes = ['Asclepias speciosa', 'Asclepias eriocarpa', 'Eriogonum crocatum', 'Calystegia macrostegia', 'Artemisia californica', 'Acmispon glaber', 'Atriplex canescens', 'Romneya coulteri', 'Romneya trichocalyx', 'Sphaeralcea ambigua', 'Sphaeralcea munroana', 'Encelia farinosa', 'Encelia actoni', 'Penstemon spectabilis', 'Penstemon centranthifolius', 'Penstemon heterophyllus', 'Trichostema lanatum', 'Trichostema parishii', 'Eschscholzia californica', 'Baileya multiradiata', 'Epilobium canum', 'Epilobium ciliatum', 'Eriogonum fasciculatum', 'Hesperoyucca whipplei', 'Penstemon grinnellii', 'Penstemon spectabilis', 'Penstemon centranthifolius', 'Eriogonum crocatum', 'Salvia mellifera', 'Salvia clevelandii', 'Salvia leucophylla', 'Salvia spathacea', 'Diplacus longiflorus', 'Diplacus calycinus', 'Diplacus aurantiacus',
  'Erythranthe cardinalis', 'Erythranthe guttata', 'Encelia californica', 'Encelia farinosa', 'Eriogonum giganteum', 'Eriogonum fasciculatum', 'Eriogonum crocatum',
  'Asclepias fascicularis', 'Asclepias speciosa', 'Asclepias eriocarpa', 'Rhus ovata', 'Rhus integrifolia', 'Muhlenbergia rigens', 'Muhlenbergia capillaris',
  'Bouteloua gracilis', 'Bouteloua dactyloides', 'Stipa pulchra', 'Nassella pulchra', 'Stipa cernua', 'Datura wrightii', 'Datura inoxia', 'Achillea millefolium', 'Salvia apiana'];
for (const n of probes) {
  const x = ctx.iennBasics(n), own = ALIAS[n] || n;
  if (expected.includes(own)) assert.ok(x && x.careBotanical === own, n + ' should show its own care (' + own + ')');
  else assert.ok(!x || !x.careBullets, n + ' must not pick up another plant\'s care');
}
console.log('care-sheets: ' + specs.length + ' specs, all passed');
