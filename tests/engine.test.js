/* Engine correctness tests: run with `node tests/engine.test.js` */
'use strict';

const Chess = require('../js/engine.js');
const assert = require('assert');

const perft = (fen, depth) => {
  const g = new Chess.Game(fen);
  return Chess.perft(g.state, depth);
};

// ---- perft: move-generation correctness against known node counts ----
// Start position
assert.strictEqual(perft(undefined, 1), 20);
assert.strictEqual(perft(undefined, 2), 400);
assert.strictEqual(perft(undefined, 3), 8902);
console.log('start position perft 1-3 OK (20 / 400 / 8902)');

// Kiwipete: castling, ep, pins
const kiwi = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
assert.strictEqual(perft(kiwi, 1), 48);
assert.strictEqual(perft(kiwi, 2), 2039);
assert.strictEqual(perft(kiwi, 3), 97862);
console.log('kiwipete perft 1-3 OK (48 / 2039 / 97862)');

// Position 3: en passant discovered checks
const p3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
assert.strictEqual(perft(p3, 1), 14);
assert.strictEqual(perft(p3, 2), 191);
assert.strictEqual(perft(p3, 3), 2812);
assert.strictEqual(perft(p3, 4), 43238);
console.log('ep-discovered-check position perft 1-4 OK (14 / 191 / 2812 / 43238)');

// Position 4
const p4 = 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';
assert.strictEqual(perft(p4, 1), 6);
assert.strictEqual(perft(p4, 2), 264);
assert.strictEqual(perft(p4, 3), 9467);
console.log('promotion-heavy position perft 1-3 OK (6 / 264 / 9467)');

// ---- SAN + rules ----
const g = new Chess.Game();
assert.strictEqual(g.move(52, 36).san, 'e4'); // e2-e4
assert.strictEqual(g.move(12, 28).san, 'e5'); // e7-e5
assert.strictEqual(g.move(62, 45).san, 'Nf3'); // g1-f3
assert.strictEqual(g.move(1, 18).san, 'Nc6');  // b8-c6
assert.strictEqual(g.move(61, 25).san, 'Bb5'); // f1-b5
assert.strictEqual(g.move(8, 16).san, 'a6');   // a7-a6
assert.strictEqual(g.move(25, 18).san, 'Bxc6'); // b5xc6
console.log('SAN basic OK (e4 e5 Nf3 Nc6 Bb5 a6 Bxc6)');

// castling SAN + undo
const g2 = new Chess.Game('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
assert.ok(g2.moves().some((m) => m.flags === 'k'));
const castle = g2.move(60, 62);
assert.strictEqual(castle.san, 'O-O');
assert.strictEqual(g2.state.board[61], 4); // rook on f1
g2.undo();
assert.strictEqual(g2.state.board[63], 4); // rook back on h1
console.log('castling + undo OK');

// en passant SAN
const g4 = new Chess.Game('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
const ep = g4.moves().find((m) => m.flags === 'e');
assert.ok(ep, 'en passant move generated');
g4.move(ep.from, ep.to);
assert.strictEqual(g4.state.board[ep.to + 8], 0); // captured pawn removed
console.log('en passant OK');

// checkmate detection (fool's mate)
const g5 = new Chess.Game();
g5.move(53, 45); // f3
g5.move(12, 28); // e5
g5.move(54, 38); // g4
g5.move(3, 39);  // Qh4#
const res = g5.isGameOver();
assert.strictEqual(res.over, true);
assert.strictEqual(res.reason, 'checkmate');
assert.strictEqual(res.result, -1);
console.log('checkmate detection OK');

// stalemate detection
const g6 = new Chess.Game('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
const res6 = g6.isGameOver();
assert.strictEqual(res6.reason, 'stalemate');
console.log('stalemate detection OK');

// insufficient material
const g7 = new Chess.Game('8/8/4k3/8/8/2K5/8/8 w - - 0 1');
assert.strictEqual(g7.isGameOver().reason, 'insufficient material');
console.log('insufficient material OK');

// threefold repetition
const g8 = new Chess.Game();
for (let i = 0; i < 2; i++) {
  g8.move(62, 45); g8.move(6, 21);    // Nf3 Nf6
  g8.move(45, 62); g8.move(21, 6);    // Ng1 Ng8
}
assert.strictEqual(g8.isGameOver().reason, 'threefold repetition');
console.log('threefold repetition OK');

// promotion
const g9 = new Chess.Game('8/P7/8/8/8/8/8/K6k w - - 0 1');
const promos = g9.moves(8);
assert.strictEqual(promos.length, 4);
g9.move(8, 0, 5); // promote to queen
assert.strictEqual(g9.state.board[0], 5);
assert.strictEqual(g9.state.history[0].move.san, 'a8=Q+');
console.log('promotion OK');

// FEN round trip
const g10 = new Chess.Game();
g10.move(52, 36);
const fen = g10.fen();
assert.strictEqual(fen, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
console.log('FEN export OK');

// ---- AI sanity: finds mate in 1 ----
const g11 = new Chess.Game('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');
const m11 = Chess.AI.search(g11.state, 3);
assert.ok([56, 48, 40, 32, 24, 16, 8, 0].includes(m11.from), 'AI moves the rook');
g11.move(m11.from, m11.to, m11.promotion || 0);
const res11 = g11.isGameOver();
assert.strictEqual(res11.reason, 'checkmate', 'AI delivers back-rank mate');
console.log('AI finds mate-in-1 OK');

console.log('\nAll engine tests passed.');
