// node tests/batch5-sizes.test.js : card sizes match the approved batch-5 care sheets (Eric, Nov 12 8:53 AM PT)
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
const hw = (n) => { const x = ctx.iennBasics(n); return JSON.stringify([x.h, x.w]); };
assert.strictEqual(hw('Penstemon spectabilis'), '[[2,4],[3,4]]', 'Showy penstemon 2–4 × 3–4 ft');
assert.strictEqual(hw('Penstemon centranthifolius'), '[[2,4],[1,2]]', 'Scarlet bugler 2–4 × 1–2 ft (unchanged)');
assert.strictEqual(hw('Trichostema lanatum'), '[[4,4],[4,4]]', 'Woolly blue curls about 4 × 4 ft (species override)');
// genus entries untouched (other species keep the genus numbers)
assert.strictEqual(JSON.stringify([ctx.IENN_BASICS.Trichostema.h, ctx.IENN_BASICS.Trichostema.w]), '[[3,5],[3,5]]');
assert.strictEqual(JSON.stringify([ctx.IENN_BASICS.Penstemon.h, ctx.IENN_BASICS.Penstemon.w]), '[[2,4],[1,3]]');
assert.strictEqual(hw('Penstemon grinnellii'), '[[1,3],[1.5,2.5]]', 'Southern woodland penstemon unchanged');
// the care pages state the same sizes
const care = (n) => ctx.iennBasics(n).careIntro;
assert.ok(care('Penstemon spectabilis').includes('2–4 feet tall and 3–4 feet wide'));
assert.ok(care('Penstemon centranthifolius').includes('2–4 feet tall and 1–2 feet wide'));
assert.ok(care('Trichostema lanatum').includes('about 4 feet tall and 4 feet wide'));
console.log('batch5-sizes: passed');
