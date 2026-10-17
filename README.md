# Learners Chess

An advanced, dependency-free chess game with a complete rules engine and a built-in AI opponent — playable in any modern browser. The puzzle trainer lives in its own repository, [learners-chess-puzzles](https://github.com/dipali1249/learners-chess-puzzles).

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
- **Six difficulty levels** — Beginner, Casual, Club, Strong, Expert and Masters — chosen in the New Game dialog before the game starts

### Level gating by total points
- Every settled game score is added to a running **total points** figure (shown on the panel, kept in the browser)
- A level closes once your total reaches its ceiling: **Level 1 at 5000, Level 2 at 10000, Level 3 at 30000, Level 4 at 50000** — Level 5 never closes, so a rising total pushes you up the levels
- **Level 6 (Masters) is the exception: it opens at 50000**, once levels 1–4 have closed, and never closes
- Closed levels are struck through and disabled in the New Game dialog, with a note explaining why; a saved difficulty that has since closed is moved up to the lowest level still open

### Level 6 — Masters: the greats' openings
- The engine opens with the repertoire of the world's best players, from a built-in book of **18 famous openings** — the Ruy Lopez, the Najdorf Sicilian, the King's Indian, the Queen's Gambit Declined, the Grünfeld, the Catalan and more
- It follows the book while the game stays in a known line (choosing among the openings that fit, so it varies from game to game), then plays at Expert strength
- The opening being played is **named under the board** — e.g. "Opening: Ruy Lopez" — with a short note on hover
- The book lives in the engine (`Chess.Openings`), and every line is replayed by `tests/engine.test.js`, which checks each move is legal

### Hints, earned from the game
- The **Hint** button costs one hint credit and highlights the engine's suggested move on the board
- **A hint is earned each time the match reaches a situation that unlocks a puzzle level** — the queens exchanged, two pawns down (or worse) in material, or your king in check — once per situation per match, with a short flash on the panel when it happens
- **A settled game also pays hints by result** — a win adds **3**, a draw adds **1**, and a loss takes **2** away (hints never drop below zero); the game-over dialog shows the change
- Hints reset at the start of every match
- The **Puzzles** button (and the Progress view) opens the puzzle trainer, which lives in its own repository: [learners-chess-puzzles](https://github.com/dipali1249/learners-chess-puzzles) — 72 puzzles in four levels, live at [dipali1249.github.io/learners-chess-puzzles](https://dipali1249.github.io/learners-chess-puzzles/)

### Learning platform shell
- A sidebar that switches between two views — **Play** and **Progress**
- **Progress** — total points, the current level with a meter to the next ceiling, and hints available, all read live from the browser store
- A light, editorial theme: serif headings, card-based surfaces and a calm navy accent

### Interface
- Drag-and-drop **and** tap/click-to-move (works on touch)
- Legal-move dots, capture rings, last-move and check highlights
- **Live evaluation bar:** a white fill for White's share of the position on a dark track for Black's, with a tick at the halfway mark; the number and a plain-English verdict ("You are better", "Engine is winning", "Level") are read from your side, a forced mate shows as **#3** and pegs the bar, and once the game ends it settles to **1-0** / **0-1** / **½**
- A **captured-material strip** under each player: the pieces that side has taken, grouped by piece with a count when there is more than one, highest value first, a green **+n** badge on whoever is ahead on material, and a hover tooltip spelling out the tally and its point value
- Move list in SAN with auto-scroll, and (at Masters) the opening name under the board
- 10-minute clocks per side with time-forfeit detection, plus level-based time bonuses (see below)
- Undo (takes back both your move and the engine's reply), capped at a share of the moves played so far — **50 / 40 / 30 / 20 / 10 / 5 %** at levels 1–6
- Promotion picker (with cancel), game-over and new-game dialogs
- Play as White, Black, or random side; board flip
- Engine strength is chosen before the game, in the New Game dialog
- A large board (up to ~720px) that scales with the window
- **Game points:** the evaluation of every position you pass through (the same figure as the eval bar) is accumulated live, then settled at the end — a **win multiplies** the total by the level's stake (×5 / ×10 / ×15 / ×20 / ×30 / ×40) and **always pays positively**, so winning on a negative total flips it positive; a **loss divides** it by the same stake, a **draw leaves it as it is** (×1)
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
| 6 Masters | +60 min | every 60 moves from the start |

You earn these bonuses at every level. The engine earns them only in levels 1,
5 and 6 — in levels 2, 3 and 4 the computer gets no bonus, so a scheduled payout
that falls on the computer's turn is skipped. A green "+m:ss" flash on the
clock shows each top-up.

## Project structure

```
chess-game/
├── index.html              # page layout and modals
├── css/style.css           # all styling and themes
├── js/engine.js            # rules engine + AI + mate search (browser and Node)
├── js/main.js              # UI, drag & drop, clocks, sounds, hints
├── js/shell.js             # sidebar navigation + the Progress dashboard
└── tests/engine.test.js    # perft + rules + AI tests
```

The puzzle set lives in its own repository — [learners-chess-puzzles](https://github.com/dipali1249/learners-chess-puzzles).

## Run the tests

```bash
node tests/engine.test.js
```

## Tech notes

- The board is a flat `Int8Array(64)` (index 0 = a8), pieces signed by color — fast enough for a depth-3 alpha-beta search with quiescence in plain JavaScript.
- The engine module is UMD-style: the same file powers the browser game and the Node test suite.
- The puzzle set (its data, its validator, and the page that plays it) lives in its own repository, [learners-chess-puzzles](https://github.com/dipali1249/learners-chess-puzzles); the game links to it rather than bundling it.
- The game-point maths lives in the engine as `Chess.Scoring` (`levelMultiplier(level)`, `finalScore(accumulated, outcome, level)`), and so does the puzzle-level rule (`puzzleLevelsAvailable(state, color)` / `puzzleLevel(state, color)`), so both are unit-tested rather than buried in the UI.
- One Gardner problem (Fabel's "Don't Mate in One") could not be reconstructed faithfully from the source figure and was left out rather than guessed at.

## License

MIT — see [LICENSE](LICENSE).
