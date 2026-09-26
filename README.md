# Royal Chess

An advanced, dependency-free chess game with a complete rules engine and a built-in AI opponent — playable in any modern browser.

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
- Three difficulty levels: Easy / Medium / Hard

### Interface
- Drag-and-drop **and** tap/click-to-move (works on touch)
- Legal-move dots, capture rings, last-move and check highlights
- Live evaluation bar and material captured display
- Move list in SAN with auto-scroll
- 10-minute clocks per side with time-forfeit detection
- Hint button (engine suggests a move)
- Undo (takes back both your move and the engine's reply)
- Promotion picker, game-over and new-game dialogs
- Play as White, Black, or random side; board flip
- Four board themes (Classic, Emerald, Ocean, Midnight)
- Synthesized sound effects (move, capture, castle, check, game end) via Web Audio
- Fully responsive layout for phones and desktops

## Project structure

```
chess-game/
├── index.html            # page layout and modals
├── css/style.css         # all styling and themes
├── js/engine.js          # rules engine + AI (runs in browser and Node)
├── js/main.js            # UI, drag & drop, clocks, sounds
└── tests/engine.test.js  # perft + rules tests (run with Node)
```

## Run the tests

```bash
node tests/engine.test.js
```

## Tech notes

- The board is a flat `Int8Array(64)` (index 0 = a8), pieces signed by color — fast enough for a depth-3 alpha-beta search with quiescence in plain JavaScript.
- The engine module is UMD-style: the same file powers the browser game and the Node test suite.

## License

MIT — see [LICENSE](LICENSE).
