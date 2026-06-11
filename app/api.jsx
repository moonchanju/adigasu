// ─────────────────────────────────────────────────────────────
// 어디가수? — client API layer (프록시 호출 + ODsay→내부 데이터 매핑)
//   searchStations(q, region) : 역/정류장 자동완성  → [{name,lat,lng,id,cls}]
//   searchRoutes(origin, dest): 경로 탐색           → [route...]  (data.jsx ROUTES와 동일 형태)
// 키가 없거나 호출 실패 시 throw → 호출부가 데모 데이터로 폴백한다.
// ─────────────────────────────────────────────────────────────

// 지역 → ODsay CID(도시코드). 실제 API 조회로 확인한 값(대표역 일치 기준).
// ODsay searchStation 의 CID 파라미터로 넘겨 "그 지역 안에서만" 검색(하드 필터).
// 서버측 필터라 해당 지역 역이 전국 순위에 묻혀 누락되는 문제가 없음(검증 완료).
const REGION_CID = {
  seoul: 1000, incheon: 2000, daejeon: 3000, sejong: 3300,
  daegu: 4000, gwangju: 5000, ulsan: 6000, busan: 7000,
};

// 경로 탐색 수단: 0=전체 1=지하철 2=버스. 앱 컨셉(지상 대중교통)=버스.
const ROUTE_TYPE = '2';

// API 사용 가능 여부(키 존재) — 최초 1회 /api/health 로 확인 후 캐시.
let _apiReady = null;
async function apiAvailable() {
  if (_apiReady !== null) return _apiReady;
  try {
    const r = await fetch('/api/health');
    const j = await r.json();
    _apiReady = !!j.hasKey;
  } catch (e) { _apiReady = false; }
  return _apiReady;
}

// 코드가 달린 에러 — 호출부가 상황별 메시지를 고를 수 있게 한다.
function apiErr(code, message) { const e = new Error(message || code); e.code = code; return e; }

// 정류장명에 잘 안 붙는 접미사 — 0건일 때 떼고 재검색해 매칭률을 높인다.
// (예: "경북대병원"→"경북대", "봉덕동"→"봉덕", "반월당역"→"반월당")
const STATION_SUFFIX = /(주민센터|대학교|학교|병원|아파트|시장|회관|센터|네거리|사거리|삼거리|오거리|입구|구청|시청|역|동)$/;

async function fetchStations(q, cid) {
  const cidQ = cid ? `&cid=${cid}` : '';   // 지역 한정(하드 필터)
  const r = await fetch(`/api/stations?q=${encodeURIComponent(q)}${cidQ}`);
  if (!r.ok) throw apiErr('stations_failed');
  const result = await r.json();
  // ODsay stationClass: 1=버스정류장, 2=지하철역
  return (result.station || []).map(s => ({
    id: String(s.stationID),
    name: s.stationName,
    lat: +s.y, lng: +s.x,
    cls: s.stationClass === 2 ? 'subway' : 'bus',
    region: s.CID,
  })).filter(s => isFinite(s.lat) && isFinite(s.lng));
}

// ── 역/정류장 검색 (선택 지역 안에서만) ──────────────────────
async function searchStations(q, region) {
  if (!(await apiAvailable())) throw apiErr('no_api');
  const cid = (region && REGION_CID[region.id]) || '';
  const term = q.trim();
  let list = await fetchStations(term, cid);
  if (!list.length) {
    const alt = term.replace(STATION_SUFFIX, '');   // 접미사 제거 후 1회 재검색(같은 지역 내)
    if (alt.length >= 2 && alt !== term) list = await fetchStations(alt, cid);
  }
  return list;
}

// ── 경로 탐색 ────────────────────────────────────────────────
const LEG_PALETTE = ['#2E6CB5', '#1E7A52', '#7A4FB0', '#C9701F', '#D8392C', '#256C8A'];

