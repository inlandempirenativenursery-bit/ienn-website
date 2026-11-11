// node tests/display-name-penstemon.test.js : site display name for Penstemon grinnellii (Eric, Nov 10 6:30 PM PT)
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data', 'plant-basics.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'plant-photos.js'), 'utf8'), ctx);
assert.strictEqual(ctx.iennDisplayName("Grinnell's beardtongue"), 'Southern woodland penstemon');
assert.strictEqual(ctx.iennDisplayName("grinnell's BEARDTONGUE"), 'Southern woodland penstemon', 'case-insensitive');
assert.strictEqual(ctx.iennDisplayName('Southern woodland penstemon'), 'Southern woodland penstemon', 'already renamed in the sheet: unchanged');
// existing overrides untouched
assert.strictEqual(ctx.iennDisplayName('Sacred datura'), 'Datura');
assert.strictEqual(ctx.iennDisplayName('Sticky monkeyflower'), 'Southern bush monkeyflower');
assert.strictEqual(ctx.iennDisplayName('California brittlebush'), 'Bush sunflower');
assert.strictEqual(ctx.iennDisplayName('Showy penstemon'), 'Showy penstemon');
// photo resolves under both names
assert.strictEqual(JSON.stringify(ctx.ienPhoto('Southern woodland penstemon')), JSON.stringify(ctx.ienPhoto("Grinnell's beardtongue")));
assert.ok(JSON.stringify(ctx.ienPhoto('Southern woodland penstemon')).includes('grinnell-s-beardtongue'));
// no care added
assert.ok(!ctx.iennHasApprovedCare('Penstemon grinnellii'), 'no care sheet for Penstemon grinnellii yet');
console.log('display-name-penstemon: passed');
