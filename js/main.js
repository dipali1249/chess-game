/* ============ Learners Chess — UI & game flow ============ */
(function () {
  'use strict';

  const C = window.Chess;
  const GLYPH = { 1: '\u265F', 2: '\u265E', 3: '\u265D', 4: '\u265C', 5: '\u265B', 6: '\u265A' };
  const PIECE_NAME = { 1: 'pawn', 2: 'knight', 3: 'bishop', 4: 'rook', 5: 'queen', 6: 'king' };
  const VALS = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9, 6: 0 };
  const CAP_ORDER = [5, 4, 3, 2, 1];        // captured material, highest value first
  const PIECE_WORD = { 1: 'pawn', 2: 'knight', 3: 'bishop', 4: 'rook', 5: 'queen' };

  // ---- progress storage (saved in this browser) ----
  const PROGRESS_KEY = 'learnerschess.progress';
  const LEGACY_PROGRESS_KEY = 'royalchess.progress';   // carried over once, from before the rename

  const $ = (id) => document.getElementById(id);
  const boardEl = $('board');
  const statusEl = $('status');
  const movelistEl = $('movelist');
  const evalWrapEl = $('eval-wrap');
  const evalFillEl = $('eval-fill');
  const evalTextEl = $('eval-text');
  const evalVerdictEl = $('eval-verdict');
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
  const hintCreditsEl = $('hint-credits');

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
  let mateKey = null, mateVal = 0;   // cached per position: mateIn is a real search

  // ---- hints (earned when a puzzle situation arises) ----
  let hintCredits = 0;
  let grantedLevels = {};      // puzzle levels already rewarded this match

  init();

  function init() {
    migrateProgress();
    buildBoard();
    bindEvents();
    loadProgress();
    markDifficultyButtons();
    updateHintUI();
    openModal(newgameModal);
    newGame(1, difficulty);
  }

  // progress saved under the old key carries over once, so the rename loses nothing
  function migrateProgress() {
    try {
      const old = window.localStorage.getItem(LEGACY_PROGRESS_KEY);
      if (old && !window.localStorage.getItem(PROGRESS_KEY)) {
        window.localStorage.setItem(PROGRESS_KEY, old);
      }
    } catch (e) { /* ignore */ }
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
  window.addEventListener('resize', resizeBoard);

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

  // ---------- captured material ----------
  // Each strip shows what that side has taken, grouped by piece with a count, and
  // the side that is ahead on material carries a "+n" badge.
  function capturedChips(counts) {
    let html = '';
    for (const t of CAP_ORDER) {
      const n = counts[t] || 0;
      if (!n) continue;
      html += '<span class="cap-chip">' + GLYPH[t] + (n > 1 ? '<i>' + n + '</i>' : '') + '</span>';
    }
    return html || '<span class="cap-empty">\u2014</span>';
  }

  function capturedTitle(counts, value) {
    const parts = [];
    for (const t of CAP_ORDER) {
      const n = counts[t] || 0;
      if (n) parts.push(n + ' ' + PIECE_WORD[t] + (n > 1 ? 's' : ''));
    }
    if (!parts.length) return 'Nothing captured yet';
    return 'Captured ' + parts.join(', ') + ' \u2014 ' + value + ' points';
  }

  function renderCaptured() {
    const hist = game.state.history;
    const byWhite = {}, byBlack = {};
    let matW = 0, matB = 0;
    for (const h of hist) {
      const m = h.move;
      if (!m.captured) continue;
      const t = Math.abs(m.captured);
      if (m.captured < 0) { byWhite[t] = (byWhite[t] || 0) + 1; matW += VALS[t]; }
      else { byBlack[t] = (byBlack[t] || 0) + 1; matB += VALS[t]; }
    }
    // the top strip belongs to the engine, the bottom one to the player
    const topCounts = playerColor === 1 ? byBlack : byWhite;
    const botCounts = playerColor === 1 ? byWhite : byBlack;
    const topMat = playerColor === 1 ? matB : matW;
    const botMat = playerColor === 1 ? matW : matB;
    const lead = botMat - topMat;                 // positive while the player is ahead
    const badge = (v) => (v > 0 ? '<span class="material-diff">+' + v + '</span>' : '');
    capturedTopEl.innerHTML = capturedChips(topCounts) + badge(-lead);
    capturedBottomEl.innerHTML = capturedChips(botCounts) + badge(lead);
    capturedTopEl.title = capturedTitle(topCounts, topMat);
    capturedBottomEl.title = capturedTitle(botCounts, botMat);
  }

  // The bar reads the way a board does: a white fill for White's share of the
  // position on a dark track for Black's, with a tick at the halfway mark. The
  // number and the verdict are from the player's side, and a forced mate overrides
  // the material count. The mate search is cached per position (see mateKey above).
  function whiteMateIn2(st, key) {
    if (key === mateKey) return mateVal;
    const n = C.AI.mateIn(st, 2);              // mate for whoever is to move
    mateVal = n ? n * (st.turn === 1 ? 1 : -1) : 0;
    mateKey = key;
    return mateVal;
  }

  function renderEval() {
    const st = game.state;
    if (over) {                                // settled: show the result, not the count
      if (over.result === 0) {
        evalFillEl.style.width = '50%';
        evalFillEl.classList.remove('mate');
        evalTextEl.textContent = '\u00bd';
        evalVerdictEl.textContent = 'Draw';
        evalVerdictEl.className = 'eval-verdict';
        evalWrapEl.title = 'Draw ' + reasonLabel(over.reason);
        return;
      }
      const whiteWon = over.result === 1;
      const iWon = over.result === playerColor;
      evalFillEl.style.width = whiteWon ? '100%' : '0%';
      evalFillEl.classList.add('mate');
      evalTextEl.textContent = whiteWon ? '1-0' : '0-1';
      evalVerdictEl.textContent = iWon ? 'You won' : 'Engine won';
      evalVerdictEl.className = 'eval-verdict ' + (iWon ? 'good' : 'bad');
      evalWrapEl.title = (whiteWon ? 'White' : 'Black') + ' wins ' + reasonLabel(over.reason);
      return;
    }
    const white = C.AI.evaluate(st);           // centipawns, White's point of view
    const mine = white * playerColor;          // ... and from the player's side
    const mateWhite = whiteMateIn2(st, game.fen());
    const mateMine = mateWhite * playerColor;
    const share = mateWhite ? (mateWhite > 0 ? 100 : 0)
      : 50 + Math.max(-1000, Math.min(1000, white)) / 20;
    evalFillEl.style.width = Math.max(0, Math.min(100, share)) + '%';
    evalFillEl.classList.toggle('mate', !!mateWhite);
    const p = mine / 100;
    const shown = mateWhite ? '#' + Math.abs(mateWhite) : (mine >= 0 ? '+' : '') + p.toFixed(1);
    evalTextEl.textContent = shown;
    let verdict, cls;
    if (mateMine) { verdict = mateMine > 0 ? 'Mate for you' : 'Mate for the engine'; cls = 'mate'; }
    else if (p >= 5) { verdict = 'You are winning'; cls = 'good'; }
    else if (p >= 2) { verdict = 'You are better'; cls = 'good'; }
    else if (p > 0.4) { verdict = 'You are slightly better'; cls = 'good'; }
    else if (p <= -5) { verdict = 'Engine is winning'; cls = 'bad'; }
    else if (p <= -2) { verdict = 'Engine is better'; cls = 'bad'; }
    else if (p < -0.4) { verdict = 'Engine is slightly better'; cls = 'bad'; }
    else { verdict = 'Level'; cls = ''; }
    evalVerdictEl.textContent = verdict;
    evalVerdictEl.className = 'eval-verdict' + (cls ? ' ' + cls : '');
    evalWrapEl.title = 'Evaluation ' + shown + ' \u2014 ' + verdict.toLowerCase();
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
    grantSituationHints();
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
    const hintDelta = outcome > 0 ? 3 : outcome === 0 ? 1 : -2;   // win +3, draw +1, loss -2
    const hintsBefore = hintCredits;
    if (!gameSettled) {                 // bank this game's score once
      gameSettled = true;
      totalPoints += final;
      hintCredits = Math.max(0, hintCredits + hintDelta);   // hints never drop below zero
      saveProgress();
      updateScoreUI();
      updateHintUI();
    }
    const how = outcome > 0
      ? 'accumulated ' + fmtPts(gamePoints) + ' \u00d7' + m + ' for the win'
      : outcome < 0
        ? 'accumulated ' + fmtPts(gamePoints) + ' \u00f7' + m + ' for the loss'
        : 'accumulated ' + fmtPts(gamePoints) + ' \u00d71 for the draw';
    // the hint line never prints a negative number — say the change in words
    const hintsGained = Math.max(0, hintCredits - hintsBefore);
    const hintsLost = Math.max(0, hintsBefore - hintCredits);
    const hintWord = (n) => (n === 1 ? ' hint' : ' hints');
    const hintText = hintsGained > 0
      ? '+' + hintsGained + hintWord(hintsGained) + ' for the ' + (outcome > 0 ? 'win' : 'draw')
      : hintsLost > 0
        ? hintsLost + hintWord(hintsLost) + ' lost'
        : 'no hints lost';
    gameoverScoreEl.innerHTML = '<span class="final">' + fmtPts(final) + ' game points</span>' +
      '<span class="detail">' + how + '</span>' +
      '<span class="detail">' + hintText + '</span>';
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
    grantedLevels = {};           // hints are re-earned in each match
    gameoverScoreEl.innerHTML = '';
    buildBoard();
    updateStrips();
    syncAll();
    updateScoreUI();
    scheduleAI();
  }

  function updateStrips() {
    const oppColor = playerColor === 1 ? 'Black' : 'White';
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

  // ---------- progress (saved in this browser) ----------
  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        hintCredits = Math.max(0, p.hintCredits || 0);   // hints are never negative
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
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        hintCredits: hintCredits,
        difficulty: difficulty, totalPoints: totalPoints
      }));
    } catch (e) { /* ignore */ }
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
        '. Levels close at 5000 / 10000 / 30000 / 50000.';
    }
  }

  function updateHintUI() {
    const word = hintCredits === 1 ? ' hint' : ' hints';
    hintCreditsEl.textContent = hintCredits + word;
    btnHint.textContent = 'Hint (' + hintCredits + ')';
  }

  // ---------- hints from puzzle situations ----------
  // The puzzle set lives in its own repository now. A hint is
  // earned each time the match reaches a situation that unlocks a puzzle level —
  // the queens exchanged, two pawns down, or the king in check — once per level
  // per match. Level 1 is the base level, so it does not pay.
  function grantSituationHints() {
    const open = C.Scoring.puzzleLevelsAvailable(game.state, playerColor);
    for (const lvl of open) {
      if (lvl === 1 || grantedLevels[lvl]) continue;
      grantedLevels[lvl] = true;
      hintCredits++;
      saveProgress();
      updateHintUI();
      flashHintEarned(lvl);
    }
  }

  function flashHintEarned(lvl) {
    const label = lvl === 2 ? 'queens exchanged' : lvl === 3 ? 'two pawns down' : 'king in check';
    const panel = hintCreditsEl.closest('.puzzle-panel') || hintCreditsEl.parentElement;
    if (!panel) return;
    const badge = document.createElement('span');
    badge.className = 'hint-earned';
    badge.textContent = '+1 hint \u2014 ' + label;
    panel.appendChild(badge);
    setTimeout(() => badge.remove(), 2600);
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
        statusEl.textContent = 'No hints yet \u2014 earn them as the game develops';
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

    $('btn-rematch').addEventListener('click', () => {
      closeModal(gameoverModal);
      openModal(newgameModal);
    });
    $('btn-close-gameover').addEventListener('click', () => closeModal(gameoverModal));
  }
})();
