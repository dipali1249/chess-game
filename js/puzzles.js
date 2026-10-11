/* Royal Chess — built-in puzzle set.
   Two classics from the connected knowledge base (Martin Gardner's chess chapter)
   plus five daily puzzles taken from Chess.com's public puzzle feed. Every puzzle
   is a real position with a solution line — nothing is generated locally.
   tests/puzzles.test.js re-checks every line on each run.

   kind:     "line"     — play the solution on the board.
   player:   the colour the solver plays.
   line:     the reference solution in SAN (the trainer accepts the book's line). */
(function (global) {
  'use strict';

  var PUZZLES = [
    {
      "id": "G1",
      "theme": "Eccentric Chess",
      "source": "Martin Gardner, chess chapter \u2014 Problem 12.8",
      "kind": "line",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "player": "w",
      "note": "Construct the game in which each side plays its knight four times \u2014 and both king's knights are captured on move four.",
      "line": ["Nf3", "d5", "Ne5", "Nf6", "Nc6", "Nfd7", "Nxb8", "Nxb8"]
    },
    {
      "id": "G2",
      "theme": "Mutilated Score Sheet",
      "source": "Martin Gardner, chess chapter \u2014 Problem 12.13",
      "kind": "line",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "player": "b",
      "endsInMate": true,
      "note": "White's moves survived on an 1897 score sheet; Black's were burned away. Reconstruct Black's four-move mate.",
      "line": ["f3", "e5", "Kf2", "Qf6", "Kg3", "Qxf3+", "Kh4", "Be7#"]
    },
    {
      "id": "C1",
      "theme": "Showtime!",
      "source": "Chess.com daily puzzle \u2014 2025-09-26",
      "kind": "line",
      "fen": "1n3rk1/3pQ1pb/2p4p/4N2r/1R1Bq2P/8/5PP1/6K1 w - - 0 1",
      "player": "w",
      "endsInMate": true,
      "note": "White to play \u2014 a forcing sequence that finishes with mate.",
      "line": ["Qxf8+", "Kxf8", "Bc5+", "d6", "Bxd6+", "Ke8", "Rxb8#"]
    },
    {
      "id": "C2",
      "theme": "Where Did Everybody Go?",
      "source": "Chess.com daily puzzle \u2014 2026-09-01",
      "kind": "line",
      "fen": "rnb1k2r/ppp2pp1/3qp2p/8/1b1P4/2B3P1/PP2PPBP/R2QK1NR w KQkq - 0 1",
      "player": "w",
      "note": "White to play \u2014 a forcing sequence of trades that wins a piece.",
      "line": ["Qa4+", "Nc6", "Bxc6+", "Qxc6", "Qxc6+", "bxc6", "Bxb4"]
    },
    {
      "id": "C3",
      "theme": "White Wins",
      "source": "Chess.com daily puzzle \u2014 2014-04-11",
      "kind": "line",
      "fen": "4r1k1/pb2r1pp/1ppq1p2/4N3/3PRP2/2P3P1/PPQ4P/4R1K1 w - - 0 1",
      "player": "w",
      "note": "White to play \u2014 a queen sacrifice opens the door.",
      "line": ["Qb3+", "Kf8", "Qf7+", "Rxf7", "Ng6+", "Kg8", "Rxe8+"]
    },
    {
      "id": "C4",
      "theme": "Mate in 1",
      "source": "Chess.com daily puzzle \u2014 2012-05-06",
      "kind": "line",
      "fen": "r1bqkb1r/ppp2ppp/3p4/3Bp3/3nP3/5Q2/PPPP1PPP/R1B1K1NR w KQkq - 0 1",
      "player": "w",
      "endsInMate": true,
      "note": "White to play \u2014 mate in one.",
      "line": ["Qxf7#"]
    },
    {
      "id": "C5",
      "theme": "Order of Capture",
      "source": "Chess.com daily puzzle \u2014 2010-03-16",
      "kind": "line",
      "fen": "2r2rk1/Bpnbppbp/2np2p1/3N4/2P1P3/1P4PP/P1N2PB1/3RR1K1 b - - 0 1",
      "player": "b",
      "note": "Black to play \u2014 the captures only work in one order.",
      "line": ["Nxd5", "exd5", "Nxa7"]
    }
  ];

  global.CHESS_PUZZLES = PUZZLES;
  if (typeof module !== 'undefined' && module.exports) module.exports = PUZZLES;

})(typeof window !== 'undefined' ? window : globalThis);
