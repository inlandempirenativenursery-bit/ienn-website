// node tests/feed-order.test.js
const assert = require('assert'), O = require('../feed-order.js');
const n = l => l.map(p => p.name).join(',');
// no fields: exact feed order (even if "sold out"/ask statuses differ)
assert.strictEqual(n(O.order([{ name: 'C', status: 'out' }, { name: 'A' }, { name: 'B', status: 'ask' }])), 'C,A,B', 'no fields => feed order');
// pinned without any rank: feed order kept (contract: sort only when rank present)
assert.strictEqual(n(O.order([{ name: 'A' }, { name: 'B', pinned: true }])), 'A,B', 'pinned alone, no rank => feed order');
// pinned first (relative order kept), then rank ascending, then unranked in feed order
const feed = [{ name: 'U1' }, { name: 'R3', rank: 3 }, { name: 'P2', pinned: true, rank: 9 }, { name: 'R1', rank: 1, popularity: 50 }, { name: 'U2' }, { name: 'P1', pinned: true }, { name: 'R2', rank: '2' }];
assert.strictEqual(n(O.order(feed)), 'P2,P1,R1,R2,R3,U1,U2', 'pinned, rank, missing rank');
// stable for equal ranks; input not mutated
const eq = [{ name: 'X', rank: 1 }, { name: 'Y', rank: 1 }, { name: 'Z' }]; assert.strictEqual(n(O.order(eq)), 'X,Y,Z'); assert.strictEqual(n(eq), 'X,Y,Z');
assert.deepStrictEqual(O.order(undefined), []);
console.log('feed-order: all passed');
