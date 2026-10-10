/* Puzzle set tests: run with `node tests/puzzles.test.js`
   Re-verifies every shipped puzzle against the engine. */
'use strict';

const assert = require('assert');
const Chess = require('../js/engine.js');
const LEVELS = require('../js/puzzles.js');

const VAL = { 1: 100, 2: 320, 3: 330, 4: 500, 5: 900 };
const KNIGHT_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const knightAttacks = (sq) => {
  const r = sq >> 3, c = sq & 7, out = [];
  for (const [dr, dc] of KNIGHT_D) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) out.push(rr * 8 + cc);
  }
  return out;
};
const material = (g) => {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = g.state.board[i];
    if (!p) continue;
    const t = p > 0 ? p : -p;
    if (t === 6) continue;
    s += p > 0 ? VAL[t] : -VAL[t];
  }
  return s;
};
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

// ---- structure ----
assert.strictEqual(LEVELS.length, 5, 'there must be 5 levels');
LEVELS.forEach((l, i) => {
  assert.strictEqual(l.level, i + 1, 'levels are ordered 1..5');
  assert.ok(l.name && l.blurb, 'level ' + l.level + ' has a name and blurb');
  assert.ok(l.puzzles.length >= 3, 'level ' + l.level + ' has at least 3 puzzles');
  const ids = new Set();
  l.puzzles.forEach((p) => {
    assert.ok(p.id && p.theme && p.fen && p.goal, 'puzzle fields present in level ' + l.level);
    assert.ok(!ids.has(p.id), 'duplicate puzzle id ' + p.id);
    ids.add(p.id);
  });
});
console.log('structure OK: 5 levels, ' + LEVELS.reduce((s, l) => s + l.puzzles.length, 0) + ' puzzles');

// ---- per-puzzle verification ----
let checked = 0;
for (const level of LEVELS) {
  for (const p of level.puzzles) {
    const g = new Chess.Game(p.fen);

    // legal position: exactly one king each, kings apart, pawns off the back ranks
    let wk = 0, bk = 0;
    for (let i = 0; i < 64; i++) {
      const pc = g.state.board[i];
      if (pc === 6) wk++;
      if (pc === -6) bk++;
      const t = pc > 0 ? pc : -pc;
      if (t === 1) {
        const row = i >> 3;
        assert.ok(row !== 0 && row !== 7, 'pawn on back rank in ' + p.id);
      }
    }
    assert.strictEqual(wk, 1, 'one white king in ' + p.id);
    assert.strictEqual(bk, 1, 'one black king in ' + p.id);
    assert.ok(Math.max(Math.abs((g.state.kings[0] >> 3) - (g.state.kings[1] >> 3)),
                       Math.abs((g.state.kings[0] & 7) - (g.state.kings[1] & 7))) > 1,
      'kings not adjacent in ' + p.id);
    assert.ok(!g.inCheck(), 'side to move not in check in ' + p.id);
    g.state.turn = -1;
    const bchk = g.inCheck();
    g.state.turn = 1;
    assert.ok(!bchk, 'black not in check at the start of ' + p.id);

    if (p.goal === 'mate1' || p.goal === 'mate2' || p.goal === 'mate3') {
      const n = +p.goal.slice(4);
      const found = Chess.AI.mateIn(g.state, n + 1);
      assert.strictEqual(found, n, p.id + ' should be mate in exactly ' + n + ' (engine says ' + found + ')');
      // the reference line must end in checkmate
      const end = replay(p.fen, p.line);
      assert.strictEqual(end.moves().length, 0, p.id + ' reference line must end with no legal replies');
      assert.ok(end.inCheck(), p.id + ' reference line must end in check');
    } else if (p.goal === 'winrook') {
      // find the black rook and a knight move that forks it with check
      let rookSq = -1;
      for (let i = 0; i < 64; i++) if (g.state.board[i] === -4) rookSq = i;
      assert.ok(rookSq >= 0, p.id + ' has a black rook');
      const before = material(g);
      let winning = false;
      for (const m of g.moves()) {
        if (Math.abs(m.piece) !== 2) continue;
        if (!knightAttacks(m.to).includes(rookSq)) continue;
        g.move(m.from, m.to, 0);
        const forks = g.inCheck();
        let gain = -Infinity;
        if (forks) {
          // black's most stubborn reply, then measure the capture
          let bestReply = null, bestEval = -Infinity;
          const replies = g.moves();
          for (const r of replies) {
            g.move(r.from, r.to, r.promotion || 0);
            const e = -Chess.AI.evaluate(g.state);
            g.undo();
            if (e > bestEval) { bestEval = e; bestReply = r; }
          }
          if (bestReply) {
            g.move(bestReply.from, bestReply.to, bestReply.promotion || 0);
            const takes = g.moves().filter((x) => x.to === rookSq);
            if (takes.length) {
              g.move(takes[0].from, takes[0].to, 0);
              gain = material(g) - before;
              g.undo();
            }
            g.undo();
          }
        }
        g.undo();
        if (forks && gain >= 300) { winning = true; break; }
      }
      assert.ok(winning, p.id + ' must offer a knight fork that wins the rook');
      // reference line ends with the rook gone
      const end = replay(p.fen, p.line);
      let endRook = -1;
      for (let i = 0; i < 64; i++) if (end.state.board[i] === -4) endRook = i;
      assert.strictEqual(endRook, -1, p.id + ' reference line should win the rook');
    } else {
      throw new Error('unknown goal ' + p.goal);
    }
    checked++;
  }
}
console.log('verified all ' + checked + ' puzzles');

// ---- trainer acceptance: the reference solution must satisfy the UI's rules ----
for (const level of LEVELS) {
  for (const p of level.puzzles) {
    const g = new Chess.Game(p.fen);
    let plies = p.goal === 'mate1' ? 1 : p.goal === 'mate2' ? 3 : p.goal === 'mate3' ? 5 : 0;
    let stage = p.goal === 'winrook' ? 'fork' : 'mate';
    for (let i = 0; i < p.line.length; i++) {
      const isPlayer = i % 2 === 0;
      let mv = null;
      for (const m of g.moves()) {
        g.move(m.from, m.to, m.promotion || 0);
        const san = g.state.history[g.state.history.length - 1].move.san;
        g.undo();
        if (san === p.line[i]) { mv = m; break; }
      }
      assert.ok(mv, 'line move ' + p.line[i] + ' legal in ' + p.id);
      let rookBefore = -1;
      if (p.goal === 'winrook' && isPlayer) {
        for (let k = 0; k < 64; k++) if (g.state.board[k] === -4) rookBefore = k;
      }
      g.move(mv.from, mv.to, mv.promotion || 0);
      if (!isPlayer) continue;                       // opponent moves are auto-played
      if (p.goal === 'winrook') {
        if (stage === 'fork') {
          assert.ok(Math.abs(mv.piece) === 2 && g.inCheck() && knightAttacks(mv.to).includes(rookBefore),
            p.id + ' fork move must satisfy the trainer predicate');
          stage = 'capture';
        } else {
          assert.strictEqual(mv.to, rookBefore, p.id + ' final move must capture the rook');
        }
      } else if (g.moves().length === 0) {
        assert.ok(g.inCheck(), p.id + ' line must finish with mate');
      } else {
        assert.ok(Chess.AI.mateWithin(g.state, plies - 1), p.id + ' must keep the forced mate alive');
        plies -= 2;
      }
    }
  }
}
console.log('trainer acceptance OK: reference solutions satisfy the UI rules');
console.log('\nAll puzzle tests passed.');
