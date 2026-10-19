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

// ---- game points (Scoring) ----
const near = (a, b) => Math.abs(a - b) < 1e-9;
assert.deepStrictEqual(Chess.Scoring.LEVEL_MULTIPLIER, [5, 10, 15, 20, 30, 40]);
for (let lvl = 1; lvl <= 6; lvl++) {
  assert.strictEqual(Chess.Scoring.levelMultiplier(lvl), [5, 10, 15, 20, 30, 40][lvl - 1]);
}
assert.strictEqual(Chess.Scoring.levelMultiplier(0), 5);    // clamped low
assert.strictEqual(Chess.Scoring.levelMultiplier(9), 40);   // clamped high (level 6)
// level names (used by the topbar chip)
assert.deepStrictEqual(Chess.Scoring.LEVEL_NAMES,
  ['Beginner', 'Casual', 'Club', 'Strong', 'Expert', 'Masters']);
assert.strictEqual(Chess.Scoring.levelName(6), 'Masters');
assert.strictEqual(Chess.Scoring.levelName(0), 'Beginner');   // clamped
assert.strictEqual(Chess.Scoring.levelName(9), 'Masters');    // clamped
// win -> accumulate x stake, loss -> accumulate / stake, draw -> accumulate x 1
assert.ok(near(Chess.Scoring.finalScore(12.4, 1, 3), 186), 'win multiplies by the level stake (x15)');
assert.ok(near(Chess.Scoring.finalScore(12.4, -1, 4), 0.62), 'loss divides by the level stake (/20)');
assert.ok(near(Chess.Scoring.finalScore(12.4, 0, 5), 12.4), 'draw leaves the total as-is (x1)');
assert.ok(near(Chess.Scoring.finalScore(-9.5, 1, 1), 47.5), 'winning on a negative total pays positively');
assert.ok(near(Chess.Scoring.finalScore(-9.5, 1, 3), 142.5), 'the win sign flip scales with the level stake too');
assert.ok(near(Chess.Scoring.finalScore(-0.4, 1, 5), 12), 'a small negative win still pays positively');
assert.ok(near(Chess.Scoring.finalScore(-9.5, -1, 5), -9.5 / 30), 'a negative total is divided on a loss');
console.log('game-point scoring OK (win x, loss /, draw x1)');

// ---- fast-win bonus (Scoring) ----
// A win inside 25 moves pays a flat 200 on top of the settled score.
assert.strictEqual(Chess.Scoring.FAST_WIN_MOVES, 25);
assert.strictEqual(Chess.Scoring.FAST_WIN_BONUS, 200);
assert.strictEqual(Chess.Scoring.fastWinBonus(1, 25), 200);
assert.strictEqual(Chess.Scoring.fastWinBonus(1, 1), 200);
assert.strictEqual(Chess.Scoring.fastWinBonus(1, 26), 0);    // one move too slow
assert.strictEqual(Chess.Scoring.fastWinBonus(1, 60), 0);
assert.strictEqual(Chess.Scoring.fastWinBonus(0, 10), 0);    // a draw is not a win
assert.strictEqual(Chess.Scoring.fastWinBonus(-1, 10), 0);   // nor is a loss
assert.strictEqual(Chess.Scoring.fastWinBonus(1, 0), 0);     // no moves played
console.log('fast-win bonus OK (200 for a win inside 25 moves)');

