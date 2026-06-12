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
      distanceM: info.totalDistance || 0,   // ODsay 실경로 총거리(m). 없으면 0(표시 시 좌표로 환산)
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

// ── 근거리(한 정거장 등) 직행 버스 탐색 ──────────────────────
// ODsay가 -98(너무 가까움)로 경로를 안 줄 때 사용. 출발·도착 정류장의 경유 노선을
// 받아 "같은 busID & 출발 정류장 idx < 도착 정류장 idx"(올바른 방향)인 버스를 찾아
// 노선 상세로 구간 정류장을 잘라 단일 leg 경로를 구성한다. (둘 다 ODsay stationID 필요)
async function fetchStationBuses(stationID) {
  try {
    const r = await fetch(`/api/station-buses?stationID=${encodeURIComponent(stationID)}`);
    if (!r.ok) return [];
    const j = await r.json();
    return j.lane || [];
  } catch (e) { return []; }
}
async function fetchBusLane(busID) {
  try {
    const r = await fetch(`/api/bus-lane?busID=${encodeURIComponent(busID)}`);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
function cleanBusNo(n) { return String(n || '').replace(/\(.*\)/, '').trim() || String(n || ''); }

async function shortBusRoute(origin, dest) {
  if (!origin || !dest || !origin.id || !dest.id) return null;
  const [oLanes, dLanes] = await Promise.all([fetchStationBuses(origin.id), fetchStationBuses(dest.id)]);
  if (!oLanes.length || !dLanes.length) return null;

  const destIdx = {};
  dLanes.forEach(l => { destIdx[l.busID] = l.busStationIdx; });
  let best = null;   // 정규 노선(괄호 없음) 우선 → 정거장 수 적은 순
  oLanes.forEach(l => {
    const di = destIdx[l.busID];
    if (di == null || l.busStationIdx >= di) return;         // 같은 방향(출발<도착)만
    const parens = /\(/.test(l.busNo) ? 1 : 0;               // 맞춤·변형 노선은 후순위
    const stops = di - l.busStationIdx;
    const better = !best || parens < best.parens || (parens === best.parens && stops < best.stops);
    if (better) best = { busID: l.busID, busNo: l.busNo, stops, parens };
  });
  if (!best) return null;

  // 노선 상세로 구간 정류장 이름·좌표 확보 (stationID로 직접 위치 탐색)
  const coords = {};
  let stops = null;
  const lane = await fetchBusLane(best.busID);
  const S = lane && Array.isArray(lane.station) ? lane.station : null;
  if (S) {
    const a = S.findIndex(s => String(s.stationID) === String(origin.id));
    const b = S.findIndex(s => String(s.stationID) === String(dest.id));
    if (a >= 0 && b > a) {
      const seg = S.slice(a, b + 1);
      stops = seg.map(s => s.stationName);
      seg.forEach(s => { coords[s.stationName] = { lat:+s.y, lng:+s.x }; });
    }
  }
  if (!stops) {   // 상세 실패 시 출발/도착만으로 구성
    stops = [origin.name, dest.name];
    coords[origin.name] = { lat:origin.lat, lng:origin.lng };
    coords[dest.name]   = { lat:dest.lat,   lng:dest.lng };
  }

  const durationMin = Math.max(1, Math.round((stops.length - 1) * 2));   // 정거장당 ~2분 추정
  const now = Date.now();
  const route = {
    id: 'short', recommended: true, transfers: 0, durationMin, walkMin: 0,
    departAt: hhmm(now), arriveAt: hhmm(now + durationMin * 60000),
    legs: [{ mode: 'bus', line: cleanBusNo(best.busNo), color: LEG_PALETTE[0], stops }],
  };
  return { routes: [route], coords, note: 'shorthop' };
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
    if (/-98\b/.test(msg)) {                                // ODsay -98: 출발·도착이 너무 가까움(<~700m)
      const short = await shortBusRoute(origin, dest);      // → 한 정거장 직행 버스 직접 탐색
      if (short) return short;
      throw apiErr('too_close', msg);                       // 직행 버스도 없으면 안내
    }
    throw apiErr('upstream', msg);
  }
  const coords = {};
  const routes = mapOdsayPaths(data, coords);
  if (!routes.length) throw apiErr('no_routes');
  return { routes, coords };
}

Object.assign(window, { apiAvailable, searchStations, searchRoutes });
