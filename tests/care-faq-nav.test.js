/* Narrow nav on care + FAQ: one Back to plants → relative order.html (no hash, no Home). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function actionsBlock(html) {
  const m = html.match(/<div class="actions no-print"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(m, 'actions block missing');
  return m[1];
}
function hrefs(block) {
  return [...block.matchAll(/<a\s+href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => ({ href: m[1], text: m[2].trim() }));
}

const care = fs.readFileSync(path.join(root, 'plant-care.html'), 'utf8');
const pickup = fs.readFileSync(path.join(root, 'pickup-info.html'), 'utf8');

const careActs = actionsBlock(care);
const pickupActs = actionsBlock(pickup);
const careLinks = hrefs(careActs);
const pickupLinks = hrefs(pickupActs);

const careBack = careLinks.filter((l) => l.text === 'Back to plants');
const pickupBack = pickupLinks.filter((l) => l.text === 'Back to plants');
assert.strictEqual(careBack.length, 1, 'care: exactly one Back to plants');
assert.strictEqual(pickupBack.length, 1, 'faq: exactly one Back to plants');
assert.strictEqual(careBack[0].href, 'order.html');
assert.strictEqual(pickupBack[0].href, 'order.html');
assert.ok(!careBack[0].href.includes('#'), 'care back must not use hash');
assert.ok(!pickupBack[0].href.includes('#'), 'faq back must not use hash');
assert.strictEqual(careBack[0].href, pickupBack[0].href, 'same destination');

assert.ok(!careActs.includes('Home'));
assert.ok(!pickupActs.includes('Home'));
assert.ok(!careActs.includes('index.html'));
assert.ok(!pickupActs.includes('index.html'));
assert.ok(!care.includes('Back to shop'));
assert.ok(!pickup.includes('Back to order'));
assert.ok(!pickup.includes('order.html#pickup-info'));

/* Retain Print + Pickup FAQ on care; Print on FAQ */
assert.ok(careActs.includes('id="print-btn"') || careActs.includes('Print care sheet'));
assert.ok(careLinks.some((l) => l.text === 'Pickup FAQ' && l.href === 'pickup-info.html'));
assert.ok(pickupActs.includes('Print this page'));
assert.ok(!pickupLinks.some((l) => /pickup-info/.test(l.href)), 'faq page should not self-link Pickup FAQ in actions');

console.log('care-faq-nav: all passed');