// ---- time bonuses (Scoring) ----
// Level 1: +2 min on every ply from ply 11 on
assert.strictEqual(Chess.Scoring.timeBonus(1, 10), 0);
assert.strictEqual(Chess.Scoring.timeBonus(1, 11), 120);
assert.strictEqual(Chess.Scoring.timeBonus(1, 12), 120);
assert.strictEqual(Chess.Scoring.timeBonus(1, 30), 120);
// Level 2: +10 min every 5th ply after ply 10 (plies 15, 20, 25 ...)
assert.strictEqual(Chess.Scoring.timeBonus(2, 10), 0);
assert.strictEqual(Chess.Scoring.timeBonus(2, 14), 0);
assert.strictEqual(Chess.Scoring.timeBonus(2, 15), 600);
assert.strictEqual(Chess.Scoring.timeBonus(2, 20), 600);
assert.strictEqual(Chess.Scoring.timeBonus(2, 21), 0);
// Level 3: +30 min every 10th ply after ply 10 (plies 20, 30 ...)
assert.strictEqual(Chess.Scoring.timeBonus(3, 10), 0);
assert.strictEqual(Chess.Scoring.timeBonus(3, 19), 0);
assert.strictEqual(Chess.Scoring.timeBonus(3, 20), 1800);
assert.strictEqual(Chess.Scoring.timeBonus(3, 30), 1800);
// Level 4: +45 min every 45th ply from the start
assert.strictEqual(Chess.Scoring.timeBonus(4, 44), 0);
assert.strictEqual(Chess.Scoring.timeBonus(4, 45), 2700);
assert.strictEqual(Chess.Scoring.timeBonus(4, 90), 2700);
// Level 5: +50 min every 50th ply from the start
assert.strictEqual(Chess.Scoring.timeBonus(5, 49), 0);
assert.strictEqual(Chess.Scoring.timeBonus(5, 50), 3000);
assert.strictEqual(Chess.Scoring.timeBonus(5, 100), 3000);
// Level 6: +60 min every 60th ply from the start
assert.strictEqual(Chess.Scoring.timeBonus(6, 59), 0);
assert.strictEqual(Chess.Scoring.timeBonus(6, 60), 3600);
assert.strictEqual(Chess.Scoring.timeBonus(6, 120), 3600);
// only levels 1, 5 and 6 give the computer a bonus
assert.strictEqual(Chess.Scoring.computerGetsBonus(1), true);
assert.strictEqual(Chess.Scoring.computerGetsBonus(2), false);
assert.strictEqual(Chess.Scoring.computerGetsBonus(3), false);
assert.strictEqual(Chess.Scoring.computerGetsBonus(4), false);
assert.strictEqual(Chess.Scoring.computerGetsBonus(5), true);
assert.strictEqual(Chess.Scoring.computerGetsBonus(6), true);
console.log('time bonuses OK (per-level schedule + computer eligibility)');

// ---- level gating by total game points ----
// a level stays open while the running total is under its ceiling (5000 / 10000 / 30000 / 50000)
assert.strictEqual(Chess.Scoring.levelPlayable(1, 0), true);
assert.strictEqual(Chess.Scoring.levelPlayable(1, 4999.9), true);
assert.strictEqual(Chess.Scoring.levelPlayable(1, 5000), false);   // closed at 5000
assert.strictEqual(Chess.Scoring.levelPlayable(2, 5000), true);
assert.strictEqual(Chess.Scoring.levelPlayable(2, 10000), false);  // closed at 10000
assert.strictEqual(Chess.Scoring.levelPlayable(3, 10000), true);
assert.strictEqual(Chess.Scoring.levelPlayable(3, 30000), false);  // closed at 30000
assert.strictEqual(Chess.Scoring.levelPlayable(4, 30000), true);
assert.strictEqual(Chess.Scoring.levelPlayable(4, 50000), false);  // closed at 50000
assert.strictEqual(Chess.Scoring.levelPlayable(5, 50000), true);   // level 5 never closes
assert.strictEqual(Chess.Scoring.levelPlayable(5, 1e9), true);
// level 6 opens at 50000, once levels 1-4 have closed
assert.deepStrictEqual(Chess.Scoring.LEVEL_OPENS, [0, 0, 0, 0, 0, 0, 50000]);
assert.strictEqual(Chess.Scoring.levelPlayable(6, 0), false);
assert.strictEqual(Chess.Scoring.levelPlayable(6, 49999), false);
assert.strictEqual(Chess.Scoring.levelPlayable(6, 50000), true);
assert.strictEqual(Chess.Scoring.levelPlayable(6, 1e9), true);
// the player is pushed to the lowest level still open to them
assert.strictEqual(Chess.Scoring.lowestPlayableLevel(0), 1);
assert.strictEqual(Chess.Scoring.lowestPlayableLevel(5000), 2);
assert.strictEqual(Chess.Scoring.lowestPlayableLevel(10000), 3);
assert.strictEqual(Chess.Scoring.lowestPlayableLevel(30000), 4);
assert.strictEqual(Chess.Scoring.lowestPlayableLevel(50000), 5);
assert.strictEqual(Chess.Scoring.lowestPlayableLevel(99999), 5);
console.log('level gating OK (ceilings 5000 / 10000 / 30000 / 50000; level 6 opens at 50000)');

