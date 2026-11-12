// node tests/datura-form-tagline.test.js : Datura IENN_FORM tagline no longer says "toxic if eaten"; care caution unchanged
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
const src = fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8');
vm.runInContext(src, ctx);
assert.strictEqual(JSON.stringify(ctx.IENN_FORM.Datura), JSON.stringify(['Perennial', 'Big white evening trumpets']), 'IENN_FORM Datura tagline');
assert.strictEqual(ctx.iennBasics('Datura wrightii').form, 'Perennial');
assert.strictEqual(ctx.iennBasics('Datura wrightii').tag, 'Big white evening trumpets');
assert.ok(!src.includes('toxic if eaten'), 'plant-basics.js must not contain "toxic if eaten"');
assert.ok(ctx.iennBasics('Datura wrightii').careIntro.includes('Caution: all parts of the plant are toxic.'), 'care-page caution left alone');
assert.ok(ctx.iennBasics('Datura wrightii').desc.includes('All parts of the plant are toxic.'));
const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
assert.ok(!/\.tag\b/.test(shop) && !/\.desc\b/.test(shop), 'shop.js never displays tag or desc');
for (const f of ['index.html', 'order.html', 'plant-care.html']) {
  assert.ok(fs.readFileSync(path.join(root, f), 'utf8').includes('data/plant-basics.js?v=care15-1112'), f + ' cache string');
}
console.log('datura-form-tagline: passed');
