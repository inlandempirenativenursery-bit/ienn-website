/* Preview host guard: live hosts allow orders; all others block POST path. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const settings = fs.readFileSync(path.join(__dirname, '..', 'shop-settings.js'), 'utf8');
const ctx = { location: { hostname: 'example.com' } };
vm.createContext(ctx);
vm.runInContext(settings, ctx);
assert.strictEqual(typeof ctx.iennIsLiveShopHost, 'function');
assert.strictEqual(typeof ctx.iennIsPreviewHost, 'function');

const live = [
  'www.inlandempirenativenursery.com',
  'inlandempirenativenursery.com',
  'inlandempirenativenursery-bit.github.io',
  'WWW.InlandEmpireNativeNursery.com'
];
live.forEach((h) => {
  assert.strictEqual(ctx.iennIsLiveShopHost(h), true, h);
  assert.strictEqual(ctx.iennIsPreviewHost(h), false, h);
});

const preview = ['localhost', '127.0.0.1', 'deploy-preview-62--x.netlify.app', 'something.vercel.app', '', 'ienn-preview.netlify.app'];
preview.forEach((h) => {
  assert.strictEqual(ctx.iennIsLiveShopHost(h), false, h);
  assert.strictEqual(ctx.iennIsPreviewHost(h), true, h);
});

const shop = fs.readFileSync(path.join(__dirname, '..', 'shop.js'), 'utf8');
assert.ok(shop.includes('if (blockPreviewOrderSubmit(form, btn, serr)) return;'));
assert.ok(shop.includes('fetch(APPS_SCRIPT_URL, { method: "POST"'));
// POST fetch must appear AFTER the preview return in the submit handler
const submit = shop.slice(shop.indexOf('form.addEventListener("submit"'));
const guardAt = submit.indexOf('blockPreviewOrderSubmit(form, btn, serr)) return');
const postAt = submit.indexOf('fetch(APPS_SCRIPT_URL, { method: "POST"');
assert.ok(guardAt >= 0 && postAt > guardAt, 'preview return must precede order POST');
assert.ok(shop.includes('Preview only — orders are disabled here'));
console.log('preview-host-guard: all passed');
