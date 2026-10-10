/* Royal Chess — built-in puzzle set (5 levels).
   Every position here was generated and machine-verified by the chess engine:
   each is a legal position with a forced solution of exactly the stated depth.
   tests/puzzles.test.js re-checks all of them on every run.

   goal: "mate1" | "mate2" | "mate3" = mate in that many moves for the player;
         "winrook" = win the black rook with a knight fork.
   line: a reference solution in SAN (the trainer accepts any correct solution). */
(function (global) {
  'use strict';

  var LEVELS = [
    {
      "level": 1,
      "name": "Mate in 1",
      "blurb": "Find the immediate checkmate.",
      "puzzles": [
        {
          "id": "L1-1",
          "theme": "Back-rank mate",
          "fen": "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
          "goal": "mate1",
          "line": [
            "Ra8#"
          ]
        },
        {
          "id": "L1-2",
          "theme": "Back-rank with the queen",
          "fen": "6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1",
          "goal": "mate1",
          "line": [
            "Qd8#"
          ]
        },
        {
          "id": "L1-3",
          "theme": "Corner back-rank",
          "fen": "7k/6pp/8/8/8/8/8/R6K w - - 0 1",
          "goal": "mate1",
          "line": [
            "Ra8#"
          ]
        },
        {
          "id": "L1-4",
          "theme": "Smothered mate",
          "fen": "6rk/6pp/8/6N1/8/8/8/1K6 w - - 0 1",
          "goal": "mate1",
          "line": [
            "Nf7#"
          ]
        }
      ]
    },
    {
      "level": 2,
      "name": "Mate in 2",
      "blurb": "Force mate in two moves.",
      "puzzles": [
        {
          "id": "L2-1",
          "theme": "Forced mate in 2",
          "fen": "1k6/p1p5/8/3K1R2/3Q4/8/8/8 w - - 0 1",
          "goal": "mate2",
          "line": [
            "Kc6",
            "Kc8",
            "Rf8#"
          ]
        },
        {
          "id": "L2-2",
          "theme": "Forced mate in 2",
          "fen": "8/2K5/8/p3R3/k7/8/8/5R2 w - - 0 1",
          "goal": "mate2",
          "line": [
            "Rb1",
            "Ka3",
            "Rxa5#"
          ]
        },
        {
          "id": "L2-3",
          "theme": "Forced mate in 2",
          "fen": "1R6/4K2p/4Qpk1/8/8/8/8/8 w - - 0 1",
          "goal": "mate2",
          "line": [
            "Rg8+",
            "Kh6",
            "Qh3#"
          ]
        },
        {
          "id": "L2-4",
          "theme": "Forced mate in 2",
          "fen": "7k/3Q2p1/4K3/8/p7/8/8/8 w - - 0 1",
          "goal": "mate2",
          "line": [
            "Kf7",
            "Kh7",
            "Qh3#"
          ]
        }
      ]
    },
    {
      "level": 3,
      "name": "Win material",
      "blurb": "Win a rook with a knight fork.",
      "puzzles": [
        {
          "id": "L3-1",
          "theme": "Knight fork",
          "fen": "5k2/8/5rp1/6N1/8/8/8/1K6 w - - 0 1",
          "goal": "winrook",
          "line": [
            "Nh7+",
            "Ke7",
            "Nxf6"
          ]
        },
        {
          "id": "L3-2",
          "theme": "Knight fork",
          "fen": "7K/1k6/8/p7/2N5/1r6/8/8 w - - 0 1",
          "goal": "winrook",
          "line": [
            "Nxa5+",
            "Kc7",
            "Nxb3"
          ]
        },
        {
          "id": "L3-3",
          "theme": "Knight fork",
          "fen": "7K/8/1p6/1r6/8/8/2k5/1N6 w - - 0 1",
          "goal": "winrook",
          "line": [
            "Na3+",
            "Kd3",
            "Nxb5"
          ]
        },
        {
          "id": "L3-4",
          "theme": "Knight fork",
          "fen": "8/3N4/k7/8/1p2r3/8/8/1K6 w - - 0 1",
          "goal": "winrook",
          "line": [
            "Nc5+",
            "Kb6",
            "Nxe4"
          ]
        }
      ]
    },
    {
      "level": 4,
      "name": "Mate in 2 (harder)",
      "blurb": "Tighter positions — find the forced mate.",
      "puzzles": [
        {
          "id": "L4-1",
          "theme": "Forced mate in 2",
          "fen": "8/8/1r6/8/1R6/3K4/1p2R3/k7 w - - 0 1",
          "goal": "mate2",
          "line": [
            "Ra4+",
            "Kb1",
            "Re1#"
          ]
        },
        {
          "id": "L4-2",
          "theme": "Forced mate in 2",
          "fen": "8/8/4p3/8/5QK1/5p2/7p/7k w - - 0 1",
          "goal": "mate2",
          "line": [
            "Kxf3",
            "e5",
            "Qc1#"
          ]
        },
        {
          "id": "L4-3",
          "theme": "Forced mate in 2",
          "fen": "8/8/8/5Qp1/6K1/8/6pp/7k w - - 0 1",
          "goal": "mate2",
          "line": [
            "Qe4",
            "Kg1",
            "Qe1#"
          ]
        },
        {
          "id": "L4-4",
          "theme": "Forced mate in 2",
          "fen": "5R2/8/7r/8/5R2/k1K5/p7/8 w - - 0 1",
          "goal": "mate2",
          "line": [
            "Ra8+",
            "Ra6",
            "Rxa6#"
          ]
        }
      ]
    },
    {
      "level": 5,
      "name": "Mate in 3",
      "blurb": "The deepest combination.",
      "puzzles": [
        {
          "id": "L5-1",
          "theme": "Forced mate in 3",
          "fen": "8/4pkp1/7R/1Q3K2/8/8/8/8 w - - 0 1",
          "goal": "mate3",
          "line": [
            "Qc4+",
            "e6+",
            "Qxe6+",
            "Kf8",
            "Rh8#"
          ]
        },
        {
          "id": "L5-2",
          "theme": "Forced mate in 3",
          "fen": "8/8/8/2RQ4/4K3/5p2/4k3/8 w - - 0 1",
          "goal": "mate3",
          "line": [
            "Rc2+",
            "Ke1",
            "Qb7",
            "f2",
            "Qb1#"
          ]
        },
        {
          "id": "L5-3",
          "theme": "Forced mate in 3",
          "fen": "2k5/2pp4/5R2/3K4/4Q3/8/8/8 w - - 0 1",
          "goal": "mate3",
          "line": [
            "Qb1",
            "Kd8",
            "Qb8+",
            "Ke7",
            "Qf8#"
          ]
        },
        {
          "id": "L5-4",
          "theme": "Forced mate in 3",
          "fen": "2Q5/6K1/8/3p4/4k3/7R/8/8 w - - 0 1",
          "goal": "mate3",
          "line": [
            "Kf6",
            "Kd4",
            "Qc7",
            "Ke4",
            "Qe5#"
          ]
        }
      ]
    }
  ];

  global.CHESS_PUZZLES = LEVELS;
  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;

})(typeof window !== 'undefined' ? window : globalThis);
