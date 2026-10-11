/* ============ Royal Chess — UI & game flow ============ */
(function () {
  'use strict';

  const C = window.Chess;
  const GLYPH = { 1: '\u265F', 2: '\u265E', 3: '\u265D', 4: '\u265C', 5: '\u265B', 6: '\u265A' };
  const PIECE_NAME = { 1: 'pawn', 2: 'knight', 3: 'bishop', 4: 'rook', 5: 'queen', 6: 'king' };
  const VALS = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9, 6: 0 };

  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const statusEl = $('status');
  const movelistEl = $('movelist');
  const evalFillEl = $('eval-fill');
  const evalTextEl = $('eval-text');
  const gamePointsEl = $('game-points');
  const totalPointsEl = $('total-points');
  const scoreMultEl = $('score-mult');
  const gameoverScoreEl = $('gameover-score');
  const diffNoteEl = $('diff-note');
  const capturedTopEl = $('captured-top');
  const capturedBottomEl = $('captured-bottom');
  const clockTopEl = $('clock-top');
  const clockBottomEl = $('clock-bottom');
  const nameTopEl = $('name-top');
  const nameBottomEl = $('name-bottom');
  const avatarTopEl = $('avatar-top');
  const avatarBottomEl = $('avatar-bottom');
  const btnNew = $('btn-new');
  const btnUndo = $('btn-undo');
  const btnFlip = $('btn-flip');
  const btnHint = $('btn-hint');
  const btnSound = $('btn-sound');
  const themeSelect = $('theme-select');
  const promotionModal = $('promotion-modal');
  const promoRow = $('promo-row');
  const gameoverModal = $('gameover-modal');
  const gameoverTitle = $('gameover-title');
  const gameoverText = $('gameover-text');
  const newgameModal = $('newgame-modal');
  const segColor = $('seg-color');
  const segDiff = $('seg-diff');
  const puzzleModal = $('puzzle-modal');
  const puzzleBoardEl = $('puzzle-board');
  const puzzleAnswersEl = $('puzzle-answers');
  const puzzleLevelLabel = $('puzzle-level-label');
  const puzzleThemeEl = $('puzzle-theme');
  const puzzleStatusEl = $('puzzle-status');
  const puzzleProgressFill = $('puzzle-progress-fill');
  const puzzleProgressText = $('puzzle-progress-text');
  const puzzleHintsEl = $('puzzle-hints');
  const btnPuzzleNext = $('btn-puzzle-next');
  const btnPuzzleReset = $('btn-puzzle-reset');
  const btnPuzzleClose = $('btn-puzzle-close');
  const btnPuzzles = $('btn-puzzles');
  const hintCreditsEl = $('hint-credits');
  const puzzlePanelProgress = $('puzzle-panel-progress');

  // ---------- state ----------
  let game = new C.Game();
  let playerColor = 1;          // 1 white, -1 black
  let difficulty = 3;           // 1 Beginner .. 5 Expert
  let flipped = false;          // visual flip
  let selected = -1;
  let selectedMoves = [];
  let over = null;              // {over, result, reason}
  let gamePoints = 0;           // accumulated position points for this game
  let pointsHistory = [];       // one contribution per played ply (rolled back on undo)
  let totalPoints = 0;          // running total across games (gates the levels)
  let gameSettled = false;      // this game's score has been added to the running total
  let soundOn = true;
  let thinking = false;
  let hint = null;
  let clocks = { '1': 600, '-1': 600 };
  let sqEls = new Array(64);
  let dragState = null;
  let pendingPromo = null;
  let audioCtx = null;

  // ---- puzzle trainer state ----
  const PUZZLES = window.CHESS_PUZZLES || [];
  let hintCredits = 0;
  let solvedIds = {};
  let currentIndex = 0;
  let currentPuzzle = null;
  let puzzleGame = null;
  let puzzleSqEls = [];
  let puzzleSelected = -1;
  let puzzleMoves = [];
  let puzzlePhase = 'player';
  let puzzleStage = 'mate';
  let puzzlePlies = 0;
  let puzzleBusy = false;
  let puzzleLast = null;
  let puzzlePlayer = 1;        // the colour the solver plays in the current puzzle
  let puzzleFlipped = false;   // show the puzzle from the solver's side
  let puzzleLineIdx = 0;       // position in the stored line (goal 'line')

  init();

  function init() {
    buildBoard();
    bindEvents();
    loadProgress();
    markDifficultyButtons();
    updateHintUI();
    openModal(newgameModal);
    newGame(1, difficulty);
  }

  // ---------- board construction ----------
  function buildBoard() {
    boardEl.innerHTML = '';
    sqEls = new Array(64);
    for (let v = 0; v < 64; v++) {
      const sq = flipped ? 63 - v : v;
      const row = v >> 3, col = v & 7;
      const el = document.createElement('div');
      el.className = 'square ' + (((row + col) % 2 === 0) ? 'light' : 'dark');
      el.dataset.sq = sq;
      // coordinates
      if (col === 0) {
        const r = document.createElement('span');
        r.className = 'coord rank';
        r.textContent = 8 - row;
        el.appendChild(r);
      }
      if (row === 7) {
        const f = document.createElement('span');
        f.className = 'coord file';
        f.textContent = 'abcdefgh'[col];
        el.appendChild(f);
      }
      boardEl.appendChild(el);
      sqEls[sq] = el;
    }
    resizeBoard();
    renderPieces();
  }

  function resizeBoard() {
    const rect = boardEl.getBoundingClientRect();
    if (rect.width > 0) boardEl.style.fontSize = (rect.width / 8) * 0.78 + 'px';
  }
  window.addEventListener('resize', () => { resizeBoard(); resizePuzzleBoard(); });

  // ---------- rendering ----------
  function renderPieces() {
    const b = game.state.board;
    for (let sq = 0; sq < 64; sq++) {
      const el = sqEls[sq];
      const old = el.querySelector('.piece');
      if (old) old.remove();
      const p = b[sq];
      if (p) {
        const s = document.createElement('span');
        s.className = 'piece ' + (p > 0 ? 'white' : 'black');
        s.textContent = GLYPH[Math.abs(p)];
        el.appendChild(s);
      }
    }
  }

  function renderHighlights() {
    for (let sq = 0; sq < 64; sq++) {
      const el = sqEls[sq];
      el.classList.remove('last-from', 'last-to', 'selected', 'check', 'dot', 'capturable', 'hint-from', 'hint-to');
      el.removeAttribute('data-movable');
    }
    const hist = game.state.history;
    if (hist.length) {
      const last = hist[hist.length - 1].move;
      sqEls[last.from].classList.add('last-from');
      sqEls[last.to].classList.add('last-to');
    }
    if (selected >= 0) {
      sqEls[selected].classList.add('selected');
      for (const m of selectedMoves) {
        sqEls[m.to].classList.add(m.captured || m.flags === 'e' ? 'capturable' : 'dot');
      }
    }
    if (hint) {
      sqEls[hint.from].classList.add('hint-from');
      sqEls[hint.to].classList.add('hint-to');
    }
    if (!over && game.inCheck()) {
      sqEls[game.state.kings[game.state.turn > 0 ? 0 : 1]].classList.add('check');
    }
    // cursor affordance for own movable pieces
    if (!over && !thinking && game.state.turn === playerColor) {
      for (const m of game.moves()) sqEls[m.from].setAttribute('data-movable', '1');
    }
  }

  function renderMoveList() {
    const hist = game.state.history;
    movelistEl.innerHTML = '';
    if (!hist.length) {
      movelistEl.innerHTML = '<div class="empty">No moves yet</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < hist.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'mv-row';
      const no = document.createElement('div');
      no.className = 'mv-no';
      no.textContent = (i / 2 + 1) + '.';
      const w = document.createElement('div');
      w.className = 'mv-san';
      w.textContent = hist[i].move.san;
      const b = document.createElement('div');
      b.className = 'mv-san';
      if (hist[i + 1]) b.textContent = hist[i + 1].move.san;
      if (i === hist.length - 1) w.classList.add('active');
      if (i + 1 === hist.length - 1) b.classList.add('active');
      row.append(no, w, b);
      frag.appendChild(row);
    }
    movelistEl.appendChild(frag);
    movelistEl.scrollTop = movelistEl.scrollHeight;
  }

  function renderCaptured() {
    const hist = game.state.history;
    const byWhite = [], byBlack = [];
    let matW = 0, matB = 0;
    for (const h of hist) {
      const m = h.move;
      if (!m.captured) continue;
      const t = Math.abs(m.captured);
      if (m.captured < 0) { byWhite.push(GLYPH[t]); matW += VALS[t]; }
      else { byBlack.push(GLYPH[t]); matB += VALS[t]; }
    }
    const order = { '\u265B': 0, '\u265C': 1, '\u265D': 2, '\u265E': 3, '\u265F': 4 };
    const fmt = (arr, mat, oppMat) => {
      arr.sort((a, b2) => order[a] - order[b2]);
      let html = arr.join('');
      const diff = mat - oppMat;
      if (diff > 0) html += ' <span class="material-diff">+' + diff + '</span>';
      return html;
    };
    // top strip shows the opponent of playerColor
    if (playerColor === 1) {
      capturedTopEl.innerHTML = fmt(byBlack, matB, matW);
      capturedBottomEl.innerHTML = fmt(byWhite, matW, matB);
    } else {
      capturedTopEl.innerHTML = fmt(byWhite, matW, matB);
      capturedBottomEl.innerHTML = fmt(byBlack, matB, matW);
    }
  }

  function renderEval() {
    const ev = C.AI.evaluate(game.state) * playerColor; // from the player's perspective
    const clamped = Math.max(-1000, Math.min(1000, ev));
    evalFillEl.style.width = (50 + clamped / 20) + '%';
    const p = (ev / 100);
    evalTextEl.textContent = (p > 0 ? '+' : '') + p.toFixed(1);
  }

  // ---------- game points ----------
  function fmtPts(v) { return (v >= 0 ? '+' : '') + v.toFixed(1); }

  function updateScoreUI() {
    const m = C.Scoring.levelMultiplier(difficulty);
    gamePointsEl.textContent = fmtPts(gamePoints);
    gamePointsEl.classList.toggle('pos', gamePoints > 0.049);
    gamePointsEl.classList.toggle('neg', gamePoints < -0.049);
    totalPointsEl.textContent = fmtPts(totalPoints);
    totalPointsEl.classList.toggle('pos', totalPoints > 0.049);
    totalPointsEl.classList.toggle('neg', totalPoints < -0.049);
    scoreMultEl.textContent = 'Win \u00d7' + m + ' \u00b7 Loss \u00f7' + m + ' \u00b7 Draw \u00d71';
  }

  function setClockText(el, text) {
    const span = el.querySelector('.clock-time');
    if (span) span.textContent = text; else el.textContent = text;
  }

  function renderClocks() {
    const topColor = -playerColor;
    const top = clocks[String(topColor)];
    const bottom = clocks[String(playerColor)];
    setClockText(clockTopEl, fmtClock(top));
    setClockText(clockBottomEl, fmtClock(bottom));
    const active = game.state.turn;
    clockTopEl.classList.toggle('active', !over && active === topColor && game.state.history.length > 0);
    clockBottomEl.classList.toggle('active', !over && active === playerColor && game.state.history.length > 0);
    clockTopEl.classList.toggle('low', top <= 30);
    clockBottomEl.classList.toggle('low', bottom <= 30);
  }

  // ---------- time bonuses ----------
  // After the move just played, the level's schedule may hand the mover extra time.
  // The computer only collects these at levels 1 and 5, so other levels skip its turn.
  function applyTimeBonus() {
    const ply = game.state.history.length;        // plies played so far
    const mover = -game.state.turn;               // the side that just moved
    const isPlayer = mover === playerColor;
    if (!isPlayer && !C.Scoring.computerGetsBonus(difficulty)) return;
    const inc = C.Scoring.timeBonus(difficulty, ply);
    if (!inc) return;
    clocks[String(mover)] += inc;
    renderClocks();
    const badge = document.createElement('span');
    badge.className = 'clock-bonus';
    badge.textContent = '+' + fmtClock(inc);
    (isPlayer ? clockBottomEl : clockTopEl).appendChild(badge);
    setTimeout(() => badge.remove(), 1500);
  }

  function fmtClock(s) {
    s = Math.max(0, Math.ceil(s));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + String(sec).padStart(2, '0');
  }

  function reasonLabel(r) {
    switch (r) {
      case 'checkmate': return 'by checkmate';
      case 'timeout': return 'on time';
      case 'stalemate': return 'by stalemate';
      case 'fifty-move rule': return 'by the fifty-move rule';
      case 'insufficient material': return 'by insufficient material';
      case 'threefold repetition': return 'by threefold repetition';
      default: return '';
    }
  }

  function renderStatus() {
    statusEl.className = 'status';
    if (over) {
      statusEl.classList.add('over');
      if (over.result === 0) {
        statusEl.textContent = 'Draw ' + reasonLabel(over.reason);
      } else {
        const side = over.result === 1 ? 'White' : 'Black';
        statusEl.textContent = side + ' wins ' + reasonLabel(over.reason);
      }
      return;
    }
    if (thinking) {
      statusEl.classList.add('thinking');
      statusEl.textContent = 'Engine is thinking';
      return;
    }
    const side = game.state.turn === 1 ? 'White' : 'Black';
    if (game.inCheck()) {
      statusEl.classList.add('check');
      statusEl.textContent = 'Check \u2014 ' + side + ' must respond';
    } else {
      statusEl.textContent = side + ' to move';
    }
  }

  function renderButtons() {
    btnUndo.disabled = !game.state.history.length || thinking;
    btnHint.disabled = !!over || thinking || game.state.turn !== playerColor;
  }

  function syncAll() {
    renderPieces();
    renderHighlights();
    renderMoveList();
    renderCaptured();
    renderEval();
    renderClocks();
    renderStatus();
    renderButtons();
  }

  // ---------- sounds ----------
  function playSound(type) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const note = (freq, start, dur, wave, gain) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = wave || 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(gain || 0.15, t + start);
        g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(t + start);
        o.stop(t + start + dur + 0.02);
      };
      if (type === 'move') note(430, 0, 0.08, 'sine', 0.2);
      else if (type === 'capture') { note(190, 0, 0.11, 'triangle', 0.28); note(95, 0, 0.13, 'sine', 0.22); }
      else if (type === 'castle') { note(370, 0, 0.06, 'sine', 0.16); note(470, 0.08, 0.07, 'sine', 0.16); }
      else if (type === 'check') { note(720, 0, 0.09, 'square', 0.06); note(960, 0.11, 0.13, 'square', 0.06); }
      else if (type === 'select') note(610, 0, 0.03, 'sine', 0.06);
      else if (type === 'end') { note(523, 0, 0.16, 'sine', 0.16); note(659, 0.13, 0.16, 'sine', 0.16); note(784, 0.26, 0.3, 'sine', 0.16); }
    } catch (e) { /* audio unavailable */ }
  }

  // ---------- interaction ----------
  function selectSquare(sq) {
    selected = sq;
    selectedMoves = game.moves(sq);
    renderHighlights();
  }

  function clearSelection() {
    selected = -1;
    selectedMoves = [];
    renderHighlights();
  }

  function tryHumanMove(from, to) {
    const cands = game.moves().filter((m) => m.from === from && m.to === to);
    if (!cands.length) return false;
    if (cands.length > 1 && cands[0].promotion) {
      pendingPromo = cands;
      openPromotionModal();
      return true;
    }
    return performMove(from, to, 0);
  }

  function performMove(from, to, promo) {
    const done = game.move(from, to, promo);
    if (!done) return false;
    if (done.flags === 'k' || done.flags === 'q') playSound('castle');
    else if (done.captured) playSound('capture');
    else playSound('move');
    syncAll();
    // every position the game reaches adds its evaluation (from the player's side)
    const contribution = (C.AI.evaluate(game.state) * playerColor) / 100;
    gamePoints += contribution;
    pointsHistory.push(contribution);
    updateScoreUI();
    const info = game.isGameOver();
    if (info.over) {
      over = info;
      finishGame();
      return true;
    }
    applyTimeBonus();
    if (game.inCheck()) playSound('check');
    scheduleAI();
    return true;
  }

  function scheduleAI() {
    if (over || game.state.turn === playerColor) {
      thinking = false;
      syncAll();
      return;
    }
    thinking = true;
    renderStatus();
    renderButtons();
    renderHighlights();
    setTimeout(() => {
      const t0 = performance.now();
      const m = C.AI.search(game.state, difficulty);
      const wait = Math.max(0, 420 - (performance.now() - t0));
      setTimeout(() => {
        if (over || game.state.turn === playerColor) { thinking = false; return; }
        thinking = false;
        if (m) performMove(m.from, m.to, m.promotion || 0);
        else syncAll();
      }, wait);
    }, 80);
  }

  // ---------- drag & drop + click ----------
  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const sqEl = e.target.closest ? e.target.closest('.square') : null;
    if (!sqEl) return;
    const sq = +sqEl.dataset.sq;

    if (selected >= 0 && sq !== selected && selectedMoves.some((m) => m.to === sq)) {
      tryHumanMove(selected, sq);
      clearSelection();
      return;
    }

    if (over || thinking || game.state.turn !== playerColor) { clearSelection(); return; }

    const piece = game.state.board[sq];
    if (piece && (piece > 0) === (playerColor > 0)) {
      selectSquare(sq);
      playSound('select');
      beginDrag(e, sqEl);
    } else {
      clearSelection();
    }
  }

  function beginDrag(e, sqEl) {
    const pieceEl = sqEl.querySelector('.piece');
    if (!pieceEl) return;
    const rect = sqEl.getBoundingClientRect();
    const size = rect.width;
    const ghost = document.createElement('span');
    ghost.className = 'piece ghost ' + (pieceEl.classList.contains('white') ? 'white' : 'black');
    ghost.textContent = pieceEl.textContent;
    ghost.style.fontSize = size * 0.78 + 'px';
    ghost.style.width = size + 'px';
    ghost.style.height = size + 'px';
    document.body.appendChild(ghost);
    dragState = {
      from: +sqEl.dataset.sq,
      ghost,
      pieceEl,
      startX: e.clientX,
      startY: e.clientY,
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      moved: false
    };
    pieceEl.classList.add('dragging-origin');
    positionGhost(e.clientX, e.clientY);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    if (e.cancelable) e.preventDefault();
  }

  function positionGhost(x, y) {
    dragState.ghost.style.left = (x - dragState.dx) + 'px';
    dragState.ghost.style.top = (y - dragState.dy) + 'px';
  }

  function onPointerMove(e) {
    if (!dragState) return;
    if (Math.abs(e.clientX - dragState.startX) > 4 || Math.abs(e.clientY - dragState.startY) > 4) {
      dragState.moved = true;
    }
    positionGhost(e.clientX, e.clientY);
  }

  function onPointerUp(e) { endDrag(e.clientX, e.clientY, false); }
  function onPointerCancel() { endDrag(null, null, true); }

  function endDrag(x, y, cancelled) {
    if (!dragState) return;
    const d = dragState;
    dragState = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);
    d.ghost.remove();
    d.pieceEl.classList.remove('dragging-origin');
    if (cancelled || !d.moved) return; // click or interrupted gesture — snap back
    const el = document.elementFromPoint(x, y);
    const sqEl = el && el.closest ? el.closest('.square') : null;
    if (sqEl) {
      const to = +sqEl.dataset.sq;
      if (to !== d.from && selectedMoves.some((m) => m.to === to)) {
        tryHumanMove(d.from, to);
        clearSelection();
      }
    }
  }

  // ---------- promotion ----------
  function openPromotionModal() {
    const color = playerColor === 1 ? 'white' : 'black';
    promoRow.innerHTML = '';
    [5, 4, 3, 2].forEach((type) => {
      const b = document.createElement('button');
      b.className = 'promo-btn ' + (color === 'white' ? 'white-piece' : 'black-piece');
      b.textContent = GLYPH[type];
      b.title = PIECE_NAME[type];
      b.addEventListener('click', () => {
        closeModal(promotionModal);
        if (pendingPromo) {
          const from = pendingPromo[0].from, to = pendingPromo[0].to;
          pendingPromo = null;
          performMove(from, to, type);
        }
      });
      promoRow.appendChild(b);
    });
    openModal(promotionModal);
  }

  // ---------- game over ----------
  function renderGameScore() {
    const m = C.Scoring.levelMultiplier(difficulty);
    const outcome = over.result === 0 ? 0 : (over.result === playerColor ? 1 : -1);
    const final = C.Scoring.finalScore(gamePoints, outcome, difficulty);
    if (!gameSettled) {                 // bank this game's score once
      gameSettled = true;
      totalPoints += final;
      saveProgress();
      updateScoreUI();
    }
    const how = outcome > 0
      ? 'accumulated ' + fmtPts(gamePoints) + ' \u00d7' + m + ' for the win'
      : outcome < 0
        ? 'accumulated ' + fmtPts(gamePoints) + ' \u00f7' + m + ' for the loss'
        : 'accumulated ' + fmtPts(gamePoints) + ' \u00d71 for the draw';
    gameoverScoreEl.innerHTML = '<span class="final">' + fmtPts(final) + ' game points</span>' +
      '<span class="detail">' + how + '</span>';
  }

  function finishGame() {
    playSound('end');
    let title, text;
    if (over.result === 0) {
      title = 'Draw';
      gameoverTitle.className = 'draw';
      text = 'The game is drawn ' + reasonLabel(over.reason) + '.';
    } else {
      const playerWon = over.result === playerColor;
      title = playerWon ? 'You win' : 'Engine wins';
      gameoverTitle.className = playerWon ? 'win' : 'loss';
      const side = over.result === 1 ? 'White' : 'Black';
      text = side + ' wins ' + reasonLabel(over.reason) + '. ' +
        (playerWon ? 'Well played!' : 'Try again \u2014 undo a few moves or start a rematch.');
    }
    gameoverTitle.textContent = title;
    gameoverText.textContent = text;
    renderGameScore();
    resetPuzzles();               // the next match starts with the puzzles fresh again
    syncAll();
    setTimeout(() => openModal(gameoverModal), 350);
  }

  // ---------- new game ----------
  function newGame(color, diff) {
    playerColor = color;
    difficulty = diff;
    game = new C.Game();
    over = null;
    thinking = false;
    selected = -1;
    selectedMoves = [];
    hint = null;
    pendingPromo = null;
    clocks = { '1': 600, '-1': 600 };
    flipped = playerColor === -1;
    gamePoints = 0;
    pointsHistory = [];
    gameSettled = false;
    gameoverScoreEl.innerHTML = '';
    buildBoard();
    updateStrips();
    syncAll();
    updateScoreUI();
    scheduleAI();
  }

  function updateStrips() {
    const oppColor = playerColor === 1 ? 'White' : 'Black';
    const myColor = playerColor === 1 ? 'White' : 'Black';
    nameTopEl.textContent = 'Engine (' + oppColor + ')';
    nameBottomEl.textContent = 'You (' + myColor + ')';
    avatarTopEl.className = 'avatar ' + (playerColor === 1 ? 'black-avatar' : 'white-avatar');
    avatarTopEl.textContent = playerColor === 1 ? '\u265A' : '\u2654';
    avatarBottomEl.className = 'avatar ' + (playerColor === 1 ? 'white-avatar' : 'black-avatar');
    avatarBottomEl.textContent = playerColor === 1 ? '\u2654' : '\u265A';
  }

  // ---------- clock ----------
  setInterval(() => {
    if (over || !game.state.history.length) return;
    const t = game.state.turn;
    const key = String(t);
    clocks[key] = Math.max(0, clocks[key] - 0.25);
    if (clocks[key] === 0) {
      over = { over: true, result: -t, reason: 'timeout' };
      finishGame();
    }
    renderClocks();
  }, 250);

  // ---------- modals ----------
  function openModal(m) { m.classList.remove('hidden'); }
  function closeModal(m) { m.classList.add('hidden'); }

  function segValue(seg) {
    const active = seg.querySelector('button.active');
    return active ? active.dataset.value : null;
  }

  // ===================== puzzle trainer =====================
  function loadProgress() {
    try {
      const raw = window.localStorage.getItem('royalchess.progress');
      if (raw) {
        const p = JSON.parse(raw);
        hintCredits = p.hintCredits || 0;
        solvedIds = p.solvedIds || {};
        currentIndex = p.currentIndex || 0;
        difficulty = p.difficulty || 3;
        totalPoints = p.totalPoints || 0;
      }
    } catch (e) { /* storage unavailable */ }
    if (!C.Scoring.levelPlayable(difficulty, totalPoints)) {
      difficulty = C.Scoring.lowestPlayableLevel(totalPoints);
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem('royalchess.progress', JSON.stringify({
        hintCredits: hintCredits, solvedIds: solvedIds, currentIndex: currentIndex,
        difficulty: difficulty, totalPoints: totalPoints
      }));
    } catch (e) { /* ignore */ }
  }

  // every match ends with a fresh puzzle slate, so the whole set can be worked again
  function resetPuzzles() {
    solvedIds = {};
    hintCredits = 0;
    currentIndex = 0;
    saveProgress();
    updateHintUI();
  }

  function solvedCount() {
    return PUZZLES.filter((p) => solvedIds[p.id]).length;
  }

  // index of the next unsolved puzzle, searching forward from `start`
  function firstUnsolvedFrom(start) {
    for (let i = 0; i < PUZZLES.length; i++) {
      const idx = ((start + i) % PUZZLES.length + PUZZLES.length) % PUZZLES.length;
      if (!solvedIds[PUZZLES[idx].id]) return idx;
    }
    return -1;
  }

  function markDifficultyButtons() {
    const lowest = C.Scoring.lowestPlayableLevel(totalPoints);
    if (!C.Scoring.levelPlayable(difficulty, totalPoints)) difficulty = lowest;
    segDiff.querySelectorAll('button').forEach((b) => {
      const lvl = +b.dataset.value;
      const open = C.Scoring.levelPlayable(lvl, totalPoints);
      b.disabled = !open;
      b.title = open ? '' : 'Closed \u2014 your total points have passed this level';
      b.classList.toggle('active', open && lvl === difficulty);
    });
    if (diffNoteEl) {
      diffNoteEl.textContent = 'Total points ' + fmtPts(totalPoints) +
        (lowest > 1 ? ' \u2014 levels 1\u2013' + (lowest - 1) + ' are closed' : '') +
        '. Levels close at 100 / 300 / 1000 / 3000.';
    }
  }

  function updateHintUI() {
    const word = hintCredits === 1 ? ' hint' : ' hints';
    hintCreditsEl.textContent = hintCredits + word;
    btnHint.textContent = 'Hint (' + hintCredits + ')';
    puzzleHintsEl.textContent = hintCredits + word;
    const ps = PUZZLES;
    puzzlePanelProgress.textContent = solvedCount() + ' of ' + ps.length + ' solved';
  }

  // ---- puzzle board rendering ----
  function buildPuzzleBoard() {
    puzzleBoardEl.innerHTML = '';
    puzzleSqEls = new Array(64);
    for (let v = 0; v < 64; v++) {
      const sq = puzzleFlipped ? 63 - v : v;
      const row = v >> 3, col = v & 7;
      const el = document.createElement('div');
      el.className = 'square ' + (((row + col) % 2 === 0) ? 'light' : 'dark');
      el.dataset.sq = sq;
      if (col === 0) {
        const r = document.createElement('span');
        r.className = 'coord rank'; r.textContent = 8 - row;
        el.appendChild(r);
      }
      if (row === 7) {
        const f = document.createElement('span');
        f.className = 'coord file'; f.textContent = 'abcdefgh'[col];
        el.appendChild(f);
      }
      el.addEventListener('pointerdown', () => onPuzzleClick(sq));
      puzzleBoardEl.appendChild(el);
      puzzleSqEls[sq] = el;
    }
    resizePuzzleBoard();
  }

  function resizePuzzleBoard() {
    if (!puzzleBoardEl) return;
    const rect = puzzleBoardEl.getBoundingClientRect();
    if (rect.width > 0) puzzleBoardEl.style.fontSize = (rect.width / 8) * 0.78 + 'px';
  }

  function renderPuzzlePieces() {
    if (!puzzleGame) return;
    for (let sq = 0; sq < 64; sq++) {
      const el = puzzleSqEls[sq];
      if (!el) continue;
      const old = el.querySelector('.piece');
      if (old) old.remove();
      const p = puzzleGame.state.board[sq];
      if (p) {
        const s = document.createElement('span');
        s.className = 'piece ' + (p > 0 ? 'white' : 'black');
        s.textContent = GLYPH[Math.abs(p)];
        el.appendChild(s);
      }
    }
  }

  function renderPuzzleHighlights() {
    for (let sq = 0; sq < 64; sq++) {
      const el = puzzleSqEls[sq];
      if (!el) continue;
      el.classList.remove('selected', 'dot', 'capturable', 'last-from', 'last-to', 'check');
    }
    if (!puzzleGame) return;
    if (puzzleLast) {
      puzzleSqEls[puzzleLast.from].classList.add('last-from');
      puzzleSqEls[puzzleLast.to].classList.add('last-to');
    }
    if (puzzleSelected >= 0) {
      puzzleSqEls[puzzleSelected].classList.add('selected');
      for (const m of puzzleMoves) puzzleSqEls[m.to].classList.add(m.captured ? 'capturable' : 'dot');
    }
    if (currentPuzzle && currentPuzzle.kind === 'line' && puzzleGame.inCheck()) {
      puzzleSqEls[puzzleGame.state.kings[puzzleGame.state.turn > 0 ? 0 : 1]].classList.add('check');
    }
  }

  function renderPuzzle() { renderPuzzlePieces(); renderPuzzleHighlights(); }

  function puzzleStatus(msg, cls) {
    puzzleStatusEl.className = 'puzzle-status' + (cls ? ' ' + cls : '');
    puzzleStatusEl.textContent = msg;
  }

  // ---- puzzle flow ----
  function openPuzzles() {
    if (!PUZZLES.length) return;
    if (!puzzleBoardEl.childElementCount) buildPuzzleBoard();
    closeModal(newgameModal);
    closeModal(gameoverModal);
    openModal(puzzleModal);
    resizePuzzleBoard();
    const idx = firstUnsolvedFrom(currentIndex);
    if (idx < 0) { showAllSolved(); return; }
    loadPuzzle(idx);
  }

  // ---- the answers for a 'question' puzzle (none ship any more, kept for completeness) ----
  function renderPuzzleAnswers() {
    puzzleAnswersEl.innerHTML = '';
    const p = currentPuzzle;
    if (!p || p.kind !== 'question' || !p.choices) return;
    p.choices.forEach((text, i) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = text;
      b.addEventListener('click', () => attemptAnswer(i, b));
      puzzleAnswersEl.appendChild(b);
    });
  }

  function lockAnswers(lock) {
    puzzleAnswersEl.querySelectorAll('button').forEach((b) => { b.disabled = lock; });
  }

  function attemptAnswer(index, btn) {
    if (!currentPuzzle || currentPuzzle.kind !== 'question') return;
    if (puzzlePhase !== 'player') return;
    if (index === currentPuzzle.answer) {
      btn.classList.add('correct');
      lockAnswers(true);
      solvePuzzle();
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      puzzleStatus('Not quite \u2014 try again', 'wrong');
      puzzleAnswersEl.classList.add('puzzle-shake');
      setTimeout(() => puzzleAnswersEl.classList.remove('puzzle-shake'), 320);
    }
  }

  function showAllSolved() {
    currentPuzzle = null;
    puzzleGame = null;
    puzzlePhase = 'done';
    puzzleAnswersEl.innerHTML = '';
    puzzleBoardEl.innerHTML = '';
    puzzleLevelLabel.textContent = 'All done';
    puzzleThemeEl.textContent = 'Every puzzle in the set has been solved.';
    puzzleStatus('All ' + PUZZLES.length + ' puzzles solved \u2014 well played!', 'solved');
    puzzleProgressText.textContent = 'Complete';
    puzzleProgressFill.style.width = '100%';
    btnPuzzleNext.disabled = true;
  }

  function loadPuzzle(index) {
    if (index < 0 || index >= PUZZLES.length) return;
    const p = PUZZLES[index];
    const solved = !!solvedIds[p.id];
    currentIndex = index;
    currentPuzzle = p;
    puzzleGame = p.fen ? new C.Game(p.fen) : null;
    puzzleSelected = -1;
    puzzleMoves = [];
    puzzleLast = null;
    puzzleBusy = false;
    puzzlePhase = solved ? 'solved' : 'player';
    puzzleStage = p.kind;
    puzzlePlies = 0;
    puzzleLineIdx = 0;
    puzzlePlayer = p.player === 'b' ? -1 : (p.player === 'w' ? 1 : (puzzleGame ? puzzleGame.state.turn : 1));
    puzzleFlipped = puzzlePlayer === -1;
    const side = puzzlePlayer === 1 ? 'White' : 'Black';
    puzzleLevelLabel.textContent = p.source || 'Puzzle';
    puzzleThemeEl.textContent = p.theme + (p.note ? ' \u2014 ' + p.note : '') +
      (p.kind === 'question' ? ' ' + p.question : '');
    puzzleProgressText.textContent = 'Puzzle ' + (index + 1) + ' of ' + PUZZLES.length;
    puzzleProgressFill.style.width = (solvedCount() / PUZZLES.length * 100) + '%';
    btnPuzzleNext.disabled = false;
    buildPuzzleBoard();
    renderPuzzleAnswers();
    renderPuzzle();
    if (solved) {
      puzzleStatus('Solved \u2014 this one is done.', 'solved');
      lockAnswers(true);
    } else if (p.kind === 'question') {
      puzzleStatus('Choose an answer', null);
    } else {
      puzzleStatus(side + ' to move \u2014 play the winning line', null);
    }
    updateHintUI();
    // 'line' puzzles can start with the opponent to move: play their move for them
    if (!solved && p.kind === 'line' && puzzleGame && puzzleGame.state.turn !== puzzlePlayer) {
      puzzleBusy = true;
      puzzleStatus('Opponent plays \u2014 watch', 'good');
      setTimeout(() => {
        playLineMove();
        puzzleBusy = false;
        if (puzzleLineIdx >= p.line.length) { solvePuzzle(); return; }
        puzzleStatus(side + ' to move \u2014 play the winning line', null);
        renderPuzzle();
      }, 600);
    }
  }

  function onPuzzleClick(sq) {
    if (!puzzleGame || !currentPuzzle || currentPuzzle.kind !== 'line') return;
    if (puzzleBusy || puzzlePhase !== 'player') return;
    if (puzzleGame.state.turn !== puzzlePlayer) return;   // only the solver's moves
    if (puzzleSelected >= 0 && puzzleMoves.some((m) => m.to === sq)) {
      attemptPuzzleMove(puzzleSelected, sq);
      return;
    }
    const p = puzzleGame.state.board[sq];
    if (p && (p > 0) === (puzzlePlayer > 0)) {
      puzzleSelected = sq;
      puzzleMoves = puzzleGame.moves(sq);
    } else {
      puzzleSelected = -1;
      puzzleMoves = [];
    }
    renderPuzzleHighlights();
  }

  function knightAttacksSq(sq) {
    const r = sq >> 3, c = sq & 7, out = [];
    const D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of D) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) out.push(rr * 8 + cc);
    }
    return out;
  }

  function blackRookSq() {
    for (let i = 0; i < 64; i++) if (puzzleGame.state.board[i] === -4) return i;
    return -1;
  }

  // play the next stored move (used by the 'line' puzzles for the opponent's replies)
  function playLineMove() {
    if (!currentPuzzle || !currentPuzzle.line) return;
    const san = currentPuzzle.line[puzzleLineIdx];
    if (!san) return;
    for (const m of puzzleGame.moves()) {
      puzzleGame.move(m.from, m.to, m.promotion || 0);
      const got = puzzleGame.state.history[puzzleGame.state.history.length - 1].move.san;
      puzzleGame.undo();
      if (got === san) {
        puzzleGame.move(m.from, m.to, m.promotion || 0);
        puzzleLast = { from: m.from, to: m.to };
        puzzleLineIdx++;
        playSound('move');
        renderPuzzle();
        return;
      }
    }
  }

  function attemptPuzzleMove(from, to) {
    const cands = puzzleGame.moves().filter((m) => m.from === from && m.to === to);
    if (!cands.length) return;
    const promo = cands.length > 1 ? 5 : (cands[0].promotion || 0);   // auto-queen in puzzles
    const goal = currentPuzzle.kind;
    const rookBefore = goal === 'winrook' ? blackRookSq() : -1;

    puzzleGame.move(from, to, promo);
    puzzleLast = { from: from, to: to };
    puzzleSelected = -1;
    puzzleMoves = [];
    renderPuzzle();

    if (goal === 'line') {
      const played = puzzleGame.state.history[puzzleGame.state.history.length - 1].move.san;
      if (played !== currentPuzzle.line[puzzleLineIdx]) return puzzleWrong();
      puzzleLineIdx++;
      if (puzzleLineIdx >= currentPuzzle.line.length) { solvePuzzle(); return; }
      puzzleBusy = true;
      puzzleStatus('Correct \u2014 keep going', 'good');
      setTimeout(() => {
        playLineMove();
        puzzleBusy = false;
        if (puzzleLineIdx >= currentPuzzle.line.length) { solvePuzzle(); return; }
        puzzleStatus('Your move \u2014 keep going', 'good');
        renderPuzzle();
      }, 420);
      return;
    }

    if (goal === 'winrook') {
      if (puzzleStage === 'fork') {
        const m = puzzleGame.state.history[puzzleGame.state.history.length - 1].move;
        const forked = Math.abs(m.piece) === 2 && puzzleGame.inCheck() &&
          knightAttacksSq(to).includes(rookBefore);
        if (!forked) return puzzleWrong();
        puzzleStage = 'capture';
        puzzleBusy = true;
        puzzleStatus('Fork! \u2014 now win the rook', 'good');
        setTimeout(() => {
          playOpponentReply();
          puzzleBusy = false;
          puzzleStatus('Now take the rook', 'good');
          renderPuzzle();
        }, 420);
        return;
      }
      if (to !== rookBefore) return puzzleWrong();      // must actually capture the rook
      solvePuzzle();
      return;
    }

    // mate puzzles
    if (puzzleGame.moves().length === 0) {
      if (puzzleGame.inCheck()) { solvePuzzle(); return; }
      return puzzleWrong();                             // stalemate
    }
    if (!C.AI.mateWithin(puzzleGame.state, puzzlePlies - 1)) return puzzleWrong();
    puzzleBusy = true;
    puzzleStatus('Correct! \u2014 the engine replies\u2026', 'good');
    setTimeout(() => {
      playOpponentReply();
      puzzlePlies -= 2;
      puzzleBusy = false;
      puzzleStatus('Your move \u2014 keep going', 'good');
      renderPuzzle();
    }, 420);
  }

  function puzzleWrong() {
    puzzleGame.undo();
    puzzleLast = null;
    puzzleSelected = -1;
    puzzleMoves = [];
    renderPuzzle();
    puzzleStatus('Not the move \u2014 try again', 'wrong');
    puzzleBoardEl.classList.add('puzzle-shake');
    setTimeout(() => puzzleBoardEl.classList.remove('puzzle-shake'), 320);
  }

  function playOpponentReply() {
    const replies = puzzleGame.moves();
    if (!replies.length) return;
    let best = replies[0], bestScore = -Infinity;
    for (const r of replies) {
      puzzleGame.move(r.from, r.to, r.promotion || 0);
      const score = currentPuzzle.kind === 'winrook'
        ? -C.AI.evaluate(puzzleGame.state)               // black's point of view
        : C.AI.mateIn(puzzleGame.state, 4);              // longest defence
      puzzleGame.undo();
      if (score > bestScore) { bestScore = score; best = r; }
    }
    puzzleGame.move(best.from, best.to, best.promotion || 0);
    puzzleLast = { from: best.from, to: best.to };
    playSound('move');
    renderPuzzle();
  }

  function solvePuzzle() {
    if (!currentPuzzle) return;
    puzzlePhase = 'solved';
    const already = !!solvedIds[currentPuzzle.id];
    let msg = already ? 'Already solved' : 'Solved! +1 hint earned (' + (hintCredits + 1) + ' total)';
    if (!already) {
      solvedIds[currentPuzzle.id] = true;
      hintCredits++;
      saveProgress();
    }
    if (currentPuzzle.explain) msg = 'Solved! ' + currentPuzzle.explain;
    playSound('end');
    btnPuzzleNext.disabled = false;
    puzzleStatus(msg, 'solved');
    puzzleProgressFill.style.width = (solvedCount() / PUZZLES.length * 100) + '%';
    renderPuzzle();
    updateHintUI();
  }

  function nextPuzzle() {
    const idx = firstUnsolvedFrom(currentIndex + 1);
    if (idx < 0) { showAllSolved(); return; }
    loadPuzzle(idx);
  }

  // ---------- events ----------
  function bindEvents() {
    boardEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('contextmenu', (e) => {
      if (dragState) e.preventDefault();
    });

    btnNew.addEventListener('click', () => { markDifficultyButtons(); openModal(newgameModal); });
    $('btn-cancel-new').addEventListener('click', () => closeModal(newgameModal));

    [segColor, segDiff].forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b || b.disabled) return;      // closed levels can't be picked
        seg.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    $('btn-start').addEventListener('click', () => {
      let color = segValue(segColor);
      if (color === 'r') color = Math.random() < 0.5 ? 'w' : 'b';
      difficulty = +segValue(segDiff);
      if (!C.Scoring.levelPlayable(difficulty, totalPoints)) difficulty = C.Scoring.lowestPlayableLevel(totalPoints);
      saveProgress();
      closeModal(newgameModal);
      closeModal(gameoverModal);
      newGame(color === 'w' ? 1 : -1, difficulty);
    });

    btnUndo.addEventListener('click', () => {
      if (thinking || !game.state.history.length) return;
      closeModal(gameoverModal);
      closeModal(promotionModal);
      pendingPromo = null;
      over = null;
      hint = null;
      game.undo();
      if (game.state.turn !== playerColor && game.state.history.length) game.undo();
      // keep the running total in step with the moves still on the board
      while (pointsHistory.length > game.state.history.length) gamePoints -= pointsHistory.pop();
      updateScoreUI();
      syncAll();
      scheduleAI();
    });

    btnFlip.addEventListener('click', () => {
      flipped = !flipped;
      buildBoard();
      syncAll();
    });

    btnHint.addEventListener('click', () => {
      if (over || thinking || game.state.turn !== playerColor) return;
      if (hintCredits <= 0) {
        statusEl.textContent = 'Solve a puzzle to earn a hint';
        openPuzzles();
        return;
      }
      const m = C.AI.search(game.state, 2);
      if (!m) return;
      hintCredits--;
      saveProgress();
      updateHintUI();
      hint = m;
      renderHighlights();
      setTimeout(() => { hint = null; renderHighlights(); }, 2600);
    });

    btnSound.addEventListener('click', () => {
      soundOn = !soundOn;
      btnSound.textContent = 'Sound: ' + (soundOn ? 'on' : 'off');
    });

    themeSelect.addEventListener('change', () => {
      document.body.dataset.theme = themeSelect.value;
    });

    $('btn-cancel-promo').addEventListener('click', () => {
      closeModal(promotionModal);
      pendingPromo = null;
      clearSelection();
    });

    btnPuzzles.addEventListener('click', openPuzzles);
    btnPuzzleClose.addEventListener('click', () => closeModal(puzzleModal));
    btnPuzzleReset.addEventListener('click', () => {
      if (!currentPuzzle || solvedIds[currentPuzzle.id]) return;
      loadPuzzle(currentIndex);
    });
    btnPuzzleNext.addEventListener('click', nextPuzzle);

    $('btn-rematch').addEventListener('click', () => {
      closeModal(gameoverModal);
      openModal(newgameModal);
    });
    $('btn-close-gameover').addEventListener('click', () => closeModal(gameoverModal));
  }
})();
