/* ============================================================
   Learners Chess — engine
   Complete rules: castling, en passant, promotion, checks,
   checkmate, stalemate, 50-move rule, threefold repetition,
   insufficient material. AI: negamax + alpha-beta + quiescence
   with piece-square-table evaluation. Mate search for puzzles.

   Board: Int8Array(64). Index 0 = a8 (top-left), 63 = h1.
   Pieces: positive = white, negative = black.
   1=pawn 2=knight 3=bishop 4=rook 5=queen 6=king
   ============================================================ */
(function (global) {
  'use strict';

  var WHITE = 1, BLACK = -1;
  var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  var MATE = 100000;

  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var VALS = [0, 100, 320, 330, 500, 900, 20000];
  var PHASE = [0, 0, 1, 1, 2, 4, 0]; // for endgame detection

  var KNIGHT_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KING_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var BISHOP_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var ROOK_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // Piece-square tables from white's point of view (index 0 = a8)
  var PST_P = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0
  ];
  var PST_N = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
  ];
  var PST_B = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
  ];
  var PST_R = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0
  ];
  var PST_Q = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20
  ];
  var KING_MID = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20
  ];
  var KING_END = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50
  ];
  var PST = [null, PST_P, PST_N, PST_B, PST_R, PST_Q, null];

  // ---------- FEN ----------
  function parseFen(fen) {
    var parts = fen.trim().split(/\s+/);
    var board = new Int8Array(64);
    var kings = [-1, -1];
    var sq = 0;
    var map = { p: P, n: N, b: B, r: R, q: Q, k: K };
    for (var i = 0; i < parts[0].length; i++) {
      var ch = parts[0][i];
      if (ch === '/') continue;
      if (ch >= '1' && ch <= '8') { sq += ch.charCodeAt(0) - 48; continue; }
      var lower = ch.toLowerCase();
      var type = map[lower];
      if (!type) throw new Error('Bad FEN: ' + fen);
      var color = ch === lower ? BLACK : WHITE;
      board[sq] = color * type;
      if (type === K) kings[color === WHITE ? 0 : 1] = sq;
      sq++;
    }
    var turn = parts[1] === 'b' ? BLACK : WHITE;
    var castStr = parts[2] || '-';
    var ep = -1;
    if (parts[3] && parts[3] !== '-') {
      ep = (8 - +parts[3][1]) * 8 + (parts[3].charCodeAt(0) - 97);
    }
    return {
      board: board,
      turn: turn,
      castling: {
        K: castStr.indexOf('K') >= 0, Q: castStr.indexOf('Q') >= 0,
        k: castStr.indexOf('k') >= 0, q: castStr.indexOf('q') >= 0
      },
      ep: ep,
      halfmove: +(parts[4] || 0),
      fullmove: +(parts[5] || 1),
      history: [],
      kings: kings
    };
  }

  function stateToFen(state) {
    var s = '';
    for (var row = 0; row < 8; row++) {
      var empty = 0;
      for (var col = 0; col < 8; col++) {
        var p = state.board[row * 8 + col];
        if (!p) { empty++; continue; }
        if (empty) { s += empty; empty = 0; }
        var letters = '.pnbrqk';
        s += p > 0 ? letters[p].toUpperCase() : letters[-p];
      }
      if (empty) s += empty;
      if (row < 7) s += '/';
    }
    var c = (state.castling.K ? 'K' : '') + (state.castling.Q ? 'Q' : '') +
            (state.castling.k ? 'k' : '') + (state.castling.q ? 'q' : '');
    if (!c) c = '-';
    var ep = '-';
    if (state.ep >= 0) ep = 'abcdefgh'[state.ep & 7] + (8 - (state.ep >> 3));
    return s + ' ' + (state.turn === WHITE ? 'w' : 'b') + ' ' + c + ' ' + ep +
      ' ' + state.halfmove + ' ' + state.fullmove;
  }

  // ---------- attacks ----------
  function isAttacked(state, sq, by) {
    var b = state.board;
    var r = sq >> 3, c = sq & 7, i, rr, cc, p;
    for (i = 0; i < 8; i++) {
      rr = r + KNIGHT_D[i][0]; cc = c + KNIGHT_D[i][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === by * N) return true;
    }
    for (i = 0; i < 8; i++) {
      rr = r + KING_D[i][0]; cc = c + KING_D[i][1];
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === by * K) return true;
    }
    if (by === WHITE) {
      if (r + 1 < 8) {
        if (c >= 1 && b[(r + 1) * 8 + c - 1] === P) return true;
        if (c <= 6 && b[(r + 1) * 8 + c + 1] === P) return true;
      }
    } else {
      if (r - 1 >= 0) {
        if (c >= 1 && b[(r - 1) * 8 + c - 1] === -P) return true;
        if (c <= 6 && b[(r - 1) * 8 + c + 1] === -P) return true;
      }
    }
    for (i = 0; i < 4; i++) {
      rr = r + BISHOP_D[i][0]; cc = c + BISHOP_D[i][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[rr * 8 + cc];
        if (p) {
          if (p === by * B || p === by * Q) return true;
          break;
        }
        rr += BISHOP_D[i][0]; cc += BISHOP_D[i][1];
      }
    }
    for (i = 0; i < 4; i++) {
      rr = r + ROOK_D[i][0]; cc = c + ROOK_D[i][1];
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        p = b[rr * 8 + cc];
        if (p) {
          if (p === by * R || p === by * Q) return true;
          break;
        }
        rr += ROOK_D[i][0]; cc += ROOK_D[i][1];
      }
    }
    return false;
  }

  function inCheck(state, color) {
    var kSq = state.kings[color === WHITE ? 0 : 1];
    return isAttacked(state, kSq, -color);
  }

  // ---------- move generation ----------
  function genPieceMoves(state, from, moves) {
    var b = state.board;
    var piece = b[from];
    var color = piece > 0 ? WHITE : BLACK;
    var type = piece > 0 ? piece : -piece;
    var r = from >> 3, c = from & 7;
    var i, rr, cc, to, target, dr, dc, one, two, promoRow, startRow, dir, D, j;

    function add(to, flags, promo) {
      moves.push({ from: from, to: to, piece: piece, captured: b[to], promotion: promo || 0, flags: flags });
    }

    if (type === P) {
      dir = color === WHITE ? -1 : 1;
      startRow = color === WHITE ? 6 : 1;
      promoRow = color === WHITE ? 0 : 7;
      one = from + dir * 8;
      if (one >= 0 && one < 64 && !b[one]) {
        if ((one >> 3) === promoRow) {
          add(one, 'p', Q); add(one, 'p', R); add(one, 'p', B); add(one, 'p', N);
        } else {
          add(one, 'n');
          two = from + dir * 16;
          if (r === startRow && !b[two]) add(two, 'b');
        }
      }
      for (i = -1; i <= 1; i += 2) {
        cc = c + i;
        if (cc < 0 || cc > 7) continue;
        to = (r + dir) * 8 + cc;
        if (to < 0 || to > 63) continue;
        target = b[to];
        if (target && (target > 0) !== (color > 0)) {
          if ((to >> 3) === promoRow) {
            add(to, 'p', Q); add(to, 'p', R); add(to, 'p', B); add(to, 'p', N);
          } else add(to, 'c');
        } else if (to === state.ep) {
          moves.push({ from: from, to: to, piece: piece, captured: -color * P, promotion: 0, flags: 'e' });
        }
      }
    } else if (type === N || type === K) {
      D = type === N ? KNIGHT_D : KING_D;
      for (i = 0; i < 8; i++) {
        rr = r + D[i][0]; cc = c + D[i][1];
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        to = rr * 8 + cc;
        target = b[to];
        if (!target) add(to, 'n');
        else if ((target > 0) !== (color > 0)) add(to, 'c');
      }
      if (type === K) {
        if (color === WHITE && from === 60) {
          if (state.castling.K && !b[61] && !b[62] && b[63] === R &&
              !isAttacked(state, 60, BLACK) && !isAttacked(state, 61, BLACK) && !isAttacked(state, 62, BLACK))
            add(62, 'k');
          if (state.castling.Q && !b[59] && !b[58] && !b[57] && b[56] === R &&
              !isAttacked(state, 60, BLACK) && !isAttacked(state, 59, BLACK) && !isAttacked(state, 58, BLACK))
            add(58, 'q');
        } else if (color === BLACK && from === 4) {
          if (state.castling.k && !b[5] && !b[6] && b[7] === -R &&
              !isAttacked(state, 4, WHITE) && !isAttacked(state, 5, WHITE) && !isAttacked(state, 6, WHITE))
            add(6, 'k');
          if (state.castling.q && !b[3] && !b[2] && !b[1] && b[0] === -R &&
              !isAttacked(state, 4, WHITE) && !isAttacked(state, 3, WHITE) && !isAttacked(state, 2, WHITE))
            add(2, 'q');
        }
      }
    } else {
      D = type === B ? BISHOP_D : type === R ? ROOK_D : null;
      var dirs = type === Q ? [BISHOP_D, ROOK_D] : [D];
      for (j = 0; j < dirs.length; j++) {
        var DD = dirs[j];
        for (i = 0; i < 4; i++) {
          dr = DD[i][0]; dc = DD[i][1];
          rr = r + dr; cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            to = rr * 8 + cc;
            target = b[to];
            if (!target) add(to, 'n');
            else {
              if ((target > 0) !== (color > 0)) add(to, 'c');
              break;
            }
            rr += dr; cc += dc;
          }
        }
      }
    }
  }

  function generateMoves(state) {
    var moves = [];
    var b = state.board;
    var turn = state.turn;
    for (var sq = 0; sq < 64; sq++) {
      var piece = b[sq];
      if (piece && (piece > 0) === (turn > 0)) genPieceMoves(state, sq, moves);
    }
    // legality filter (lightweight make/unmake + king attack test)
    var legal = [];
    var kIdx = turn === WHITE ? 0 : 1;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var captured = b[m.to];
      var capSq = m.flags === 'e' ? m.to + (turn === WHITE ? 8 : -8) : -1;
      var capPiece = capSq >= 0 ? b[capSq] : 0;
      b[m.to] = m.promotion ? turn * m.promotion : m.piece;
      b[m.from] = 0;
      if (capSq >= 0) b[capSq] = 0;
      var kSq = (m.piece === K || m.piece === -K) ? m.to : state.kings[kIdx];
      if (!isAttacked(state, kSq, -turn)) legal.push(m);
      b[m.from] = m.piece;
      b[m.to] = captured;
      if (capSq >= 0) b[capSq] = capPiece;
    }
    return legal;
  }

  // ---------- make / undo ----------
  function makeMove(state, m) {
    var b = state.board;
    var color = m.piece > 0 ? WHITE : BLACK;
    state.history.push({
      move: m,
      prevCastling: { K: state.castling.K, Q: state.castling.Q, k: state.castling.k, q: state.castling.q },
      prevEp: state.ep,
      prevHalfmove: state.halfmove,
      prevFullmove: state.fullmove
    });
    b[m.to] = m.promotion ? color * m.promotion : m.piece;
    b[m.from] = 0;
    if (m.flags === 'e') b[m.to + (color === WHITE ? 8 : -8)] = 0;
    if (m.flags === 'k') {
      if (color === WHITE) { b[63] = 0; b[61] = R; } else { b[7] = 0; b[5] = -R; }
    } else if (m.flags === 'q') {
      if (color === WHITE) { b[56] = 0; b[59] = R; } else { b[0] = 0; b[3] = -R; }
    }
    if (m.piece === K) { state.castling.K = false; state.castling.Q = false; }
    else if (m.piece === -K) { state.castling.k = false; state.castling.q = false; }
    if (m.from === 63 || m.to === 63) state.castling.K = false;
    if (m.from === 56 || m.to === 56) state.castling.Q = false;
    if (m.from === 7 || m.to === 7) state.castling.k = false;
    if (m.from === 0 || m.to === 0) state.castling.q = false;
    state.ep = m.flags === 'b' ? (m.from + m.to) / 2 : -1;
    state.halfmove = ((m.piece === P || m.piece === -P) || m.captured) ? 0 : state.halfmove + 1;
    if (color === BLACK) state.fullmove++;
    if (m.piece === K) state.kings[0] = m.to;
    else if (m.piece === -K) state.kings[1] = m.to;
    state.turn = -state.turn;
  }

  function undoMove(state) {
    var h = state.history.pop();
    if (!h) return null;
    var m = h.move;
    var b = state.board;
    var color = m.piece > 0 ? WHITE : BLACK;
    b[m.from] = m.piece;
    b[m.to] = 0;
    if (m.flags === 'e') b[m.to + (color === WHITE ? 8 : -8)] = m.captured;
    else if (m.captured) b[m.to] = m.captured;
    if (m.flags === 'k') {
      if (color === WHITE) { b[61] = 0; b[63] = R; } else { b[5] = 0; b[7] = -R; }
    } else if (m.flags === 'q') {
      if (color === WHITE) { b[59] = 0; b[56] = R; } else { b[3] = 0; b[0] = -R; }
    }
    state.castling = h.prevCastling;
    state.ep = h.prevEp;
    state.halfmove = h.prevHalfmove;
    state.fullmove = h.prevFullmove;
    if (m.piece === K) state.kings[0] = m.from;
    else if (m.piece === -K) state.kings[1] = m.from;
    state.turn = color;
    return m;
  }

  // ---------- SAN ----------
  function moveToSan(state, m, legalMoves) {
    var type = m.piece > 0 ? m.piece : -m.piece;
    var san;
    if (m.flags === 'k') san = 'O-O';
    else if (m.flags === 'q') san = 'O-O-O';
    else {
      san = '';
      if (type !== P) {
        san += ' NBRQK'[type - 1];
        var others = [];
        for (var i = 0; i < legalMoves.length; i++) {
          var x = legalMoves[i];
          if (x !== m && x.piece === m.piece && x.to === m.to) others.push(x);
        }
        if (others.length) {
          var sameFile = false, sameRank = false;
          for (i = 0; i < others.length; i++) {
            if ((others[i].from & 7) === (m.from & 7)) sameFile = true;
            if ((others[i].from >> 3) === (m.from >> 3)) sameRank = true;
          }
          if (!sameFile) san += 'abcdefgh'[m.from & 7];
          else if (!sameRank) san += (8 - (m.from >> 3));
          else san += 'abcdefgh'[m.from & 7] + (8 - (m.from >> 3));
        }
      }
      if (m.captured) {
        if (type === P) san += 'abcdefgh'[m.from & 7];
        san += 'x';
      }
      san += 'abcdefgh'[m.to & 7] + (8 - (m.to >> 3));
      if (m.promotion) san += '=' + ' NBRQ'[m.promotion - 1];
    }
    makeMove(state, m);
    var opp = state.turn;
    var oppMoves = generateMoves(state);
    if (inCheck(state, opp)) san += oppMoves.length ? '+' : '#';
    undoMove(state, m);
    return san;
  }

  // ---------- draws ----------
  function insufficientMaterial(state) {
    var b = state.board;
    var minors = [];
    var p, t, i;
    for (i = 0; i < 64; i++) {
      p = b[i];
      if (!p) continue;
      t = p > 0 ? p : -p;
      if (t === P || t === R || t === Q) return false;
      if (t === N || t === B) minors.push({ t: t, c: p > 0 ? 1 : -1, color: ((i >> 3) + (i & 7)) & 1 });
    }
    if (minors.length <= 1) return true;                       // K vs K, K+minor vs K
    if (minors.length === 2 && minors[0].t === B && minors[1].t === B &&
        minors[0].c !== minors[1].c && minors[0].color === minors[1].color)
      return true;                                             // opposite B vs same-coloured B
    return false;
  }

  // ---------- Game API ----------
  function Game(fen) { this.load(fen || START_FEN); }

  Game.prototype.load = function (fen) {
    this.state = parseFen(fen);
    this.repetitions = {};
    this.repetitions[this.key()] = 1;
  };

  Game.prototype.key = function () {
    var s = this.state;
    return s.board.join(',') + '|' + s.turn + '|' +
      (s.castling.K ? 'K' : '') + (s.castling.Q ? 'Q' : '') +
      (s.castling.k ? 'k' : '') + (s.castling.q ? 'q' : '') + '|' + s.ep;
  };

  Game.prototype.moves = function (sq) {
    var all = generateMoves(this.state);
    if (sq === undefined || sq === null) return all;
    var out = [];
    for (var i = 0; i < all.length; i++) if (all[i].from === sq) out.push(all[i]);
    return out;
  };

  Game.prototype.move = function (from, to, promotion) {
    if (from && typeof from === 'object') {
      to = from.to; promotion = from.promotion; from = from.from;
    }
    var legal = generateMoves(this.state);
    var cands = [];
    for (var i = 0; i < legal.length; i++) {
      if (legal[i].from === from && legal[i].to === to) cands.push(legal[i]);
    }
    if (!cands.length) return null;
    var m = cands[0];
    if (cands.length > 1) {
      var want = promotion || Q;
      for (i = 0; i < cands.length; i++) if (cands[i].promotion === want) { m = cands[i]; break; }
    }
    var san = moveToSan(this.state, m, legal);
    makeMove(this.state, m);
    m.san = san;
    var k = this.key();
    this.repetitions[k] = (this.repetitions[k] || 0) + 1;
    return m;
  };

  Game.prototype.undo = function () {
    if (!this.state.history.length) return null;
    var k = this.key();
    if (this.repetitions[k]) this.repetitions[k]--;
    return undoMove(this.state);
  };

  Game.prototype.turn = function () { return this.state.turn; };
  Game.prototype.board = function () { return this.state.board; };
  Game.prototype.fen = function () { return stateToFen(this.state); };
  Game.prototype.inCheck = function () { return inCheck(this.state, this.state.turn); };
  Game.prototype.historySans = function () {
    var out = [];
    var h = this.state.history;
    for (var i = 0; i < h.length; i++) out.push(h[i].move.san);
    return out;
  };

  Game.prototype.isGameOver = function () {
    var s = this.state;
    var moves = generateMoves(s);
    if (!moves.length) {
      if (inCheck(s, s.turn)) return { over: true, result: -s.turn, reason: 'checkmate' };
      return { over: true, result: 0, reason: 'stalemate' };
    }
    if (s.halfmove >= 100) return { over: true, result: 0, reason: 'fifty-move rule' };
    if (insufficientMaterial(s)) return { over: true, result: 0, reason: 'insufficient material' };
    if ((this.repetitions[this.key()] || 0) >= 3) return { over: true, result: 0, reason: 'threefold repetition' };
    return { over: false };
  };

  // ---------- evaluation ----------
  function evaluate(state) {
    var b = state.board;
    var score = 0, phase = 0, wb = 0, bb = 0;
    var p, t, idx, v, sq;
    for (sq = 0; sq < 64; sq++) {
      p = b[sq];
      if (!p) continue;
      t = p > 0 ? p : -p;
      if (t === K) continue;
      idx = p > 0 ? sq : sq ^ 56;
      v = VALS[t] + PST[t][idx];
      score += p > 0 ? v : -v;
      phase += PHASE[t];
      if (t === B) { if (p > 0) wb++; else bb++; }
    }
    if (wb >= 2) score += 30;
    if (bb >= 2) score -= 30;
    var kt = phase <= 10 ? KING_END : KING_MID;
    score += kt[state.kings[0]];
    score -= kt[state.kings[1] ^ 56];
    return score; // white's perspective
  }

  function evalTurn(state) { return state.turn * evaluate(state); }

  function orderMoves(moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      var cap = m.captured ? (m.captured > 0 ? m.captured : -m.captured) : 0;
      var pc = m.piece > 0 ? m.piece : -m.piece;
      m.score = (cap ? 10 * VALS[cap] - VALS[pc] / 10 : 0) + (m.promotion ? VALS[m.promotion] : 0);
    }
    moves.sort(function (a, b2) { return b2.score - a.score; });
  }

  function quiesce(state, alpha, beta, depth) {
    var stand = evalTurn(state);
    if (depth === 0) return stand;
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    var moves = generateMoves(state);
    var caps = [];
    for (var i = 0; i < moves.length; i++) if (moves[i].captured || moves[i].promotion) caps.push(moves[i]);
    orderMoves(caps);
    for (i = 0; i < caps.length; i++) {
      makeMove(state, caps[i]);
      var sc = -quiesce(state, -beta, -alpha, depth - 1);
      undoMove(state, caps[i]);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function negamax(state, depth, alpha, beta, ply, useQ) {
    if (depth === 0) return useQ ? quiesce(state, alpha, beta, 6) : evalTurn(state);
    var moves = generateMoves(state);
    if (!moves.length) return inCheck(state, state.turn) ? -(MATE - ply) : 0;
    orderMoves(moves);
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      makeMove(state, moves[i]);
      var sc = -negamax(state, depth - 1, -beta, -alpha, ply + 1, useQ);
      undoMove(state, moves[i]);
      if (sc > best) best = sc;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function searchRoot(state, depth, noise, useQ) {
    var moves = generateMoves(state);
    if (!moves.length) return null;
    orderMoves(moves);
    var best = null, bestScore = -Infinity, alpha = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      var m = moves[i];
      makeMove(state, m);
      // With noise active we need each move's TRUE score (a rising alpha window
      // clamps weaker moves up to the current best, which would randomize the choice).
      var sc = -negamax(state, depth - 1, -Infinity, noise ? Infinity : -alpha, 1, useQ);
      undoMove(state, m);
      if (noise) sc += (Math.random() * 2 - 1) * noise;
      if (sc > bestScore) {
        bestScore = sc;
        best = m;
        if (sc > alpha) alpha = sc;
      }
    }
    return best;
  }

  // ---------- mate search (used by the puzzle trainer) ----------
  // Dedicated mate search: unlike the playing search, it tests for mate BEFORE
  // the depth cut-off, so a mate on the very last ply is scored correctly.
  function mateNegamax(state, depth, alpha, beta, ply) {
    var moves = generateMoves(state);
    if (!moves.length) return inCheck(state, state.turn) ? -(MATE - ply) : 0;
    if (depth === 0) return state.turn * evaluate(state);
    orderMoves(moves);
    var best = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      makeMove(state, moves[i]);
      var sc = -mateNegamax(state, depth - 1, -beta, -alpha, ply + 1);
      undoMove(state, moves[i]);
      if (sc > best) best = sc;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function mateWithin(state, plies) {
    if (plies <= 0) return false;
    return mateNegamax(state, plies, -Infinity, Infinity, 0) <= -(MATE - plies);
  }

  function mateIn(state, maxMoves) {
    for (var n = 1; n <= maxMoves; n++) {
      var D = 2 * n - 1;
      if (mateNegamax(state, D, MATE - D - 1, Infinity, 0) >= MATE - D) return n;
    }
    return 0;
  }

  // ---------- opening book (level 6: the greats) ----------
  // Famous openings, in SAN from the initial position. At level 6 the engine plays
  // from this book while the position is still in it, then falls back to a search.
  // Every line is replayed by tests/engine.test.js, which checks each move is legal.
  var OPENINGS = [
    { name: 'Ruy Lopez', note: 'The Spanish \u2014 the classical main line, played at the top for over a century.', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'] },
    { name: 'Sicilian Defence, Najdorf', note: 'The Najdorf \u2014 the sharp Sicilian favoured by Fischer and Kasparov.', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
    { name: 'Italian Game, Giuoco Piano', note: 'The Giuoco Piano \u2014 the oldest recorded opening, still seen at the top.', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4'] },
    { name: 'Two Knights Defence', note: 'The Two Knights \u2014 a sharp favourite of attacking players.', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5'] },
    { name: 'Scotch Game', note: 'The Scotch \u2014 revived by Kasparov to open up 1.e4 e5.', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4'] },
    { name: 'Queen\u2019s Gambit Declined', note: 'The QGD \u2014 the backbone of classical chess.', moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'] },
    { name: 'Slav Defence', note: 'The Slav \u2014 a rock-solid answer to the Queen\u2019s Gambit.', moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'] },
    { name: 'King\u2019s Indian Defence', note: 'The King\u2019s Indian \u2014 Kasparov\u2019s main weapon with Black.', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O'] },
    { name: 'Nimzo-Indian Defence', note: 'The Nimzo-Indian \u2014 named for Nimzowitsch, a positional cornerstone.', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'] },
    { name: 'Gr\u00fcnfeld Defence', note: 'The Gr\u00fcnfeld \u2014 Kasparov\u2019s other great counter-attacking choice.', moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5'] },
    { name: 'Queen\u2019s Indian Defence', note: 'The Queen\u2019s Indian \u2014 a flexible, hypermodern setup.', moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'] },
    { name: 'Catalan Opening', note: 'The Catalan \u2014 a long positional squeeze with the fianchettoed bishop.', moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2'] },
    { name: 'French Defence', note: 'The French \u2014 a solid, counter-attacking reply to 1.e4.', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'] },
    { name: 'Caro-Kann Defence', note: 'The Caro-Kann \u2014 a famously solid structure.', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'] },
    { name: 'English Opening', note: 'The English \u2014 a flank opening popular with positional players.', moves: ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'] },
    { name: 'Petrov Defence', note: 'The Petrov \u2014 a solid, symmetrical reply to 1.e4.', moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6'] },
    { name: 'King\u2019s Gambit Accepted', note: 'The King\u2019s Gambit \u2014 the romantic era\u2019s great attacking try.', moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3'] },
    { name: 'Pirc Defence', note: 'The Pirc \u2014 a hypermodern defence that invites White forward.', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'] }
  ];

  // play a SAN move on a Game (returns the move, or null when the SAN is not legal)
  function playSan(g, san) {
    var ms = g.moves();
    for (var i = 0; i < ms.length; i++) {
      var mv = g.move(ms[i].from, ms[i].to, ms[i].promotion || 0);
      var got = g.state.history[g.state.history.length - 1].move.san;
      if (got === san) return mv;
      g.undo();
    }
    return null;
  }

  // position key (board, turn, castling, en passant) — the same for a transposition
  function positionKey(state) {
    return stateToFen(state).split(' ').slice(0, 4).join(' ');
  }

  // the book, keyed by position: replay each line once and remember every stop.
  // A position can have several candidate moves (shared openings), so each key
  // holds a list and the engine picks among them, varying its openings.
  var BOOK = null;
  function buildBook() {
    if (BOOK) return BOOK;
    BOOK = {};
    for (var i = 0; i < OPENINGS.length; i++) {
      var o = OPENINGS[i];
      var g = new Game();
      for (var j = 0; j < o.moves.length; j++) {
        var key = positionKey(g.state);
        if (!BOOK[key]) BOOK[key] = [];
        BOOK[key].push({ san: o.moves[j], name: o.name, note: o.note });
        if (!playSan(g, o.moves[j])) break;
      }
    }
    return BOOK;
  }

  // the book move for this position, or null when the game has left the book
  function openingMove(state) {
    var entries = buildBook()[positionKey(state)];
    if (!entries || !entries.length) return null;
    var legal = generateMoves(state);
    var order = entries.slice();
    for (var s = order.length - 1; s > 0; s--) {   // shuffle, so the opening varies
      var r = Math.floor(Math.random() * (s + 1));
      var t = order[s]; order[s] = order[r]; order[r] = t;
    }
    for (var i = 0; i < order.length; i++) {
      for (var j = 0; j < legal.length; j++) {
        if (moveToSan(state, legal[j], legal) === order[i].san) {
          state.bookOpening = { name: order[i].name, note: order[i].note };
          return legal[j];
        }
      }
    }
    return null;
  }

  // the opening the current position belongs to, or null
  function currentOpening(state) {
    var entries = buildBook()[positionKey(state)];
    if (!entries || !entries.length) return null;
    if (state.bookOpening) return state.bookOpening;   // the line the engine is following
    return { name: entries[0].name, note: entries[0].note };
  }

  var Openings = {
    list: OPENINGS,
    current: currentOpening,
    move: openingMove
  };

  var AI = {
    // Six playing strengths: 1 Beginner, 2 Casual, 3 Club, 4 Strong, 5 Expert,
    // 6 Masters — follows a great player's opening, then plays at Expert strength
    search: function (state, level) {
      if (level <= 1) return searchRoot(state, 1, 180, true);
      if (level === 2) return searchRoot(state, 2, 70, true);
      if (level === 3) return searchRoot(state, 2, 10, true);
      if (level === 4) return searchRoot(state, 3, 0, true);
      if (level === 6) return openingMove(state) || searchRoot(state, 4, 0, true);
      return searchRoot(state, 4, 0, true);
    },
    evaluate: evaluate,
    mateIn: mateIn,
    mateWithin: mateWithin
  };

  // ---------- perft ----------
  function perft(state, depth) {
    if (depth === 0) return 1;
    var moves = generateMoves(state);
    var n = 0;
    for (var i = 0; i < moves.length; i++) {
      makeMove(state, moves[i]);
      n += perft(state, depth - 1);
      undoMove(state, moves[i]);
    }
    return n;
  }

  // ---------- game points ----------
  // Six stake multipliers, one per difficulty level (1 Beginner .. 6 Masters).
  var LEVEL_MULTIPLIER = [5, 10, 15, 20, 30, 40];

  // the display name of each difficulty level
  var LEVEL_NAMES = ['Beginner', 'Casual', 'Club', 'Strong', 'Expert', 'Masters'];

  function levelName(level) {
    return LEVEL_NAMES[clampLevel(level) - 1];
  }

  function levelMultiplier(level) {
    var n = Math.round(+level) || 1;
    if (n < 1) n = 1;
    if (n > 6) n = 6;
    return LEVEL_MULTIPLIER[n - 1];
  }

  // Turn an accumulated point total into the game score.
  //   outcome: 1 = the player won, -1 = the player lost, 0 = draw
  //   win  -> |accumulate| x stake  (a win always pays positively, even on a negative total)
  //   loss -> accumulate / stake
  //   draw -> accumulate x 1
  function finalScore(accumulated, outcome, level) {
    var m = levelMultiplier(level);
    if (outcome > 0) return Math.abs(accumulated) * m;
    if (outcome < 0) return accumulated / m;
    return accumulated;
  }

  // ---- fast-win bonus ----
  // Winning inside this many full moves pays the level's bonus on top of the settled
  // score. The bonus rises with the level: 100 / 200 / 300 / 400 / 600 / 900.
  var FAST_WIN_MOVES = 25;
  var FAST_WIN_BONUS = [100, 200, 300, 400, 600, 900];

  function fastWinBonus(outcome, moves, level) {
    var m = Math.floor(+moves) || 0;
    if (!(outcome > 0 && m >= 1 && m <= FAST_WIN_MOVES)) return 0;
    return FAST_WIN_BONUS[clampLevel(level) - 1];
  }

  // ---- resign penalty ----
  // Conceding costs a flat deduction from the total, by level:
  // 10 / 20 / 30 / 40 / 35 / 25. A resignation is scored on its own — the
  // game's accumulated points are not counted.
  var RESIGN_PENALTY = [10, 20, 30, 40, 35, 25];

  function resignPenalty(level) {
    return RESIGN_PENALTY[clampLevel(level) - 1];
  }

  // ---- time bonuses ----
  // A "ply" is a single player turn (1 = White's first move). After the level's
  // warm-up (`after` plies), every `every`-th ply hands `seconds` to the side that
  // just moved. The computer only earns these at levels 1 and 5.
  var TIME_BONUS = [
    null,
    { every: 1, after: 10, seconds: 120 },    // L1: +2 min every ply from ply 11
    { every: 5, after: 10, seconds: 600 },    // L2: +10 min every 5th ply after ply 10
    { every: 10, after: 10, seconds: 1800 },  // L3: +30 min every 10th ply after ply 10
    { every: 45, after: 0, seconds: 2700 },   // L4: +45 min every 45th ply
    { every: 50, after: 0, seconds: 3000 },   // L5: +50 min every 50th ply
    { every: 60, after: 0, seconds: 3600 }    // L6: +60 min every 60th ply
  ];

  function clampLevel(level) {
    var n = Math.round(+level) || 1;
    if (n < 1) n = 1;
    if (n > 6) n = 6;
    return n;
  }

  // seconds handed to the mover after ply number `ply`; 0 when no bonus is due
  function timeBonus(level, ply) {
    var r = TIME_BONUS[clampLevel(level)];
    var p = Math.round(+ply) || 0;
    if (p <= r.after) return 0;
    if (r.every <= 0 || p % r.every !== 0) return 0;
    return r.seconds;
  }

  // the computer only earns bonuses at levels 1, 5 and 6
  function computerGetsBonus(level) {
    var n = clampLevel(level);
    return n === 1 || n === 5 || n === 6;
  }

  // ---- undo allowance ----
  // Undo is limited to a share of the moves played so far, tightening with the
  // difficulty: 50 / 40 / 30 / 20 / 10 / 5 % at levels 1-6.
  var UNDO_PERCENT = [0.5, 0.4, 0.3, 0.2, 0.1, 0.05];

  function undoPercent(level) {
    return UNDO_PERCENT[clampLevel(level) - 1];
  }

  // how many undos the level allows once `moves` moves have been played
  function undosAllowed(level, moves) {
    var m = Math.floor(+moves) || 0;
    if (m < 0) m = 0;
    return Math.floor(undoPercent(level) * m);
  }

  // ---- level gating by total game points ----
  // A level stays open while the player's running total is under its ceiling. Once the
  // total reaches the ceiling the level is closed and the player must move up a level.
  // Level 6 is the exception: it *opens* at 50000, once levels 1-4 have closed.
  var LEVEL_CEILING = [0, 5000, 10000, 30000, 50000, Infinity, Infinity];
  var LEVEL_OPENS = [0, 0, 0, 0, 0, 0, 50000];

  // is `level` open to a player with `totalPoints`?
  function levelPlayable(level, totalPoints) {
    var n = clampLevel(level);
    var t = +totalPoints || 0;
    return t >= LEVEL_OPENS[n] && t < LEVEL_CEILING[n];
  }

  // the lowest level still open to that player
  function lowestPlayableLevel(totalPoints) {
    for (var n = 1; n <= 6; n++) {
      if (levelPlayable(n, totalPoints)) return n;
    }
    return 5;
  }

  // ---- puzzle levels ----
  // Which puzzle levels the match has unlocked. Level 1 is the base level and is
  // always open; level 2 unlocks once the queens are exchanged (both gone), level 3
  // when the player is two pawns down (or worse) in material, and level 4 while the
  // player's king is in check. When several are open the highest one wins.
  var PIECE_POINTS = [0, 1, 3, 3, 5, 9, 0];

  function puzzleLevelsAvailable(state, playerColor) {
    var me = playerColor > 0 ? 1 : -1;
    var open = [1];
    var whiteQueen = 0, blackQueen = 0, myMaterial = 0, theirMaterial = 0;
    for (var i = 0; i < 64; i++) {
      var p = state.board[i];
      if (!p) continue;
      var t = p > 0 ? p : -p;
      if (t === K) continue;
      if (t === Q) { if (p > 0) whiteQueen++; else blackQueen++; }
      if ((p > 0) === (me > 0)) myMaterial += PIECE_POINTS[t];
      else theirMaterial += PIECE_POINTS[t];
    }
    if (whiteQueen === 0 && blackQueen === 0) open.push(2);   // queens exchanged
    if (theirMaterial - myMaterial >= 2) open.push(3);        // two pawns down
    if (inCheck(state, me)) open.push(4);                     // king in check
    return open;
  }

  // the highest puzzle level the match has unlocked
  function puzzleLevel(state, playerColor) {
    var open = puzzleLevelsAvailable(state, playerColor);
    return open[open.length - 1];
  }

  var Scoring = {
    levelMultiplier: levelMultiplier,
    finalScore: finalScore,
    fastWinBonus: fastWinBonus,
    resignPenalty: resignPenalty,
    timeBonus: timeBonus,
    computerGetsBonus: computerGetsBonus,
    levelPlayable: levelPlayable,
    lowestPlayableLevel: lowestPlayableLevel,
    puzzleLevelsAvailable: puzzleLevelsAvailable,
    puzzleLevel: puzzleLevel,
    undoPercent: undoPercent,
    undosAllowed: undosAllowed,
    LEVEL_MULTIPLIER: LEVEL_MULTIPLIER,
    LEVEL_NAMES: LEVEL_NAMES,
    FAST_WIN_MOVES: FAST_WIN_MOVES,
    FAST_WIN_BONUS: FAST_WIN_BONUS,
    RESIGN_PENALTY: RESIGN_PENALTY,
    levelName: levelName,
    TIME_BONUS: TIME_BONUS,
    LEVEL_CEILING: LEVEL_CEILING,
    LEVEL_OPENS: LEVEL_OPENS,
    UNDO_PERCENT: UNDO_PERCENT
  };

  var Chess = { Game: Game, AI: AI, Openings: Openings, perft: perft, generateMoves: generateMoves, Scoring: Scoring };

  global.Chess = Chess;
  if (typeof module !== 'undefined' && module.exports) module.exports = Chess;

})(typeof window !== 'undefined' ? window : globalThis);