function hhmm(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ODsay searchPubTransPathT 결과 → 내부 route 배열로 변환.
// 지상 버스(trafficType=2)만 취하고, 도보=3은 시간만 합산.
// 지하철·기차·비행기 등 그 외 수단이 포함된 경로는 통째로 제외(앱 컨셉: 지상 대중교통 한정).
function mapOdsayPaths(result, coordsOut) {
  const paths = [];
  (result.path || []).forEach((p, pi) => {
    const info = p.info || {};
    const legs = [];
    let walkMin = 0, unsupported = false;
    (p.subPath || []).forEach(sp => {
      if (sp.trafficType === 3) { walkMin += Math.round(sp.sectionTime || 0); return; }   // 도보
      // 지상 대중교통(버스=2)만 안내한다. 지하철(1)·기차·비행기 등은 GPS 신뢰도 문제로 제외.
      if (sp.trafficType !== 2) { unsupported = true; return; }
      const lane = (sp.lane && sp.lane[0]) || {};
      const line = lane.busNo || lane.busLocalBlID || lane.name || '버스';
      const stations = (sp.passStopList && sp.passStopList.stations) || [];
      let stops;
      if (stations.length) {
        stops = stations.map(s => s.stationName);
        stations.forEach(s => { coordsOut[s.stationName] = { lat:+s.y, lng:+s.x }; });
      } else {
        stops = [sp.startName, sp.endName];
        coordsOut[sp.startName] = { lat:+sp.startY, lng:+sp.startX };
        coordsOut[sp.endName]   = { lat:+sp.endY,   lng:+sp.endX };
      }
      legs.push({
        mode: 'bus',
        line: String(line),
        color: LEG_PALETTE[legs.length % LEG_PALETTE.length],
        stops,
      });
    });
    if (unsupported || !legs.length) return;   // 시외 수단 포함 or 탈 것 없음 → 제외
    paths.push({
      id: 'p' + pi,
      recommended: false,
      transfers: Math.max(0, legs.length - 1),
      durationMin: info.totalTime || 0,
      walkMin,
      departAt: '', arriveAt: '',
      legs,
    });
  });

  // 환승 적은 순 → 시간 짧은 순 (문서: "환승 적은 순")
  paths.sort((a, b) => a.transfers - b.transfers || a.durationMin - b.durationMin);
  if (paths[0]) paths[0].recommended = true;

  // ODsay는 시계시각 대신 소요시간을 주므로 현재시각 기준으로 환산
  const now = Date.now();
  paths.forEach(r => { r.departAt = hhmm(now); r.arriveAt = hhmm(now + r.durationMin * 60000); });
  return paths.slice(0, 4);
}

// origin/dest: {name,lat,lng}. 반환: { routes, coords(이름→{lat,lng}) }
// 에러 코드: no_api | no_coords | too_close | no_routes | upstream
async function searchRoutes(origin, dest) {
  if (!(await apiAvailable())) throw apiErr('no_api');
  if (!origin || !dest || !isFinite(origin.lat) || !isFinite(dest.lat)) throw apiErr('no_coords');
  const r = await fetch(`/api/routes?sx=${origin.lng}&sy=${origin.lat}&ex=${dest.lng}&ey=${dest.lat}&type=${ROUTE_TYPE}`);
  let data; try { data = await r.json(); } catch (e) { throw apiErr('upstream'); }
  if (r.status === 503) throw apiErr('no_api');
  if (!r.ok || data.error) {
    const msg = (data && data.message) || '';
    if (/-98\b/.test(msg)) throw apiErr('too_close', msg);  // ODsay -98: 출발·도착이 너무 가까움
    throw apiErr('upstream', msg);
  }
  const coords = {};
  const routes = mapOdsayPaths(data, coords);
  if (!routes.length) throw apiErr('no_routes');
  return { routes, coords };
}

Object.assign(window, { apiAvailable, searchStations, searchRoutes });
