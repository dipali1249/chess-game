/* ============================================================
   Learners Chess — high-score backend

   Zero dependencies (Node built-ins only). It serves the static
   game and exposes the high-score record over a small JSON API:

     GET  /api/highscore   -> { record: { name, score, updated } }
     POST /api/highscore   -> { name, score }   (stored only if it beats the record)

   Two storage modes, chosen automatically:

     - GitHub mode  — when GITHUB_TOKEN is set, the record lives in
       data/highscore.json in the repository and every update is a
       real commit made through the GitHub Contents API. This is what
       makes the record survive on the hosted site.
     - Local mode   — with no token, the record is read from and
       written to data/highscore.json on disk (handy for local play
       and for a self-hosted server with a persistent volume).

   Configuration (all optional, sensible defaults):
     PORT             port to listen on                      (default 8080)
     GITHUB_TOKEN     a repo-scoped token; enables GitHub mode
     GITHUB_OWNER     repository owner                        (default dipali1249)
     GITHUB_REPO      repository name                         (default chess-game)
     GITHUB_BRANCH    branch to commit to                     (default main)
     HIGHSCORE_PATH   path of the record file in the repo     (default data/highscore.json)
     CORS_ORIGIN      allowed origin for the API              (default *)

   Never commit a token: pass it through the environment.
   ============================================================ */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const HighScore = require('../js/highscore.js');

const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const CFG = {
  token: process.env.GITHUB_TOKEN || '',
  owner: process.env.GITHUB_OWNER || 'dipali1249',
  repo: process.env.GITHUB_REPO || 'chess-game',
  branch: process.env.GITHUB_BRANCH || 'main',
  filePath: process.env.HIGHSCORE_PATH || 'data/highscore.json',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

const useGitHub = !!CFG.token;
const LOCAL_FILE = path.join(ROOT, CFG.filePath);

// ---------- record storage ----------

function parseRecord(text) {
  try {
    const r = JSON.parse(text);
    if (HighScore.isValidRecord(r)) {
      return { name: r.name || null, score: r.score, updated: r.updated || null };
    }
  } catch (e) { /* fall through */ }
  return HighScore.emptyRecord();
}

// a tiny promise wrapper around the GitHub Contents API
function github(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'User-Agent': 'learners-chess-highscore',
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + CFG.token
    };
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request({ hostname: 'api.github.com', path: apiPath, method, headers }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = buf ? JSON.parse(buf) : null; } catch (e) { /* keep null */ }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject(new Error('GitHub ' + res.statusCode + ': ' +
          (parsed && parsed.message ? parsed.message : buf || 'request failed')));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// returns { record, sha } — sha is needed to update the file on GitHub
async function readRecord() {
  if (useGitHub) {
    const api = '/repos/' + CFG.owner + '/' + CFG.repo + '/contents/' + CFG.filePath +
      '?ref=' + encodeURIComponent(CFG.branch);
    const res = await github('GET', api);
    const text = Buffer.from(res.content || '', 'base64').toString('utf8');
    return { record: parseRecord(text), sha: res.sha || null };
  }
  let text = '';
  try { text = fs.readFileSync(LOCAL_FILE, 'utf8'); } catch (e) { text = ''; }
  return { record: parseRecord(text), sha: null };
}

async function writeRecord(record) {
  const text = JSON.stringify(record, null, 2) + '\n';
  if (useGitHub) {
    const { sha } = await readRecord();            // current blob sha (required to update)
    await github('PUT', '/repos/' + CFG.owner + '/' + CFG.repo + '/contents/' + CFG.filePath, {
      message: 'High score: ' + record.score + ' by ' + record.name,
      content: Buffer.from(text, 'utf8').toString('base64'),
      sha: sha || undefined,
      branch: CFG.branch
    });
    return;
  }
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  const tmp = LOCAL_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, LOCAL_FILE);                  // atomic replace
}

// ---------- HTTP helpers ----------

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': CFG.corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  }, corsHeaders()));
  res.end(body);
}

function readBody(req, limit) {
  limit = limit || 4096;
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ---------- API handlers ----------

async function handleGet(req, res) {
  try {
    const { record } = await readRecord();
    sendJson(res, 200, { record });
  } catch (e) {
    sendJson(res, 502, { error: 'could not read the record: ' + e.message });
  }
}

async function handlePost(req, res) {
  let raw;
  try { raw = await readBody(req); } catch (e) { return sendJson(res, 413, { error: e.message }); }

  let payload;
  try { payload = JSON.parse(raw || '{}'); } catch (e) { return sendJson(res, 400, { error: 'invalid JSON body' }); }

  const score = typeof payload.score === 'number' ? payload.score : Number(payload.score);
  if (!isFinite(score)) return sendJson(res, 400, { error: 'score must be a finite number' });

  let current;
  try { current = (await readRecord()).record; } catch (e) {
    return sendJson(res, 502, { error: 'could not read the record: ' + e.message });
  }

  const next = HighScore.apply(current, payload.name, score);
  if (!next) return sendJson(res, 200, { updated: false, record: current });

  try { await writeRecord(next); } catch (e) {
    return sendJson(res, 502, { error: 'could not save the record: ' + e.message });
  }
  return sendJson(res, 200, { updated: true, record: next });
}

// ---------- static files ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent((urlPath || '/').split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = path.normalize(path.join(ROOT, rel));
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {   // no path traversal
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size
    });
    fs.createReadStream(full).pipe(res);
  });
}

// ---------- server ----------

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    return res.end();
  }

  if (urlPath === '/api/highscore') {
    if (req.method === 'GET') { handleGet(req, res); return; }
    if (req.method === 'POST') {
      handlePost(req, res).catch((e) => sendJson(res, 500, { error: e.message }));
      return;
    }
    return sendJson(res, 405, { error: 'method not allowed' });
  }

  if (req.method === 'GET') return serveStatic(req, res, urlPath);

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log('Learners Chess running at http://localhost:' + PORT);
  console.log('High-score storage: ' + (useGitHub
    ? 'GitHub (' + CFG.owner + '/' + CFG.repo + '@' + CFG.branch + ' -> ' + CFG.filePath + ')'
    : 'local file ' + path.relative(ROOT, LOCAL_FILE)));
});
