/* Royal Chess — built-in puzzle set: 20 puzzles in four levels.

   Each level unlocks as the match develops, and a puzzle is only available at
   the level the game has reached (the highest unlocked level wins):
     level 1  the base level, available from the opening
     level 2  unlocks once the queens are exchanged
     level 3  unlocks when the player is two pawns down (material)
     level 4  unlocks while the player's king is in check
   See Chess.Scoring.puzzleLevelsAvailable / puzzleLevel in the engine.

   kind:     "line"     — play the solution on the board.
   player:   the colour the solver plays (the trainer plays the opponent's
             move for them if the puzzle starts on the other side).
   line:     the reference solution in SAN.

   Sources: Chess.com daily puzzles, Lichess puzzles (CC0) and two classics from
   the connected knowledge base (Martin Gardner's chess chapter).
   tests/puzzles.test.js re-checks every line on each run. */
(function (global) {
  'use strict';

  var PUZZLES = [
    {
      "level": 1,
      "id": "L1a",
      "theme": "Discovering Victory",
      "source": "Chess.com daily puzzle — 2025-05-12",
      "kind": "line",
      "fen": "8/p5b1/q2k2p1/3P1b2/PRP2P1p/B6P/4r1P1/7K w - - 0 1",
      "player": "w",
      "endsInMate": true,
      "note": "White to play — mate in one.",
      "line": [
        "Rb7#"
      ]
    },
    {
      "level": 1,
      "id": "L1b",
      "theme": "Mate in 1",
      "source": "Chess.com daily puzzle — 2012-05-06",
      "kind": "line",
      "fen": "r1bqkb1r/ppp2ppp/3p4/3Bp3/3nP3/5Q2/PPPP1PPP/R1B1K1NR w KQkq - 0 1",
      "player": "w",
      "endsInMate": true,
      "note": "White to play — mate in one.",
      "line": [
        "Qxf7#"
      ]
    },
    {
      "level": 1,
      "id": "L1c",
      "theme": "Underpromotion",
      "source": "Chess.com daily puzzle — 2011-02-06",
      "kind": "line",
      "fen": "bb6/k1P5/nnPpp3/p1Br1pNN/p2r1pR1/3qp1PP/6K1/6RQ w - - 0 1",
      "player": "w",
      "endsInMate": true,
      "note": "White to play — mate in one, but not with a queen.",
      "line": [
        "c8=N#"
      ]
    },
    {
      "level": 1,
      "id": "L1d",
      "theme": "Back-rank finish",
      "source": "Lichess puzzle oY29r (rating 1078)",
      "kind": "line",
      "fen": "R7/2p4k/6p1/3B1ppp/3b4/4qP2/1PP1Q1PP/5K2 b - - 1 25",
      "player": "b",
      "endsInMate": true,
      "note": "Black to play — mate in one.",
      "line": [
        "Qg1#"
      ]
    },
    {
      "level": 1,
      "id": "L1e",
      "theme": "Fork the king and rook",
      "source": "Lichess puzzle csSfA (rating 1139)",
      "kind": "line",
      "fen": "r1q1k2r/1b2bp1p/pp3n2/1N2Q3/3p4/3P3P/PPP2PP1/R3KB1R w KQkq - 1 16",
      "player": "w",
      "note": "White to play — win material with a check.",
      "line": [
        "Nd6+",
        "Kf8",
        "Nxc8"
      ]
    },
    {
      "level": 2,
      "id": "L2a",
      "theme": "Order of Capture",
      "source": "Chess.com daily puzzle — 2010-03-16",
      "kind": "line",
      "fen": "2r2rk1/Bpnbppbp/2np2p1/3N4/2P1P3/1P4PP/P1N2PB1/3RR1K1 b - - 0 1",
      "player": "b",
      "note": "Black to play — the captures only work in one order.",
      "line": [
        "Nxd5",
        "exd5",
        "Nxa7"
      ]
    },
    {
      "level": 2,
      "id": "L2b",
      "theme": "Where Did Everybody Go?",
      "source": "Chess.com daily puzzle — 2026-09-01",
      "kind": "line",
      "fen": "rnb1k2r/ppp2pp1/3qp2p/8/1b1P4/2B3P1/PP2PPBP/R2QK1NR w KQkq - 0 1",
      "player": "w",
      "note": "White to play — a forcing sequence of trades that wins a piece.",
      "line": [
        "Qa4+",
        "Nc6",
        "Bxc6+",
        "Qxc6",
        "Qxc6+",
        "bxc6",
        "Bxb4"
      ]
    },
    {
      "level": 2,
      "id": "L2c",
      "theme": "Showtime!",
      "source": "Chess.com daily puzzle — 2025-09-26",
      "kind": "line",
      "fen": "1n3rk1/3pQ1pb/2p4p/4N2r/1R1Bq2P/8/5PP1/6K1 w - - 0 1",
      "player": "w",
      "endsInMate": true,
      "note": "White to play — a forcing sequence that finishes with mate.",
      "line": [
        "Qxf8+",
        "Kxf8",
        "Bc5+",
        "d6",
        "Bxd6+",
        "Ke8",
        "Rxb8#"
      ]
    },
    {
      "level": 2,
      "id": "L2d",
      "theme": "Take the loose rook",
      "source": "Lichess puzzle mJDcO (rating 1321)",
      "kind": "line",
      "fen": "5rk1/p1Q3pp/8/3p4/3q1R2/8/P1P3PP/R6K b - - 0 21",
      "player": "b",
      "endsInMate": true,
      "note": "Black to play — a short forced mate.",
      "line": [
        "Qxa1+",
        "Rf1",
        "Qxf1#"
      ]
    },
    {
      "level": 2,
      "id": "L2e",
      "theme": "White Wins",
      "source": "Chess.com daily puzzle — 2014-04-11",
      "kind": "line",
      "fen": "4r1k1/pb2r1pp/1ppq1p2/4N3/3PRP2/2P3P1/PPQ4P/4R1K1 w - - 0 1",
      "player": "w",
      "note": "White to play — a queen sacrifice opens the door.",
      "line": [
        "Qb3+",
        "Kf8",
        "Qf7+",
        "Rxf7",
        "Ng6+",
        "Kg8",
        "Rxe8+"
      ]
    },
    {
      "level": 3,
      "id": "L3a",
      "theme": "Thread the Needle",
      "source": "Chess.com daily puzzle — 2026-10-14",
      "kind": "line",
      "fen": "1q6/2p4k/1p5p/1P4p1/4rp2/2R5/6PP/2Q4K w - - 0 1",
      "player": "w",
      "note": "White to play — a quiet move sets up the win.",
      "line": [
        "Qb1",
        "Qa8",
        "Rc4",
        "Kg7",
        "Rxe4"
      ]
    },
    {
      "level": 3,
      "id": "L3b",
      "theme": "When Keres Attacks",
      "source": "Chess.com daily puzzle — 2022-01-07",
      "kind": "line",
      "fen": "1r2rk2/3b1pp1/p1p1p2p/q3P3/5Q1P/2NB2R1/PPP3P1/2K5 w - - 2 21",
      "player": "w",
      "note": "White to play — break through on the kingside.",
      "line": [
        "Rxg7",
        "Kxg7",
        "Qf6+",
        "Kg8",
        "Qxh6",
        "f5",
        "exf6"
      ]
    },
    {
      "level": 3,
      "id": "L3c",
      "theme": "X-ray attack",
      "source": "Lichess puzzle tewjc (rating 1493)",
      "kind": "line",
      "fen": "r5k1/Rp3p1p/2b2qp1/3pr3/8/4P2P/2PN1PP1/Q3K2R b K - 0 19",
      "player": "b",
      "note": "Black to play — the rook goes through the pawn.",
      "line": [
        "Rxe3+",
        "fxe3",
        "Qxa1+",
        "Rxa1",
        "Rxa1+"
      ]
    },
    {
      "level": 3,
      "id": "L3d",
      "theme": "Pin and win",
      "source": "Lichess puzzle 0kDWS (rating 1947)",
      "kind": "line",
      "fen": "1r6/1PN5/3p4/3nkpp1/1R6/P7/K1P5/8 w - - 1 50",
      "player": "w",
      "note": "White to play — convert the pawn with a pin.",
      "line": [
        "Rb5",
        "Rxb7",
        "Rxb7"
      ]
    },
    {
      "level": 3,
      "id": "L3e",
      "theme": "Mutilated Score Sheet",
      "source": "Martin Gardner, chess chapter — Problem 12.13",
      "kind": "line",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "player": "b",
      "endsInMate": true,
      "note": "White's moves survived on an 1897 score sheet; Black's were burned away. Reconstruct Black's four-move mate.",
      "line": [
        "f3",
        "e5",
        "Kf2",
        "Qf6",
        "Kg3",
        "Qxf3+",
        "Kh4",
        "Be7#"
      ]
    },
    {
      "level": 4,
      "id": "L4a",
      "theme": "Forcing the Opponent's Hand",
      "source": "Chess.com daily puzzle — 2009-03-07",
      "kind": "line",
      "fen": "7k/6pP/6P1/4p3/4Pp1p/1p2pPpP/1P2P1K1/2B3NQ w KQkq - 0 1",
      "player": "w",
      "endsInMate": true,
      "note": "White to play — a long forced sequence ending in mate.",
      "line": [
        "Bxe3",
        "fxe3",
        "f4",
        "exf4",
        "Kf3",
        "g2",
        "Kxg2",
        "f3+",
        "exf3",
        "e2",
        "Qh2",
        "e1=Q",
        "Qb8#"
      ]
    },
    {
      "level": 4,
      "id": "L4b",
      "theme": "White to Draw",
      "source": "Chess.com daily puzzle — 2008-02-13",
      "kind": "line",
      "fen": "2k5/2P4K/1P3p2/6p1/6n1/8/5P2/8 w KQkq - 0 1",
      "player": "w",
      "note": "White to play — a study: find the saving line.",
      "line": [
        "f3",
        "Ne5",
        "Kg7",
        "Nxf3",
        "Kxf6",
        "g4",
        "Kf5",
        "g3",
        "Kg4",
        "g2",
        "Kh3",
        "g1=Q",
        "b7+",
        "Kxb7",
        "c8=Q+"
      ]
    },
    {
      "level": 4,
      "id": "L4c",
      "theme": "Skewer",
      "source": "Lichess puzzle sUNKR (rating 1827)",
      "kind": "line",
      "fen": "2RR4/5pk1/5n1q/pp6/5p2/1P4P1/PB3PKP/4r3 w - - 0 40",
      "player": "w",
      "note": "White to play — drive the king and win the queen.",
      "line": [
        "Rg8+",
        "Kh7",
        "Rh8+",
        "Kg6",
        "Rxh6+"
      ]
    },
    {
      "level": 4,
      "id": "L4d",
      "theme": "Eccentric Chess",
      "source": "Martin Gardner, chess chapter — Problem 12.8",
      "kind": "line",
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      "player": "w",
      "note": "Construct the game in which each side plays its knight four times — and both king's knights are captured on move four.",
      "line": [
        "Nf3",
        "d5",
        "Ne5",
        "Nf6",
        "Nc6",
        "Nfd7",
        "Nxb8",
        "Nxb8"
      ]
    },
    {
      "level": 4,
      "id": "L4e",
      "theme": "Fork on the back rank",
      "source": "Lichess puzzle Ciis7 (rating 1982)",
      "kind": "line",
      "fen": "2r5/2r2pk1/3qpnp1/pB1pN2p/Pn1P4/1QR1PPP1/4K1P1/2R5 b - - 1 1",
      "player": "b",
      "note": "Black to play — win material with a fork.",
      "line": [
        "Na2",
        "Rxc7",
        "Nxc1+",
        "Rxc1",
        "Rxc1"
      ]
    }
  ];

  global.CHESS_PUZZLES = PUZZLES;
  if (typeof module !== 'undefined' && module.exports) module.exports = PUZZLES;

})(typeof window !== 'undefined' ? window : globalThis);
