// ─────────────────────────────────────────────────────────────
// 어디가수? — real geolocation + geofencing engine
// W3C Geolocation API (navigator.geolocation) 기반. 키 불필요·무료.
// HTTPS 또는 localhost 에서만 동작한다.
// ─────────────────────────────────────────────────────────────

// ── 피드백 헬퍼 (촉각·음성) ─────────────────────────────────
// 안내 화면과 역 선택 등 여러 화면이 공유한다(geo.jsx가 먼저 로드되므로 전역 제공).
// 진동: navigator.vibrate — 안드로이드 크롬 지원, iOS 사파리는 미지원이라 안전하게 무시된다.
function vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch(e){} }
// 음성: Web Speech API. soundOn(음성 안내 설정)이 켜져 있을 때만 발화한다.
function speak(text, on) {
  if (!on) return;
  try {
    const s = window.speechSynthesis; if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = 0.92; u.pitch = 1;
    s.speak(u);
  } catch(e){}
}

// Haversine 거리(미터). 두 {lat,lng} 사이의 지표면 거리.
function distM(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// 지오펜싱 임계값(미터)
const GEO = {
  ARRIVE_R: 70,   // 정류장 "도착/통과" 판정 반경
  PRE_R:    450,  // 하차역 예고("곧 내리세요") 진입 반경
};

// 실시간 위치 추적 훅.
// enabled=true 일 때 watchPosition 으로 구독, 언마운트/비활성 시 해제.
// 반환: { status, coords, accuracy, error }
//   status: 'idle' | 'unsupported' | 'locating' | 'active' | 'denied' | 'error'
function useGeolocation(enabled) {
  const [state, setState] = React.useState({ status:'idle', coords:null, accuracy:null, error:null });

  React.useEffect(() => {
    if (!enabled) { setState(s => ({ ...s, status:'idle' })); return; }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status:'unsupported', coords:null, accuracy:null, error:'이 기기는 위치 기능을 지원하지 않습니다' });
      return;
    }
    setState(s => ({ ...s, status:'locating' }));
    const id = navigator.geolocation.watchPosition(
      pos => setState({
        status:'active',
        coords:{ lat:pos.coords.latitude, lng:pos.coords.longitude },
        accuracy: pos.coords.accuracy,
        error:null,
      }),
      err => setState({
        status: err.code === 1 ? 'denied' : 'error',
        coords:null, accuracy:null,
        error: err.code === 1 ? '위치 권한이 거부되었습니다' : (err.message || '위치를 가져오지 못했습니다'),
      }),
      { enableHighAccuracy:true, maximumAge:2000, timeout:12000 }
    );
    return () => { try { navigator.geolocation.clearWatch(id); } catch(e){} };
  }, [enabled]);

  return state;
}

// 한 leg(노선 구간) 안에서 현재 위치가 도달한 정류장 인덱스와 하차역까지 거리를 계산.
// stops: 정류장 이름 배열, coords: 현재 위치 {lat,lng}
// 반환: { nearestIdx, nearestDist, alightDist } (좌표 없으면 null)
function geofenceLeg(stops, coords) {
  if (!coords) return null;
  let nearestIdx = 0, nearestDist = Infinity;
  stops.forEach((name, i) => {
    const c = COORDS[name];
    if (!c) return;
    const d = distM(coords, c);
    if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
  });
  const alight = COORDS[stops[stops.length - 1]];
  return { nearestIdx, nearestDist, alightDist: distM(coords, alight) };
}

Object.assign(window, { distM, GEO, useGeolocation, geofenceLeg, vibrate, speak });
