/* High-score logic tests: run with `node tests/highscore.test.js` */
'use strict';

const HighScore = require('../js/highscore.js');
const assert = require('assert');

// ---- record validity ----
const empty = HighScore.emptyRecord();
assert.strictEqual(empty.score, null);
assert.strictEqual(empty.name, null);
assert.strictEqual(HighScore.isValidRecord(empty), false);
assert.strictEqual(HighScore.isValidRecord(null), false);
assert.strictEqual(HighScore.isValidRecord({ name: 'x', score: 5 }), true);
assert.strictEqual(HighScore.isValidRecord({ name: 'x', score: '5' }), false);
assert.strictEqual(HighScore.isValidRecord({ name: 'x', score: NaN }), false);
assert.strictEqual(HighScore.isValidRecord({ name: 'x', score: Infinity }), false);
console.log('record validity OK');

// ---- name cleaning ----
assert.strictEqual(HighScore.cleanName('  Tapas   Maity '), 'Tapas Maity');
assert.strictEqual(HighScore.cleanName(''), 'Anonymous');
assert.strictEqual(HighScore.cleanName('   '), 'Anonymous');
assert.strictEqual(HighScore.cleanName(null), 'Anonymous');
assert.strictEqual(HighScore.cleanName(42), 'Anonymous');
assert.strictEqual(HighScore.cleanName('x'.repeat(100)).length, HighScore.MAX_NAME);
console.log('name cleaning OK');

// ---- beats(): anything beats an empty record; only a strictly greater score beats a held one ----
assert.strictEqual(HighScore.beats(empty, 10), true);
assert.strictEqual(HighScore.beats({ name: 'A', score: 10 }, 10), false);   // a tie does not
assert.strictEqual(HighScore.beats({ name: 'A', score: 10 }, 10.5), true);
assert.strictEqual(HighScore.beats({ name: 'A', score: 10 }, -3), false);
assert.strictEqual(HighScore.beats({ name: 'A', score: 10 }, NaN), false);
assert.strictEqual(HighScore.beats({ name: 'A', score: 10 }, 'x'), false);
assert.strictEqual(HighScore.beats(empty, -2.5), true);                    // a negative first score still counts
console.log('beats() OK');

// ---- apply(): a new record replaces (resets) the previous name and score ----
const r1 = HighScore.apply(empty, 'Tapas', 120.5, '2026-01-01T00:00:00.000Z');
assert.deepStrictEqual(r1, { name: 'Tapas', score: 120.5, updated: '2026-01-01T00:00:00.000Z' });
const r2 = HighScore.apply(r1, 'Rival', 300, '2026-02-01T00:00:00.000Z');
assert.deepStrictEqual(r2, { name: 'Rival', score: 300, updated: '2026-02-01T00:00:00.000Z' });
assert.strictEqual(HighScore.apply(r2, 'Someone', 250), null);   // lower score rejected
assert.strictEqual(HighScore.apply(r2, 'Someone', 300), null);   // tie rejected too
const r3 = HighScore.apply(empty, '   ', 5, 'now');
assert.strictEqual(r3.name, 'Anonymous');                        // blank name still usable
console.log('apply() replaces the record on a new best OK');

console.log('\nAll high-score tests passed.');
