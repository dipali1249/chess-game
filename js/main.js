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

  // ---------- state ----------
  let game = new C.Game();
  let playerColor = 1;          // 1 white, -1 black
  let difficulty = 2;           // 1 easy, 2 medium, 3 hard
  let flipped = false;          // visual flip
  let selected = -1;
  let selectedMoves = [];
  let over = null;              // {over, result, reason}
  let soundOn = true;
  let thinking = false;
  let hint = null;
  let clocks = { '1': 600, '-1': 600 };
  let sqEls = new Array(64);
  let dragState = null;
  let pendingPromo = null;
  let audioCtx = null;

  init();

  function init() {
    buildBoard();
    bindEvents();
    openModal(newgameModal);
    newGame(1, 2);
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
    let ev = C.AI.evaluate(game.state);
    const clamped = Math.max(-1000, Math.min(1000, ev));
    evalFillEl.style.width = (50 + clamped / 20) + '%';
    const p = (ev / 100);
    evalTextEl.textContent = (p > 0 ? '+' : '') + p.toFixed(1);
  }

  function renderClocks() {
    const topColor = -playerColor;
    const top = clocks[String(topColor)];
    const bottom = clocks[String(playerColor)];
    clockTopEl.textContent = fmtClock(top);
    clockBottomEl.textContent = fmtClock(bottom);
    const active = game.state.turn;
    clockTopEl.classList.toggle('active', !over && active === topColor && game.state.history.length > 0);
    clockBottomEl.classList.toggle('active', !over && active === playerColor && game.state.history.length > 0);
    clockTopEl.classList.toggle('low', top <= 30);
    clockBottomEl.classList.toggle('low', bottom <= 30);
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
    const info = game.isGameOver();
    if (info.over) {
      over = info;
      finishGame();
      return true;
    }
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

  function onPointerUp(e) {
    if (!dragState) return;
    const d = dragState;
    dragState = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    d.ghost.remove();
    d.pieceEl.classList.remove('dragging-origin');
    if (!d.moved) return; // simple click — selection stays
    const el = document.elementFromPoint(e.clientX, e.clientY);
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
    buildBoard();
    updateStrips();
    syncAll();
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

  // ---------- events ----------
  function bindEvents() {
    boardEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('contextmenu', (e) => {
      if (dragState) e.preventDefault();
    });

    btnNew.addEventListener('click', () => openModal(newgameModal));
    $('btn-cancel-new').addEventListener('click', () => closeModal(newgameModal));

    [segColor, segDiff].forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        seg.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    $('btn-start').addEventListener('click', () => {
      let color = segValue(segColor);
      if (color === 'r') color = Math.random() < 0.5 ? 'w' : 'b';
      const diff = +segValue(segDiff);
      closeModal(newgameModal);
      closeModal(gameoverModal);
      newGame(color === 'w' ? 1 : -1, diff);
    });

    btnUndo.addEventListener('click', () => {
      if (thinking || !game.state.history.length) return;
      closeModal(gameoverModal);
      over = null;
      hint = null;
      game.undo();
      if (game.state.turn !== playerColor && game.state.history.length) game.undo();
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
      const m = C.AI.search(game.state, 2);
      if (!m) return;
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

    $('btn-rematch').addEventListener('click', () => {
      closeModal(gameoverModal);
      openModal(newgameModal);
    });
    $('btn-close-gameover').addEventListener('click', () => closeModal(gameoverModal));
  }
})();
