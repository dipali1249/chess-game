# Royal Chess

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

### Puzzle training (earn your hints)
- **Every puzzle comes from the connected knowledge base** (Martin Gardner's chess chapter) — nothing is generated locally
- No levels: one flat set, worked through in order
- Board puzzles ask you to play the book's line; the rest are the book's own chess questions
- **Each puzzle can be solved once.** Once solved it is locked and skipped — it can never be solved again in that session
- **Hints are earned, not given:** each solved puzzle grants one hint credit, and the Hint button costs one credit. With none left, it opens the trainer.

### Interface
- Drag-and-drop **and** tap/click-to-move (works on touch)
- Legal-move dots, capture rings, last-move and check highlights
- Live evaluation bar (from your side) and material captured display
- Move list in SAN with auto-scroll
- 10-minute clocks per side with time-forfeit detection
- Undo (takes back both your move and the engine's reply)
- Promotion picker (with cancel), game-over and new-game dialogs
- Play as White, Black, or random side; board flip
- Engine strength is chosen before the game, in the New Game dialog
- A large board (up to 860px) that scales with the window
- Four board themes (Classic, Emerald, Ocean, Midnight)
- Synthesized sound effects (move, capture, castle, check, game end) via Web Audio
- Fully responsive layout for phones and desktops

## Project structure

```
chess-game/
├── index.html              # page layout and modals
├── css/style.css           # all styling and themes
├── js/engine.js            # rules engine + AI + mate search (browser and Node)
├── js/puzzles.js           # the knowledge-base puzzle set (flat, no levels)
├── js/main.js              # UI, drag & drop, clocks, sounds, puzzle trainer
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
- Every puzzle ships from the connected knowledge base (Martin Gardner's chess chapter) and is re-checked by `tests/puzzles.test.js`. The chapter's board positions are played on the board; its logic problems are posed as multiple-choice questions with the book's own answers.
- One Gardner problem (Fabel's "Don't Mate in One") could not be reconstructed faithfully from the source figure and was left out rather than guessed at.

## License

MIT — see [LICENSE](LICENSE).
