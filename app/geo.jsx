// ─────────────────────────────────────────────────────────────
// 어디가수? — real geolocation + geofencing engine
// W3C Geolocation API (navigator.geolocation) 기반. 키 불필요·무료.
// HTTPS 또는 localhost 에서만 동작한다.
// ─────────────────────────────────────────────────────────────

// ── 피드백 헬퍼 (촉각·음성) ─────────────────────────────────
// 안내 화면과 역 선택 등 여러 화면이 공유한다(geo.jsx가 먼저 로드되므로 전역 제공).
// 설정값은 App이 setFeedbackSettings로 동기화한다(localStorage 저장값을 반영).
const AG_FB = { soundOn:true, vibrateOn:true, voiceVol:'normal', voiceRate:'normal' };
function setFeedbackSettings(s) { Object.assign(AG_FB, s); }

// 진동: navigator.vibrate — 안드로이드 크롬 지원, iOS 사파리는 미지원이라 안전하게 무시된다.
// vibrate(): 하차·환승·도착 등 안전 알림용 — 설정과 무관하게 항상 동작한다.
function vibrate(pattern) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch(e){}
}
// vibrateFeedback(): 역 선택 등 보조 피드백용 — 설정(vibrateOn)이 켜져 있을 때만 동작.
function vibrateFeedback(pattern) {
  if (!AG_FB.vibrateOn) return;
  vibrate(pattern);
}
// 음성: Web Speech API. on(보통 soundOn)이 켜져 있을 때만 발화한다.
// 크기(volume)·속도(rate)는 설정값을 따르며, override로 즉시 미리듣기 값을 넘길 수 있다.
function speak(text, on, override) {
  const enabled = on !== undefined ? on : AG_FB.soundOn;
  if (!enabled) return;
  try {
    const s = window.speechSynthesis; if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.pitch = 1;
    const vol  = (override && override.vol)  || AG_FB.voiceVol;
    const rate = (override && override.rate) || AG_FB.voiceRate;
    u.volume = vol === 'loud' ? 1 : 0.85;
    u.rate   = rate === 'slow' ? 0.72 : 0.92;
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
  ARRIVE_R:  70,  // 정류장 "도착/통과" 판정 반경
  PRE_R:     450, // 하차역 예고("곧 내리세요") 진입 반경
  PASS_R:    130, // 하차역 최근접이 이 안(70~130m)까지 들어왔다가 다시 멀어지면 "지나침"으로 판정
  PASS_HYST: 50,  // 최근접 대비 이만큼(m) 다시 멀어져야 지나침 확정(GPS 흔들림으로 인한 오탐 방지)
};

// 화면 꺼짐 방지(Screen Wake Lock API). 안내 중 화면이 자동으로 꺼지면 진동·음성 알림도
// 함께 멈추므로, active일 때 화면 잠금을 잡고, 탭이 가려졌다 돌아오면 다시 잡는다.
// 미지원 기기(예: 일부 iOS 버전)는 조용히 무시된다(안전 폴백: 화면 점유형 알림).
function useWakeLock(active) {
  React.useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !navigator.wakeLock) return;
    let lock = null, stopped = false;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request('screen'); } catch (e) {}
    };
    const onVisible = () => { if (!stopped && document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      try { lock && lock.release(); } catch (e) {}
    };
  }, [active]);
}

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

Object.assign(window, { distM, GEO, useGeolocation, useWakeLock, geofenceLeg, vibrate, vibrateFeedback, speak, setFeedbackSettings });
