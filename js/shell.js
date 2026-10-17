/* ============================================================
   Learners Chess — platform shell
   Sidebar navigation between the Play and Progress views, and the
   Progress dashboard. Reads the same browser-stored progress the
   game keeps (learnerschess.progress) and mirrors the live
   scoreboard values, so nothing here changes game logic.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var PROGRESS_KEY = 'learnerschess.progress';
  var LEVEL_NAMES = ['Beginner', 'Casual', 'Club', 'Strong', 'Expert', 'Masters'];

  var Scoring = (window.Chess && window.Chess.Scoring) || null;

  // ---------- views ----------
  var VIEWS = { play: $('view-play'), progress: $('view-progress') };
  var TITLES = {
    play: ['Play', 'A full game against the engine'],
    progress: ['Progress', 'Your scores and hints']
  };

  function show(view) {
    Object.keys(VIEWS).forEach(function (k) {
      if (VIEWS[k]) VIEWS[k].classList.toggle('hidden', k !== view);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item[data-view]'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });
    var t = TITLES[view];
    if (t) {
      if ($('view-title')) $('view-title').textContent = t[0];
      if ($('view-sub')) $('view-sub').textContent = t[1];
    }
    if (view === 'progress') renderProgress();
  }

  Array.prototype.forEach.call(document.querySelectorAll('.nav-item[data-view]'), function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-view')); });
  });

  // ---------- puzzle trainer (its own site now) ----------
  var PUZZLES_URL = window.PUZZLES_URL || 'https://dipali1249.github.io/learners-chess-puzzles/';
  var openBtn = $('dash-open-puzzles');
  if (openBtn) openBtn.addEventListener('click', function () {
    window.open(PUZZLES_URL, '_blank', 'noopener');
  });

  // ---------- progress data ----------
  function readProgress() {
    try { return JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function fmtPts(v) { return (v >= 0 ? '+' : '') + (Number(v) || 0).toFixed(1); }
  function set(id, text) { var el = $(id); if (el && el.textContent !== text) el.textContent = text; }
  var lastSig = '';   // nothing is redrawn unless the stored progress actually changed
  function setWidth(id, pct) { var el = $(id); if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%'; }

  function renderProgress() {
    var p = readProgress();
    var total = Number(p.totalPoints) || 0;
    var sig = total + '|' + (Number(p.hintCredits) || 0) + '|' + (Number(p.difficulty) || 0);
    if (sig === lastSig) return;      // the values have not moved: nothing to redraw
    lastSig = sig;

    var level = Scoring ? Scoring.lowestPlayableLevel(total) : 1;
    var name = LEVEL_NAMES[level - 1] || '';
    var ceilings = Scoring ? Scoring.LEVEL_CEILING : null;   // [0, 5000, 10000, 30000, 50000, Infinity]
    var ceiling = ceilings ? ceilings[level] : null;         // ceiling for the current level

    var current = Number(p.difficulty) || 3;            // the level being played
    var currentName = LEVEL_NAMES[current - 1] || '';

    set('side-total', fmtPts(total));
    set('side-level', String(level));
    set('chip-level', 'Level ' + current + ' \u00b7 ' + currentName);

    set('dash-total', fmtPts(total));
    set('dash-level', String(level));
    set('dash-level-name', name);

    var note, pct;
    if (ceiling == null || !isFinite(ceiling)) {
      pct = 100;
      note = total >= 50000
        ? 'Levels 1\u20134 are closed \u2014 Masters (level 6) is open.'
        : 'Level 5 never closes \u2014 keep climbing.';
    } else {
      pct = (total / ceiling) * 100;
      note = fmtPts(total) + ' of ' + ceiling.toLocaleString('en-IN') + ' to close level ' + level;
    }
    set('dash-level-note', note);
    setWidth('dash-level-bar', pct);

    set('dash-hints', String(Number(p.hintCredits) || 0));
  }

  // The game raises this event only when the stored progress changes. It is coalesced
  // into one redraw per frame, so a burst of updates costs a single pass.
  var progressQueued = false;
  function queueProgress() {
    if (progressQueued) return;
    progressQueued = true;
    requestAnimationFrame(function () { progressQueued = false; renderProgress(); });
  }
  window.addEventListener('chess-progress', queueProgress);

  renderProgress();
  show('play');
})();
