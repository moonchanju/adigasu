
const REGION_CID = {
  seoul: 1000, incheon: 2000, daejeon: 3000, sejong: 3300,
  daegu: 4000, gwangju: 5000, ulsan: 6000, busan: 7000,
};

const ROUTE_TYPE = '2';

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

function apiErr(code, message) { const e = new Error(message || code); e.code = code; return e; }

const STATION_SUFFIX = /(주민센터|대학교|학교|병원|아파트|시장|회관|센터|네거리|사거리|삼거리|오거리|입구|구청|시청|역|동)$/;

async function fetchStations(q, cid) {
  const cidQ = cid ? `&cid=${cid}` : '';
  const r = await fetch(`/api/stations?q=${encodeURIComponent(q)}${cidQ}`);
  if (!r.ok) throw apiErr('stations_failed');
  const result = await r.json();
  return (result.station || []).map(s => ({
    id: String(s.stationID),
    name: s.stationName,
    lat: +s.y, lng: +s.x,
    cls: s.stationClass === 2 ? 'subway' : 'bus',
    region: s.CID,
  })).filter(s => isFinite(s.lat) && isFinite(s.lng));
}

async function searchStations(q, region) {
  if (!(await apiAvailable())) throw apiErr('no_api');
  const cid = (region && REGION_CID[region.id]) || '';
  const term = q.trim();
  let list = await fetchStations(term, cid);
  if (!list.length) {
    const alt = term.replace(STATION_SUFFIX, '');
    if (alt.length >= 2 && alt !== term) list = await fetchStations(alt, cid);
  }
  return list;
}

const LEG_PALETTE = ['#2E6CB5', '#1E7A52', '#7A4FB0', '#C9701F', '#D8392C', '#256C8A'];

function hhmm(ms) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function mapOdsayPaths(result, coordsOut) {
  const paths = [];
  (result.path || []).forEach((p, pi) => {
    const info = p.info || {};
    const legs = [];
    let walkMin = 0, unsupported = false;
    (p.subPath || []).forEach(sp => {
      if (sp.trafficType === 3) { walkMin += Math.round(sp.sectionTime || 0); return; }
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
    if (unsupported || !legs.length) return;
    paths.push({
      id: 'p' + pi,
      recommended: false,
      transfers: Math.max(0, legs.length - 1),
      durationMin: info.totalTime || 0,
      distanceM: info.totalDistance || 0,
      walkMin,
      departAt: '', arriveAt: '',
      legs,
    });
  });

  paths.sort((a, b) => a.transfers - b.transfers || a.durationMin - b.durationMin);
  if (paths[0]) paths[0].recommended = true;

  const now = Date.now();
  paths.forEach(r => { r.departAt = hhmm(now); r.arriveAt = hhmm(now + r.durationMin * 60000); });
  return paths.slice(0, 4);
}

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
  let best = null;
  oLanes.forEach(l => {
    const di = destIdx[l.busID];
    if (di == null || l.busStationIdx >= di) return;
    const parens = /\(/.test(l.busNo) ? 1 : 0;
    const stops = di - l.busStationIdx;
    const better = !best || parens < best.parens || (parens === best.parens && stops < best.stops);
    if (better) best = { busID: l.busID, busNo: l.busNo, stops, parens };
  });
  if (!best) return null;

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
  if (!stops) {
    stops = [origin.name, dest.name];
    coords[origin.name] = { lat:origin.lat, lng:origin.lng };
    coords[dest.name]   = { lat:dest.lat,   lng:dest.lng };
  }

  const durationMin = Math.max(1, Math.round((stops.length - 1) * 2));
  const now = Date.now();
  const route = {
    id: 'short', recommended: true, transfers: 0, durationMin, walkMin: 0,
    departAt: hhmm(now), arriveAt: hhmm(now + durationMin * 60000),
    legs: [{ mode: 'bus', line: cleanBusNo(best.busNo), color: LEG_PALETTE[0], stops }],
  };
  return { routes: [route], coords, note: 'shorthop' };
}

async function searchRoutes(origin, dest) {
  if (!(await apiAvailable())) throw apiErr('no_api');
  if (!origin || !dest || !isFinite(origin.lat) || !isFinite(dest.lat)) throw apiErr('no_coords');
  const r = await fetch(`/api/routes?sx=${origin.lng}&sy=${origin.lat}&ex=${dest.lng}&ey=${dest.lat}&type=${ROUTE_TYPE}`);
  let data; try { data = await r.json(); } catch (e) { throw apiErr('upstream'); }
  if (r.status === 503) throw apiErr('no_api');
  if (!r.ok || data.error) {
    const msg = (data && data.message) || '';
    if (/-98\b/.test(msg)) {
      const short = await shortBusRoute(origin, dest);
      if (short) return short;
      throw apiErr('too_close', msg);
    }
    throw apiErr('upstream', msg);
  }
  const coords = {};
  const routes = mapOdsayPaths(data, coords);
  if (!routes.length) throw apiErr('no_routes');
  return { routes, coords };
}

Object.assign(window, { apiAvailable, searchStations, searchRoutes });
