# Learners Chess

An advanced, dependency-free chess game with a complete rules engine, a built-in AI opponent, and a puzzle trainer that earns you hints — playable in any modern browser.

## Play it

Open `index.html` in any browser. No build step, no server, no dependencies.

To host it online, enable **GitHub Pages** for this repository (Settings → Pages → deploy from the `main` branch) and the game will be live at `https://<your-username>.github.io/chess-game/`.

## Features

### Full rules engine (from scratch, zero libraries)
- All legal move generation with pins and checks handled correctly
- Castling (with all safety conditions), en passant, pawn promotion (Q/R/B/N)
- Checkmate, stalemate, threefold repetition, fifty-move rule, insufficient material
- Standard Algebraic Notation with proper disambiguation (`Nbd2`, `R1e4`, `exd5`, `O-O`, `Qh5#`)
- FEN import/export, full undo stack
- Verified with [perft](https://www.chessprogramming.org/Perft) against known node counts (start position, Kiwipete, and other standard test positions)

### AI opponent
- Negamax search with alpha-beta pruning and MVV-LVA move ordering
- Quiescence search to avoid shallow capture blunders
- Piece-square-table evaluation with tapered king tables and bishop-pair bonus
- **Five difficulty levels** — Beginner, Casual, Club, Strong, Expert — chosen in the New Game dialog before the game starts

### Level gating by total points
- Every settled game score is added to a running **total points** figure (shown on the panel, kept in the browser)
- A level closes once your total reaches its ceiling: **Level 1 at 5000, Level 2 at 10000, Level 3 at 30000, Level 4 at 50000** — Level 5 never closes, so a rising total pushes you up the levels
- Closed levels are struck through and disabled in the New Game dialog, with a note explaining why; a saved difficulty that has since closed is moved up to the lowest level still open

### Puzzle training (earn your hints)
- **20 puzzles in four levels, five per level** — every one a real position with a solution line, taken from [Chess.com](https://www.chess.com/daily)'s daily puzzles, [Lichess](https://lichess.org/training)'s openly licensed (CC0) puzzle set, and two classics from the connected knowledge base (Martin Gardner's chess chapter). Nothing is generated locally, and there are no multiple-choice questions.
- **A level unlocks as the match develops**, and when several are open the highest is used first:
  - **Level 1** — the base level, open from the opening
  - **Level 2** — unlocks once the queens are exchanged (both off the board)
  - **Level 3** — unlocks when you are two pawns down (or worse) in material
  - **Level 4** — unlocks while your king is in check
- Locked levels are struck through and unclickable in the trainer, with a note saying what unlocks each one; you can drop back to a lower open level at any time
- Play the solution on the board; the opponent's replies are played for you
- **Each puzzle can be solved once per match** — once solved it is locked and skipped
- **Puzzles and hints both reset after every match**, so the whole set (and the hints it earns) starts fresh each game
- **Hints are earned, not given:** each solved puzzle grants one hint credit, and the Hint button costs one credit. With none left, it opens the trainer.

### Learning platform shell
- A sidebar that switches between two views — **Play** and **Progress**
- **Progress** — total points, the current level with a meter to the next ceiling, puzzles solved and hints available, all read live from the browser store
- A light, editorial theme: serif headings, card-based surfaces and a calm navy accent

### Interface
- Drag-and-drop **and** tap/click-to-move (works on touch)
- Legal-move dots, capture rings, last-move and check highlights
- **Live evaluation bar:** a white fill for White's share of the position on a dark track for Black's, with a tick at the halfway mark; the number and a plain-English verdict ("You are better", "Engine is winning", "Level") are read from your side, a forced mate shows as **#3** and pegs the bar, and once the game ends it settles to **1-0** / **0-1** / **½**
- A **captured-material strip** under each player: the pieces that side has taken, grouped by piece with a count when there is more than one, highest value first, a green **+n** badge on whoever is ahead on material, and a hover tooltip spelling out the tally and its point value
- Move list in SAN with auto-scroll
- 10-minute clocks per side with time-forfeit detection, plus level-based time bonuses (see below)
- Undo (takes back both your move and the engine's reply)
- Promotion picker (with cancel), game-over and new-game dialogs
- Play as White, Black, or random side; board flip
- Engine strength is chosen before the game, in the New Game dialog
- A large board (up to ~720px) that scales with the window
- **Game points:** the evaluation of every position you pass through (the same figure as the eval bar) is accumulated live, then settled at the end — a **win multiplies** the total by the level's stake (×5 / ×10 / ×15 / ×20 / ×30) and **always pays positively**, so winning on a negative total flips it positive; a **loss divides** it by the same stake, a **draw leaves it as it is** (×1)
- Four board themes (Classic, Emerald, Ocean, Midnight)
- Synthesized sound effects (move, capture, castle, check, game end) via Web Audio
- Fully responsive layout for phones and desktops

### Time bonuses

Both sides start with 10 minutes. As the game goes on the clock is topped up
according to the chosen difficulty. Here one "move" is a single ply (one
player's turn), and each bonus goes to the side that just moved.

| Level | Bonus | Paid |
|---|---|---|
| 1 Beginner | +2 min | every move from move 11 on |
| 2 Casual | +10 min | every 5 moves after move 10 (moves 15, 20, …) |
| 3 Club | +30 min | every 10 moves after move 10 (moves 20, 30, …) |
| 4 Strong | +45 min | every 45 moves from the start |
| 5 Expert | +50 min | every 50 moves from the start |

You earn these bonuses at every level. The engine earns them only in levels 1
and 5 — in levels 2, 3 and 4 the computer gets no bonus, so a scheduled payout
that falls on the computer's turn is skipped. A green "+m:ss" flash on the
clock shows each top-up.

## Project structure

```
chess-game/
├── index.html              # page layout and modals
├── css/style.css           # all styling and themes
├── js/engine.js            # rules engine + AI + mate search (browser and Node)
├── js/puzzles.js           # 20 puzzles in four levels (Chess.com + Lichess + Gardner)
├── js/main.js              # UI, drag & drop, clocks, sounds, puzzle trainer
├── js/shell.js             # sidebar navigation + the Progress dashboard
├── tests/engine.test.js    # perft + rules + AI tests
└── tests/puzzles.test.js   # re-verifies every shipped puzzle
```

## Run the tests

```bash
node tests/engine.test.js
node tests/puzzles.test.js
```

## Tech notes

- The board is a flat `Int8Array(64)` (index 0 = a8), pieces signed by color — fast enough for a depth-3 alpha-beta search with quiescence in plain JavaScript.
- The engine module is UMD-style: the same file powers the browser game and the Node test suite.
- Every puzzle is a real position with a solution line — from Chess.com's daily puzzle feed, Lichess's CC0 puzzle set, and the connected knowledge base (Martin Gardner's chess chapter) — and every line is replayed by `tests/puzzles.test.js` on each run.
- The game-point maths lives in the engine as `Chess.Scoring` (`levelMultiplier(level)`, `finalScore(accumulated, outcome, level)`), and so does the puzzle-level rule (`puzzleLevelsAvailable(state, color)` / `puzzleLevel(state, color)`), so both are unit-tested rather than buried in the UI.
- One Gardner problem (Fabel's "Don't Mate in One") could not be reconstructed faithfully from the source figure and was left out rather than guessed at.

## License

MIT — see [LICENSE](LICENSE).
