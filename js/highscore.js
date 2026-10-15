/* ============================================================
   Learners Chess — high score

   The record of the highest "Total points" figure ever reached,
   and the name of whoever set it. Pure helpers, shared by the
   browser game, the Node backend and the test suite (UMD-style,
   exactly like engine.js).

   A record is: { name: string|null, score: number|null, updated: ISO-string|null }
   Setting a new record replaces (resets) the previous name and score.
   ============================================================ */
(function (global) {
  'use strict';

  var MAX_NAME = 24;

  function emptyRecord() {
    return { name: null, score: null, updated: null };
  }

  function isFiniteNumber(v) {
    return typeof v === 'number' && isFinite(v);
  }

  // trim, collapse runs of whitespace, cap the length; a blank name becomes 'Anonymous'
  function cleanName(name) {
    if (typeof name !== 'string') return 'Anonymous';
    var t = name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
    return t || 'Anonymous';
  }

  // a usable record needs a finite numeric score
  function isValidRecord(r) {
    return !!r && typeof r === 'object' && isFiniteNumber(r.score);
  }

  // does `score` beat the record currently held? (no record yet -> anything beats it)
  function beats(record, score) {
    if (!isFiniteNumber(score)) return false;
    if (!isValidRecord(record)) return true;
    return score > record.score;
  }

  // the new record to store, or null when `score` does not beat the old one.
  // A new record resets the name and score it replaces.
  function apply(record, name, score, now) {
    if (!beats(record, score)) return null;
    return {
      name: cleanName(name),
      score: score,
      updated: now || new Date().toISOString()
    };
  }

  var HighScore = {
    MAX_NAME: MAX_NAME,
    emptyRecord: emptyRecord,
    cleanName: cleanName,
    isValidRecord: isValidRecord,
    beats: beats,
    apply: apply
  };

  global.HighScore = HighScore;
  if (typeof module !== 'undefined' && module.exports) module.exports = HighScore;

})(typeof window !== 'undefined' ? window : globalThis);