// ---- puzzle levels (unlocked by the match situation) ----
// level 1 is the base level; 2 = queens exchanged, 3 = two pawns down, 4 = king in check
const openAt = (fen, col) => Chess.Scoring.puzzleLevelsAvailable(new Chess.Game(fen).state, col);
const levelAt = (fen, col) => Chess.Scoring.puzzleLevel(new Chess.Game(fen).state, col);
assert.deepStrictEqual(openAt('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1), [1]);
assert.deepStrictEqual(openAt('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1', 1), [1, 2]);
assert.deepStrictEqual(openAt('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1), [1]);
assert.deepStrictEqual(openAt('rnbqkbnr/pppppppp/8/8/8/8/PP1PPP1P/RNBQKBNR w KQkq - 0 1', 1), [1, 3]);
assert.deepStrictEqual(openAt('rnbqkbnr/pppppppp/8/8/8/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1', 1), [1]);
assert.deepStrictEqual(openAt('rnbqkbnr/pp1pp1pp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', -1), [1, 3]);
assert.deepStrictEqual(openAt('3qk3/8/8/8/8/8/4r3/3QKR2 w - - 0 1', 1), [1, 4]);
assert.deepStrictEqual(openAt('4r3/8/8/8/8/8/8/4KR2 w - - 0 1', 1), [1, 2, 4]);
assert.deepStrictEqual(openAt('k3r3/6pp/8/8/8/8/8/4KR2 w - - 0 1', 1), [1, 2, 3, 4]);
assert.strictEqual(levelAt('k3r3/6pp/8/8/8/8/8/4KR2 w - - 0 1', 1), 4);   // highest open level wins
assert.strictEqual(levelAt('rnbqkbnr/pp1pp1pp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', -1), 3);
assert.strictEqual(levelAt('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1), 1);
console.log('puzzle levels OK (opening / queens exchanged / two pawns down / king in check)');

// ---- undo allowance (Scoring) ----
// Undo is capped at a share of the moves played so far: 50/40/30/20/10/5% by level.
assert.deepStrictEqual(Chess.Scoring.UNDO_PERCENT, [0.5, 0.4, 0.3, 0.2, 0.1, 0.05]);
for (let lvl = 1; lvl <= 6; lvl++) {
  assert.strictEqual(Chess.Scoring.undoPercent(lvl), [0.5, 0.4, 0.3, 0.2, 0.1, 0.05][lvl - 1]);
}
assert.strictEqual(Chess.Scoring.undoPercent(0), 0.5);    // clamped low
assert.strictEqual(Chess.Scoring.undoPercent(9), 0.05);   // clamped high (level 6)
assert.strictEqual(Chess.Scoring.undosAllowed(1, 10), 5);
assert.strictEqual(Chess.Scoring.undosAllowed(2, 10), 4);
assert.strictEqual(Chess.Scoring.undosAllowed(3, 10), 3);
assert.strictEqual(Chess.Scoring.undosAllowed(4, 10), 2);
assert.strictEqual(Chess.Scoring.undosAllowed(5, 10), 1);
assert.strictEqual(Chess.Scoring.undosAllowed(1, 1), 0);   // floors down
assert.strictEqual(Chess.Scoring.undosAllowed(1, 0), 0);
assert.strictEqual(Chess.Scoring.undosAllowed(1, -3), 0);
console.log('undo allowance OK (50/40/30/20/10/5% of the moves played)');

// ---- opening book (level 6) ----
// Every line must replay legally from the initial position, and the book must
// offer a legal move from the opening position.
const OP = Chess.Openings.list;
assert.ok(Array.isArray(OP) && OP.length >= 10, 'the opening book has entries');
const openingNames = new Set();
for (const o of OP) {
  assert.ok(o.name && o.note, 'opening has a name and a note');
  assert.ok(!openingNames.has(o.name), 'duplicate opening name ' + o.name);
  openingNames.add(o.name);
  const g = new Chess.Game();
  for (const san of o.moves) {
    let played = null;
    for (const m of g.moves()) {
      g.move(m.from, m.to, m.promotion || 0);
      const got = g.state.history[g.state.history.length - 1].move.san;
      g.undo();
      if (got === san) { played = m; break; }
    }
    assert.ok(played, 'illegal SAN ' + san + ' in ' + o.name);
    g.move(played.from, played.to, played.promotion || 0);
  }
}
// level 6 plays a book move from the opening position, and it is legal
const startState = new Chess.Game().state;
const bookMove = Chess.AI.search(startState, 6);
assert.ok(bookMove, 'level 6 plays a book move from the opening position');
assert.ok(Chess.generateMoves(startState).some((m) => m.from === bookMove.from && m.to === bookMove.to),
  'the book move is legal');
assert.ok(Chess.Openings.current(startState), 'the opening position is named');
// off the book there is no book move
const offBook = new Chess.Game('rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1');
assert.strictEqual(Chess.Openings.move(offBook.state), null);
assert.strictEqual(Chess.Openings.current(offBook.state), null);
console.log('opening book OK (' + OP.length + ' openings, every line legal)');

console.log('\nAll engine tests passed.');
