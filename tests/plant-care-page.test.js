/* Species-keyed care page data + URL rules. Yarrow only approved; no fallback.
   Card: compact More info & care link only. Full sheet on plant-care.html. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);

assert.strictEqual(typeof ctx.iennHasApprovedCare, 'function');
assert.strictEqual(typeof ctx.iennApprovedCare, 'function');
assert.ok(ctx.iennHasApprovedCare('Achillea millefolium'));
assert.ok(ctx.iennApprovedCare('Achillea millefolium'));
assert.strictEqual(ctx.iennApprovedCare('Achillea millefolium').careBotanical, 'Achillea millefolium');
assert.strictEqual(ctx.iennApprovedCare('Achillea millefolium').careBullets.length, 5);
assert.ok(ctx.iennApprovedCare('Achillea millefolium').careIntro);

// Missing / unknown / genus-only — no approved care, no Yarrow fallback
for (const name of ['Salvia apiana', 'Eriogonum fasciculatum', 'Not A Real Plant', 'Achillea', '']) {
  assert.strictEqual(ctx.iennHasApprovedCare(name), false, name);
  assert.strictEqual(ctx.iennApprovedCare(name), null, name);
}

const careHtml = fs.readFileSync(path.join(root, 'plant-care.html'), 'utf8');
assert.ok(careHtml.includes('iennApprovedCare'));
assert.ok(careHtml.includes('plant-basics.js'));
assert.ok(careHtml.includes('break-inside:avoid') || careHtml.includes('page-break-inside:avoid'));
assert.ok(careHtml.includes('ienn-logo-horizontal.jpg'));
assert.ok(!careHtml.includes('pickup-info.html#yarrow-care'));
/* Full sheet still rendered on the dedicated care page */
assert.ok(careHtml.includes('care.careIntro'));
assert.ok(careHtml.includes('care.careBullets'));
assert.ok(careHtml.includes('care.careSourceUrl'));

const pickup = fs.readFileSync(path.join(root, 'pickup-info.html'), 'utf8');
assert.ok(pickup.includes('Pickup FAQ'));
assert.ok(!pickup.includes('Yarrow care'));
assert.ok(!pickup.includes('Achillea millefolium'));
assert.ok(pickup.includes('break-inside:avoid'));

const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
assert.ok(shop.includes('plant-care.html?species='));
assert.ok(shop.includes('More info & care'));
assert.ok(shop.includes('function speciesCareLink'));
assert.ok(!shop.includes('pickup-info.html#yarrow-care'));
assert.ok(shop.includes('if (!x || !x.careBullets || !x.careBullets.length || !x.careBotanical) return null'));
/* Card must not embed long care block */
assert.ok(!shop.includes('species-care-list'));
assert.ok(!shop.includes('species-care-title'));
assert.ok(!shop.includes('x.careBullets.forEach'));
assert.ok(!shop.includes('careIntro'));
/* Link click must not be swallowed by basics flip */
assert.ok(shop.includes('bp.pane.addEventListener("click", function (e) { if (e.target.closest("a")) return;'));
assert.ok(shop.includes('bp.pane.addEventListener("keydown", function (e) { if (e.target.closest("a")) return;'));

const order = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
assert.ok(order.includes('Printable pickup info</a>'));
assert.ok(!order.includes('Yarrow care</a>'));
assert.ok(order.includes('available on request (add them in Notes)'));

const css = fs.readFileSync(path.join(root, 'shop.css'), 'utf8');
assert.ok(css.includes('.species-care-link'));
assert.ok(!css.includes('.species-care-list'));
assert.ok(!css.includes('.species-care-title'));

// Canonical example URL
const example = 'plant-care.html?species=' + encodeURIComponent('Achillea millefolium');
assert.strictEqual(example, 'plant-care.html?species=Achillea%20millefolium');

console.log('plant-care-page: all passed');
