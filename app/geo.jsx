
const AG_FB = { soundOn:true, vibrateOn:true, voiceVol:'normal', voiceRate:'normal' };
function setFeedbackSettings(s) { Object.assign(AG_FB, s); }

function vibrate(pattern) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch(e){}
}
function vibrateFeedback(pattern) {
  if (!AG_FB.vibrateOn) return;
  vibrate(pattern);
}
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

function distM(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

const GEO = {
  ARRIVE_R:  70,
  PRE_R:     450,
  PASS_R:    130,
  PASS_HYST: 50,
};

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
