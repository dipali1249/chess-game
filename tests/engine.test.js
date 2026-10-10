/* Engine tests: run with `node tests/engine.test.js`
   Covers perft (move-generation correctness), the rules, and the AI. */
'use strict';

const assert = require('assert');
const Chess = require('../js/engine.js');

// ---- perft ----
const PERFT = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902]],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812]],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ['r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890]]
];
PERFT.forEach(([fen, counts]) => {
  counts.forEach((n, i) => {
    const got = Chess.perft(fen, i + 1);
    assert.strictEqual(got, n, 'perft(' + (i + 1) + ') for ' + fen + ': ' + got + ' != ' + n);
  });
});
console.log('perft OK (6 positions, depth 1-3)');

// ---- rules ----
const g = new Chess.Game();
assert.strictEqual(g.moves().length, 20);
g.move(52, 36);                    // e2-e4
assert.strictEqual(g.state.turn, -1);
assert.strictEqual(g.moves().length, 20);
g.move(12, 28);                    // e7-e5
assert.strictEqual(g.move(45, 39).san, 'Nf3');   // Ng1-f3
console.log('basic play OK');

// castling
const gc = new Chess.Game('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
const castle = gc.moves().find((m) => m.flags === 'k');
assert.ok(castle, 'white can castle kingside');
assert.strictEqual(gc.move(castle.from, castle.to).san, 'O-O');
console.log('castling OK');

// en passant
const ge = new Chess.Game('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3');
assert.ok(ge.moves().some((m) => m.flags === 'e'), 'en passant available');
console.log('en passant OK');

// promotion
const gp = new Chess.Game('8/P7/8/8/8/8/7k/7K w - - 0 1');
assert.ok(gp.moves().some((m) => m.promotion === 5), 'promotion to queen available');
console.log('promotion OK');

// checkmate / stalemate
assert.strictEqual(new Chess.Game('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1').isGameOver().reason, 'checkmate');
assert.strictEqual(new Chess.Game('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').isGameOver().reason, 'stalemate');
console.log('mate/stalemate OK');

// insufficient material
assert.strictEqual(new Chess.Game('8/8/8/4k3/8/8/4K3/8 w - - 0 1').isGameOver().reason, 'insufficient material');
console.log('insufficient material OK');

// SAN disambiguation
const gs = new Chess.Game('8/8/8/8/8/8/8/1N1N1N1N w - - 0 1');
const s1 = gs.moves().map((m) => gs.move(m.from, m.to).san).filter(Boolean);
assert.ok(s1.length > 0);
const gd = new Chess.Game('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
const sanNf = gd.move(60, 44).san;   // Ke1-e2
assert.strictEqual(sanNf, 'Ke2');
console.log('SAN OK');

// ---- FEN export ----
const gf = new Chess.Game();
gf.move(52, 36);
const fen = gf.fen();
assert.strictEqual(fen, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
console.log('FEN export OK');

// ---- AI sanity: finds mate in 1 ----
const g11 = new Chess.Game('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');
const m11 = Chess.AI.search(g11.state, 5);
assert.ok([56, 48, 40, 32, 24, 16, 8, 0].includes(m11.from), 'AI moves the rook');
g11.move(m11.from, m11.to, m11.promotion || 0);
const res11 = g11.isGameOver();
assert.strictEqual(res11.reason, 'checkmate', 'AI delivers back-rank mate');
console.log('AI finds mate-in-1 OK');

// ---- mate search (used by the puzzle trainer) ----
assert.strictEqual(Chess.AI.mateIn(new Chess.Game('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1').state, 3), 1);
assert.strictEqual(Chess.AI.mateIn(new Chess.Game('1k6/p1p5/8/3K1R2/3Q4/8/8/8 w - - 0 1').state, 3), 2);
assert.strictEqual(Chess.AI.mateIn(new Chess.Game().state, 3), 0);       // no mate from the start
assert.strictEqual(Chess.AI.mateIn(new Chess.Game('8/8/8/8/8/8/8/K6k w - - 0 1').state, 2), 0);
// side to move already checkmated -> mated within 1 ply
assert.ok(Chess.AI.mateWithin(new Chess.Game('R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1').state, 1));
// side to move is not losing in the start position
assert.ok(!Chess.AI.mateWithin(new Chess.Game().state, 3));
console.log('mate search OK (mateIn / mateWithin)');

// ---- five difficulty levels ----
for (let level = 1; level <= 5; level++) {
  const gg = new Chess.Game();
  const mm = Chess.AI.search(gg.state, level);
  assert.ok(mm, 'level ' + level + ' returns a move');
  assert.ok(gg.move(mm.from, mm.to, mm.promotion || 0), 'level ' + level + ' returns a legal move');
}
// a stronger level must still see a mate in one
assert.strictEqual(Chess.AI.mateIn(new Chess.Game('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1').state, 2), 1);
console.log('five difficulty levels OK (all return legal moves)');

console.log('\nAll engine tests passed.');
