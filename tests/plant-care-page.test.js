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
const yCare = ctx.iennApprovedCare('Achillea millefolium');
assert.strictEqual(yCare.careIntro, 'is a perennial with feathery leaves and flat clusters of white flowers, usually growing 1–3 feet tall.');
assert.strictEqual(yCare.careBullets[0], 'Give it full sun to partial shade. Inland, some afternoon shade is often a better fit.');
assert.ok(Array.isArray(yCare.careSources) && yCare.careSources.length === 3);

// Missing / unknown / genus-only — no approved care, no Yarrow fallback
assert.strictEqual(ctx.iennHasApprovedCare('Salvia apiana'), true, 'White sage approved (Nov 10)');
for (const name of ['Salvia clevelandii', 'Eriogonum fasciculatum', 'Not A Real Plant', 'Achillea', 'Salvia', '']) {
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
assert.ok(careHtml.includes('care.careSources'));
assert.ok(careHtml.includes('Sources: '));

/* Customer-facing care disclaimer; internal Eric-approved-copy note removed */
assert.ok(!careHtml.includes('Care sheets are shown only for plants with Eric-approved copy'));
assert.ok(!careHtml.includes('This page has no shop or checkout.'));
assert.ok(careHtml.includes('id="care-disclaimer"'));
assert.ok(careHtml.includes('care-disclaimer'));
assert.ok(careHtml.includes("Care info is general guidance for Inland Empire gardens. Every yard is different, so adjust to your sun, soil and water. Questions? Reach out and we'll help."));

const pickup = fs.readFileSync(path.join(root, 'pickup-info.html'), 'utf8');
assert.ok(pickup.includes('<h2 id="faq-title">Ordering &amp; Pickup</h2>'));
assert.ok(pickup.includes('<h2 id="care-faq-title">Plant Care Basics</h2>'));
assert.strictEqual((pickup.match(/<details>/g) || []).length, 14, '6 ordering/pickup + 8 care entries');
assert.ok(!pickup.includes('<details open'), 'FAQ answers closed by default');
assert.ok(pickup.includes("addEventListener('beforeprint', openForPrint)") && pickup.includes("addEventListener('afterprint', restoreAfterPrint)"), 'print opens all, then restores');
assert.ok(pickup.includes('::-webkit-details-marker') && pickup.includes('summary::after'), 'custom open/close indicator');
assert.ok(pickup.includes('Each plant also has its own care sheet on its care page.'));
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
assert.ok(!order.includes('Tap a size, then Add.'), 'order-page hint box removed (Eric, Nov 10)');

const css = fs.readFileSync(path.join(root, 'shop.css'), 'utf8');
assert.ok(css.includes('.species-care-link'));
assert.ok(!css.includes('.species-care-list'));
assert.ok(!css.includes('.species-care-title'));

// Canonical example URL
const example = 'plant-care.html?species=' + encodeURIComponent('Achillea millefolium');
assert.strictEqual(example, 'plant-care.html?species=Achillea%20millefolium');

console.log('plant-care-page: all passed');
