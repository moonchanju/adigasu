const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT   = process.env.PORT || 8000;
const ROOT   = __dirname;

function loadKey() {
  if (process.env.ODSAY_API_KEY) return process.env.ODSAY_API_KEY.trim();
  try { return fs.readFileSync(path.join(ROOT, '.odsay_key'), 'utf8').trim(); } catch (e) { return ''; }
}
const KEY = loadKey();
const REFERER = process.env.ODSAY_REFERER || `http://localhost:${PORT}`;
const ODSAY  = 'https://api.odsay.com/v1/api';

const MIME = {
  '.html':'text/html; charset=utf-8', '.jsx':'application/javascript; charset=utf-8',
  '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.json':'application/json',
};

async function odsay(endpoint, params) {
  const u = new URL(`${ODSAY}/${endpoint}`);
  u.searchParams.set('apiKey', KEY);
  u.searchParams.set('lang', '0');
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { 'Accept': 'application/json', 'Referer': REFERER } });
  const j = await r.json();
  if (j.error) {
    const e = Array.isArray(j.error) ? (j.error[0] || {}) : j.error;
    const code = e.code != null ? e.code : '';
    const msg  = e.message || e.msg || 'error';
    throw new Error(`ODsay ${code}: ${msg}`.trim());
  }
  return j.result || {};
}

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') return sendJSON(res, 200, { hasKey: !!KEY });
  if (!KEY) return sendJSON(res, 503, { error: 'no_key' });
  try {
    if (url.pathname === '/api/stations') {
      const q = url.searchParams.get('q') || '';
      const result = await odsay('searchStation', {
        stationName: q,
        stationClass: url.searchParams.get('class') || '',
        CID: url.searchParams.get('cid') || '',
        displayCnt: 10,
      });
      return sendJSON(res, 200, result);
    }
    if (url.pathname === '/api/routes') {
      const p = url.searchParams;
      const result = await odsay('searchPubTransPathT', {
        SX: p.get('sx'), SY: p.get('sy'), EX: p.get('ex'), EY: p.get('ey'),
        SearchPathType: p.get('type') || '0',
        OPT: '0',
      });
      return sendJSON(res, 200, result);
    }
    if (url.pathname === '/api/station-buses') {
      const result = await odsay('busStationInfo', {
        stationID: url.searchParams.get('stationID') || '',
        CID: url.searchParams.get('cid') || '',
      });
      return sendJSON(res, 200, result);
    }
    if (url.pathname === '/api/bus-lane') {
      const result = await odsay('busLaneDetail', {
        busID: url.searchParams.get('busID') || '',
        CID: url.searchParams.get('cid') || '',
      });
      return sendJSON(res, 200, result);
    }
    return sendJSON(res, 404, { error: 'unknown_endpoint' });
  } catch (e) {
    return sendJSON(res, 502, { error: 'upstream', message: String(e.message || e) });
  }
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/어디가수.html';
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`▶ 어디가수 서버: http://localhost:${PORT}/어디가수.html`);
  console.log(`  ODsay 키: ${KEY ? '설정됨 ✓ (실데이터)' : '없음 — 데모 데이터로 동작'}`);
});
