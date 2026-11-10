// node tests/care-faq-sync.test.js : Plant Care Basics entries on order.html must match pickup-info.html word for word
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const entries = (html) => [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)].map((m) => [m[1], m[2]]);
const pickup = read('pickup-info.html'), order = read('order.html');
const pCare = entries(pickup.split('<h2 id="care-faq-title">Plant Care Basics</h2>')[1].split('</section>')[0]);
const oCare = entries(order.split('<div class="pickup-faq" aria-label="Plant Care Basics">')[1].split('</div>')[0]);
assert.strictEqual(pCare.length, 8, 'pickup-info care entries');
assert.deepStrictEqual(oCare, pCare, 'order.html care entries drifted from pickup-info.html');
const oPick = entries(order.split('<div class="pickup-faq" aria-label="Pickup FAQ">')[1].split('</div>')[0]);
assert.strictEqual(oPick.length, 6, 'order.html Pickup FAQ unchanged (6 entries)');
assert.ok(!/<details open/.test(order.split('id="pickup-info"')[1]), 'order FAQ closed by default');
assert.ok(/aria-label="Plant Care Basics">[\s\S]*?<p class="faq-print"><a href="pickup-info.html">Printable pickup info<\/a><\/p>\s*<\/div>/.test(order), 'printable link after care list');
console.log('care-faq-sync: all passed');
