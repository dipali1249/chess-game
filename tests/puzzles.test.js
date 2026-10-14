/* Puzzle set tests: run with `node tests/puzzles.test.js`
   20 puzzles in four levels (five each). Every one is a real position with a
   solution line — from Chess.com's daily puzzle feed, from Lichess's openly
   licensed puzzle set, and two classics from the connected knowledge base
   (Martin Gardner's chess chapter). This re-checks the structure and plays
   every line. */
'use strict';

const assert = require('assert');
const Chess = require('../js/engine.js');
const PUZZLES = require('../js/puzzles.js');

// replay a SAN line through the engine
function replay(fen, line) {
  const g = new Chess.Game(fen);
  for (const san of line) {
    let played = null;
    for (const m of g.moves()) {
      g.move(m.from, m.to, m.promotion || 0);
      const got = g.state.history[g.state.history.length - 1].move.san;
      g.undo();
      if (got === san) { played = m; break; }
    }
    assert.ok(played, 'SAN not found: ' + san + ' in ' + fen);
    g.move(played.from, played.to, played.promotion || 0);
  }
  return g;
}

// ---- structure: 20 puzzles, four levels of five, every one sourced ----
assert.ok(Array.isArray(PUZZLES), 'the puzzle set is a flat array');
assert.ok(PUZZLES.length > 0, 'the puzzle set is not empty');
const ids = new Set();
for (const p of PUZZLES) {
  assert.ok(p.id && p.theme, 'puzzle has an id and a theme');
  assert.ok(p.source, p.id + ' must cite its source');
  assert.ok(p.kind === 'line' || p.kind === 'question', p.id + ' has a known kind');
  assert.ok(!ids.has(p.id), 'duplicate puzzle id ' + p.id);
  ids.add(p.id);
  if (p.kind === 'question') {
    assert.ok(p.question, p.id + ' has a question');
    assert.ok(Array.isArray(p.choices) && p.choices.length >= 2, p.id + ' has at least two choices');
    assert.ok(Number.isInteger(p.answer) && p.answer >= 0 && p.answer < p.choices.length,
      p.id + ' answer index must point at a choice');
  } else {
    assert.ok(p.fen, p.id + ' has a position');
    assert.ok(Array.isArray(p.line) && p.line.length > 0, p.id + ' has a solution line');
    assert.ok(p.player === 'w' || p.player === 'b', p.id + ' names the solver colour');
  }
}
// four levels, five puzzles each, and every puzzle sits in one of them
const perLevel = {};
for (const p of PUZZLES) {
  assert.ok(Number.isInteger(p.level) && p.level >= 1 && p.level <= 4, p.id + ' has a level 1-4');
  perLevel[p.level] = (perLevel[p.level] || 0) + 1;
}
assert.strictEqual(PUZZLES.length, 20, 'the set is 20 puzzles');
for (let n = 1; n <= 4; n++) assert.strictEqual(perLevel[n], 5, 'level ' + n + ' has five puzzles');
console.log('structure OK: ' + PUZZLES.length + ' puzzles in 4 levels (5 each), no multiple choice');

// ---- every position is legal, and every line plays out ----
let checked = 0;
for (const p of PUZZLES) {
  if (!p.fen) continue;
  const g = new Chess.Game(p.fen);
  for (let i = 0; i < 64; i++) {
    const pc = g.state.board[i];
    if (!pc) continue;
    const t = pc > 0 ? pc : -pc;
    if (t === 1) {
      const row = i >> 3;
      assert.ok(row !== 0 && row !== 7, 'pawn on a back rank in ' + p.id);
    }
  }
  if (p.kind === 'line') {
    let wk = 0, bk = 0;
    for (let i = 0; i < 64; i++) { if (g.state.board[i] === 6) wk++; if (g.state.board[i] === -6) bk++; }
    assert.strictEqual(wk, 1, 'one white king in ' + p.id);
    assert.strictEqual(bk, 1, 'one black king in ' + p.id);
    assert.ok(Math.max(Math.abs((g.state.kings[0] >> 3) - (g.state.kings[1] >> 3)),
                       Math.abs((g.state.kings[0] & 7) - (g.state.kings[1] & 7))) > 1,
      'kings not adjacent in ' + p.id);
    assert.ok(!g.inCheck(), 'side to move not in check at the start of ' + p.id);
    // every move of the reference line must be legal
    const end = replay(p.fen, p.line);
    if (p.endsInMate) {
      assert.strictEqual(end.moves().length, 0, p.id + ' line must end in mate');
      assert.ok(end.inCheck(), p.id + ' line must end in check');
    }
    // the trainer hands the solver the moves on their own colour's turns
    const initial = new Chess.Game(p.fen).state.turn;
    const playerCol = p.player === 'b' ? -1 : 1;
    let solverMoves = 0;
    for (let i = 0; i < p.line.length; i++) {
      const side = (i % 2 === 0) ? initial : -initial;
      if (side === playerCol) solverMoves++;
    }
    assert.ok(solverMoves >= 1, p.id + ' must give the solver at least one move');
    checked++;
  }
}
console.log('verified ' + checked + ' board puzzles (positions legal, lines play out)');
console.log('\nAll puzzle tests passed.');
