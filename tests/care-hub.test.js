/* Care hub + confirmation slug links. Run: node tests/care-hub.test.js */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);

assert.strictEqual(typeof ctx.iennCareSlug, 'function');
assert.strictEqual(typeof ctx.iennApprovedCareList, 'function');
assert.strictEqual(typeof ctx.iennApprovedCareBySlug, 'function');

// Slug rule: botanical name, lowercase, spaces -> hyphens, other punctuation dropped.
assert.strictEqual(ctx.iennCareSlug('Achillea millefolium'), 'achillea-millefolium');
assert.strictEqual(ctx.iennCareSlug('Salvia apiana'), 'salvia-apiana');
assert.strictEqual(ctx.iennCareSlug('ACHILLEA MILLEFOLIUM'), 'achillea-millefolium', 'mixed case');
assert.strictEqual(ctx.iennCareSlug('  Achillea   millefolium  '), 'achillea-millefolium', 'extra spaces');
assert.strictEqual(ctx.iennCareSlug('Achillea millefolium var. lanulosa'), 'achillea-millefolium-var-lanulosa', 'var. punctuation');
assert.strictEqual(ctx.iennCareSlug('Eriogonum fasciculatum subsp. polifolium'), 'eriogonum-fasciculatum-subsp-polifolium', 'subsp. punctuation');
assert.strictEqual(ctx.iennCareSlug("Stipa pulchra 'Native'"), 'stipa-pulchra-native', 'quotes/punctuation');
assert.strictEqual(ctx.iennCareSlug(''), '');
assert.strictEqual(ctx.iennCareSlug(null), '');

const approved = ctx.iennApprovedCareList();
assert.strictEqual(approved.length, 32, 'hub should currently list 32 approved species');
const commons = approved.map((c) => c.careCommon);
const sorted = commons.slice().sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
assert.deepStrictEqual(commons, sorted, 'list is sorted by common name');
approved.forEach((c) => {
  assert.ok(c.careBullets && c.careBullets.length, c.careCommon + ' has a sheet');
  assert.ok(c.careBotanical);
  assert.ok(ctx.iennApprovedCare(c.careBotanical));
});
// Every approved species is findable by its slug; no collisions
const slugs = approved.map((c) => ctx.iennCareSlug(c.careBotanical));
assert.strictEqual(new Set(slugs).size, slugs.length, 'no slug collisions among approved species');
approved.forEach((c) => {
  const found = ctx.iennApprovedCareBySlug(ctx.iennCareSlug(c.careBotanical));
  assert.ok(found, c.careBotanical);
  assert.strictEqual(found.careBotanical, c.careBotanical);
});

// Unapproved / unknown slugs are skipped
assert.strictEqual(ctx.iennApprovedCareBySlug('salvia-clevelandii'), null, 'unapproved species skipped');
assert.strictEqual(ctx.iennApprovedCareBySlug('not-a-real-plant'), null);
assert.strictEqual(ctx.iennApprovedCareBySlug(''), null);

// Filtered view: order given, deduped, unknowns skipped
function filterP(param) {
  const seen = {}, out = [];
  String(param || '').split(',').forEach((part) => {
    const c = ctx.iennApprovedCareBySlug(part);
    if (!c) return;
    const k = String(c.careBotanical).toLowerCase();
    if (seen[k]) return;
    seen[k] = 1;
    out.push(c);
  });
  return out.length ? out : ctx.iennApprovedCareList();
}
const filtered = filterP('salvia-apiana,unknown-slug,achillea-millefolium,salvia-apiana,salvia-clevelandii');
assert.deepStrictEqual(filtered.map((c) => c.careBotanical), ['Salvia apiana', 'Achillea millefolium'], 'filter order, dedupe, skip unknown/unapproved');
assert.strictEqual(filterP('').length, 32, 'no ?p= shows full hub');
assert.strictEqual(filterP('nope,also-nope').length, 32, 'no matching slugs falls back to full hub');
assert.strictEqual(filterP('Achillea Millefolium, SALVIA-APIANA').length, 2, 'incoming slugs are normalized');

// Hub page: runtime list from approved care data; no logos on labels
const hub = fs.readFileSync(path.join(root, 'care', 'index.html'), 'utf8');
assert.ok(hub.includes('iennApprovedCareList') && hub.includes('iennApprovedCareBySlug'));
assert.ok(hub.includes('/data/plant-basics.js?v=care15-1120'));
assert.ok(hub.includes('Plant care guides'));
assert.ok(hub.includes('Choose a plant to open its care sheet.'));
assert.ok(hub.includes('/plant-care.html?species='));
assert.ok(hub.includes('ienn-logo-horizontal-560.jpg'));
assert.ok(hub.includes('fonts.css'));
assert.ok(hub.includes('@media print'));
const guideList = hub.slice(hub.indexOf('id="guides"'));
assert.ok(!guideList.includes('<img'), 'no logos on list labels');
assert.ok(!guideList.includes('logo'), 'no logos on list labels');
assert.ok(hub.includes("get(\"p\")"), 'reads ?p=');

// Confirmation ticket: one hub link, no per-plant Care guide list
const order = fs.readFileSync(path.join(root, 'order.html'), 'utf8');
const shop = fs.readFileSync(path.join(root, 'shop.js'), 'utf8');
assert.ok(order.includes('id="confirm-care-hub-link"'));
assert.ok(order.includes('Care guides for your plants'));
assert.ok(order.includes('href="/care/"'));
assert.ok(shop.includes('function confirmCareSlugs'));
assert.ok(shop.includes('"/care/?p="'));
assert.ok(shop.includes('setConfirmCareLink'));
assert.ok(!/confirm-list[\s\S]{0,400}Care guide/.test(shop));
assert.ok(!shop.includes('>Care guide<'));

// Slug list for a mixed order (approved + unapproved still get a botanical slug; hub skips unapproved)
const items = [
  { name: 'Yarrow', botanical: 'Achillea millefolium' },
  { name: 'White sage', botanical: 'Salvia apiana' },
  { name: 'Yarrow again', botanical: 'Achillea millefolium' },
  { name: 'Cleveland sage', botanical: 'Salvia clevelandii' },
  { name: 'Mystery', botanical: '' }
];
const seen = {}, out = [];
items.forEach((x) => {
  const care = x.botanical ? ctx.iennApprovedCare(x.botanical) : null;
  const key = care && care.careBotanical ? care.careBotanical : x.botanical;
  const s = ctx.iennCareSlug(key);
  if (!s || seen[s]) return;
  seen[s] = 1;
  out.push(s);
});
assert.deepStrictEqual(out, ['achillea-millefolium', 'salvia-apiana', 'salvia-clevelandii']);
assert.strictEqual('/care/?p=' + out.join(','), '/care/?p=achillea-millefolium,salvia-apiana,salvia-clevelandii');

console.log('care-hub: all passed (' + approved.length + ' approved species)');
