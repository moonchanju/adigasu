// ─────────────────────────────────────────────────────────────
// 어디가수? — 정적 서버 + ODsay 프록시 (의존성 0, Node 내장 모듈만)
//
// 실행:  ODSAY_API_KEY=발급받은키 node server.js
//   - 키가 없으면 /api/* 는 503(no_key) → 앱은 자동으로 데모 데이터로 폴백.
//   - ODsay 키는 서버에만 머무르고 브라우저로 노출되지 않는다(키 보호 + CORS 우회).
// 접속:  http://localhost:8000/어디가수.html
// ─────────────────────────────────────────────────────────────
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT   = process.env.PORT || 8000;
const ROOT   = __dirname;

// 키 우선순위: 환경변수 → 로컬 키파일(.odsay_key). 파일은 .gitignore 로 커밋 제외.
function loadKey() {
  if (process.env.ODSAY_API_KEY) return process.env.ODSAY_API_KEY.trim();
  try { return fs.readFileSync(path.join(ROOT, '.odsay_key'), 'utf8').trim(); } catch (e) { return ''; }
}
const KEY = loadKey();
// ODsay에 등록한 URI(플랫폼=URI). 등록 URI와 Referer를 맞춰 서버 호출이 통과되도록 한다.
// 배포 시 ODSAY_REFERER 로 실제 도메인을 넘기면 된다.
const REFERER = process.env.ODSAY_REFERER || `http://localhost:${PORT}`;
const ODSAY  = 'https://api.odsay.com/v1/api';

const MIME = {
  '.html':'text/html; charset=utf-8', '.jsx':'application/javascript; charset=utf-8',
  '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.json':'application/json',
};

// ODsay 호출 헬퍼 — 키를 붙여 외부 API를 대신 호출하고 result 만 돌려준다.
async function odsay(endpoint, params) {
  const u = new URL(`${ODSAY}/${endpoint}`);
  u.searchParams.set('apiKey', KEY);
  u.searchParams.set('lang', '0');
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { 'Accept': 'application/json', 'Referer': REFERER } });
  const j = await r.json();
  if (j.error) throw new Error(`ODsay ${j.error.code || ''}: ${j.error.message || 'error'}`);
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
        stationClass: url.searchParams.get('class') || '',   // 1=지하철 2=버스 (빈값=전체)
        CID: url.searchParams.get('cid') || '',
        displayCnt: 10,
      });
      return sendJSON(res, 200, result);
    }
    if (url.pathname === '/api/routes') {
      const p = url.searchParams;
      const result = await odsay('searchPubTransPathT', {
        SX: p.get('sx'), SY: p.get('sy'), EX: p.get('ex'), EY: p.get('ey'),
        SearchPathType: p.get('type') || '0',                 // 0=전체 1=지하철 2=버스
        OPT: '0',
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
  // 디렉터리 탈출 방지
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
