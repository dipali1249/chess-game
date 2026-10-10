/* Royal Chess — built-in puzzle set.
   Every puzzle here comes from the connected knowledge base: Martin Gardner's
   chess chapter (the "Puzzle" collection). Nothing is generated locally.
   tests/puzzles.test.js re-checks the board puzzles on every run.

   kind:     "line"     — play the solution on the board.
             "question" — a multiple-choice question about the book's problem.
   player:   for "line" puzzles, the colour the solver plays.
   line:     the reference solution in SAN (the trainer accepts the book's line).
   choices / answer: the options and the index of the correct one. */
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
      "id": "G3",
      "theme": "Avoiding Checks",
      "source": "Martin Gardner, chess chapter \u2014 Problem 12.1",
      "kind": "question",
      "fen": "7n/8/8/8/8/8/8/K7 b - - 0 1",
      "question": "A lone knight (to move) chases your king, which sits in the corner. For how long can the king avoid being checked?",
      "choices": ["Forever", "About 6 moves", "About 12 moves", "It is checked at once"],
      "answer": 0,
      "explain": "Forever \u2014 head for the centre and always keep your king on the opposite colour to the knight. A knight changes colour on every move, so it can never check you. Only a corner can trap you."
    },
    {
      "id": "G4",
      "theme": "Twenty-Five Knights",
      "source": "Martin Gardner, chess chapter \u2014 Problem 12.4",
      "kind": "question",
      "question": "Every square of a 5\u00d75 board holds a knight. Can all 25 knights jump at once so that every square is still occupied?",
      "choices": ["Yes \u2014 it always works", "No \u2014 it is impossible", "Only if the corner knights stay put"],
      "answer": 1,
      "explain": "Impossible. A knight always lands on the opposite colour, but a 5\u00d75 board has 13 squares of one colour and only 12 of the other \u2014 so 13 knights cannot land on 12 squares."
    },
    {
      "id": "G5",
      "theme": "Maximising Moves",
      "source": "Martin Gardner, chess chapter \u2014 Problem 12.7",
      "kind": "question",
      "question": "Placed freely on an empty board, what is the greatest number of moves the eight pieces of one colour (no pawns) can have between them?",
      "choices": ["51", "74", "100", "128"],
      "answer": 2,
      "explain": "100. The Bezzel position gives exactly 100 moves, and E. Landau proved in 1899 that 100 is the maximum."
    },
    {
      "id": "G6",
      "theme": "Starting a Chess Game",
      "source": "Martin Gardner, chess chapter \u2014 Problem 12.9",
      "kind": "question",
      "question": "All 32 pieces are on the board, one per square; moving a piece to any empty square counts as one move. What is the largest number of moves that can ever be needed to reach the proper starting position?",
      "choices": ["33", "36", "40", "48"],
      "answer": 1,
      "explain": "36 moves \u2014 or 37 if Black must finish at the bottom with the queens on their own colours."
    },
    {
      "id": "G7",
      "theme": "Indian Chess Mystery",
      "source": "Martin Gardner, chess chapter \u2014 Problem 12.10",
      "kind": "question",
      "fen": "r1b1k2r/pppppppp/8/2N3N1/5n2/2n5/PPPPPPPP/1RBK1B1R w - - 0 1",
      "question": "The light pieces are in check. From the position alone, which side made the first move?",
      "choices": ["The light pieces", "The dark pieces"],
      "answer": 1,
      "explain": "The dark pieces. Smullyan's parity argument: the total number of moves made is odd, so the side that moved last (the light pieces, now in check) did not move first."
    }
  ];

  global.CHESS_PUZZLES = PUZZLES;
  if (typeof module !== 'undefined' && module.exports) module.exports = PUZZLES;

})(typeof window !== 'undefined' ? window : globalThis);
