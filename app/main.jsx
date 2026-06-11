// ─────────────────────────────────────────────────────────────
// 어디가수? — App shell: phone frame, scaling stage, state machine
// ─────────────────────────────────────────────────────────────
const W = 393, H = 852;

// per-screen status bar appearance
function statusTheme(screen) {
  if (screen === 'region' || screen === 'done') return { bg:T.paper, fg:T.ink };
  return { bg:T.ink, fg:'#fff' };
}

function StatusBar({ bg, fg }) {
  return (
    <div style={{ height:44, background:bg, color:fg, display:'flex', alignItems:'center',
      justifyContent:'space-between', padding:'0 22px', flexShrink:0,
      fontVariantNumeric:'tabular-nums' }}>
      <span style={{ fontSize:16, fontWeight:800, letterSpacing:'0.01em' }}>9:30</span>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {/* signal */}
        <svg width="18" height="14" viewBox="0 0 18 14"><g fill={fg}>
          <rect x="0" y="9" width="3" height="5" rx="1"/><rect x="5" y="6" width="3" height="8" rx="1"/>
          <rect x="10" y="3" width="3" height="11" rx="1"/><rect x="15" y="0" width="3" height="14" rx="1"/>
        </g></svg>
        {/* wifi */}
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke={fg} strokeWidth="1.8" strokeLinecap="round">
          <path d="M2 5a11 11 0 0114 0M4.5 8a7 7 0 019 0"/><circle cx="9" cy="11.5" r="1" fill={fg} stroke="none"/>
        </svg>
        {/* battery */}
        <svg width="26" height="14" viewBox="0 0 26 14"><rect x="0.5" y="0.5" width="22" height="13" rx="3.5" fill="none" stroke={fg} strokeOpacity="0.5"/>
          <rect x="2.5" y="2.5" width="16" height="9" rx="1.5" fill={fg}/><rect x="24" y="4.5" width="2" height="5" rx="1" fill={fg}/></svg>
      </div>
    </div>
  );
}

// loading state between input and routes
function Searching({ origin, dest }) {
  return (
    <div style={{ background:T.paper, minHeight:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:26, padding:30 }}>
      <div className="ag-spin" style={{ width:74, height:74, borderRadius:'50%',
        border:`7px solid ${T.line}`, borderTopColor:T.gold }} />
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:26, fontWeight:800, color:T.ink }}>경로를 찾고 있어요</div>
        <div style={{ fontSize:18, fontWeight:700, color:T.muted, marginTop:8 }}>{origin} → {dest}</div>
      </div>
    </div>
  );
}

function App() {
  const LS = 'adigasu_v1';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch(e){ return {}; } })();

  // 최근 검색: 지역별 맵 { regionId: [station...] }. 구버전(배열) 형식이면 폐기하고 새로 시작.
  const sr = saved.recents;
  const initialRecents = (sr && !Array.isArray(sr) && typeof sr === 'object') ? sr : {};

  const [screen, setScreen] = useState('region');
  const [region, setRegion] = useState(null);
  const [origin, setOrigin] = useState(null);   // {name,lat,lng} | null
  const [dest, setDest] = useState(null);
  const [routes, setRoutes] = useState([]);     // 검색된 경로 목록
  const [routeNote, setRouteNote] = useState(null); // 경로화면 안내: 'demo'|'too_close'|'no_coords'|'error'|null
  const [route, setRoute] = useState(null);     // 선택한 경로
  const [recents, setRecents] = useState(initialRecents);
  const [soundOn, setSoundOn] = useState(saved.soundOn ?? true);
  const [vibrateOn, setVibrateOn] = useState(saved.vibrateOn ?? true);
  const [voiceVol, setVoiceVol] = useState(saved.voiceVol ?? 'normal');     // 'normal' | 'loud'
  const [voiceRate, setVoiceRate] = useState(saved.voiceRate ?? 'normal');  // 'normal' | 'slow'
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ recents, soundOn, vibrateOn, voiceVol, voiceRate })); } catch(e){}
  }, [recents, soundOn, vibrateOn, voiceVol, voiceRate]);

  // 피드백 엔진(geo.jsx)에 설정 동기화 → vibrate/speak가 설정을 반영
  useEffect(() => { setFeedbackSettings({ soundOn, vibrateOn, voiceVol, voiceRate }); }, [soundOn, vibrateOn, voiceVol, voiceRate]);

  function changeSetting(key, val) {
    if (key === 'soundOn') setSoundOn(val);
    else if (key === 'vibrateOn') setVibrateOn(val);
    else if (key === 'voiceVol') setVoiceVol(val);
    else if (key === 'voiceRate') setVoiceRate(val);
  }

  // 현재 지역 버킷에 추가(이름 기준 중복 제거, 최대 6개)
  function addRecent(...items) {
    if (!region) return;
    setRecents(prev => {
      const cur = prev[region.id] || [];
      const out = [], seen = new Set();
      for (const it of [...items.filter(Boolean), ...cur]) {
        if (!it || seen.has(it.name)) continue;
        seen.add(it.name); out.push(it);
      }
      return { ...prev, [region.id]: out.slice(0, 6) };
    });
  }

  // 현재 지역 버킷에서 한 건 삭제
  function removeRecent(name) {
    if (!region) return;
    setRecents(prev => ({ ...prev, [region.id]: (prev[region.id] || []).filter(r => r.name !== name) }));
  }

  function setField(field, value) {  // value: 역 객체 {name,lat,lng}
    if (field === 'origin') setOrigin(value); else setDest(value);
  }

  async function doSearch() {
    addRecent(origin, dest);
    setScreen('searching');
    const t0 = Date.now();
    let note = null;
    try {
      const { routes: found, coords, note: okNote } = await searchRoutes(origin, dest);
      Object.assign(COORDS, coords);   // 정류장 좌표를 지오펜싱용 사전에 병합
      setRoutes(found);
      note = okNote || null;           // 'shorthop'(근거리 직행버스) 등 성공 안내
    } catch (e) {
      const code = e && e.code;
      if (code === 'no_api') { setRoutes(ROUTES); note = 'demo'; }      // 키 없음 → 데모 경로
      else if (code === 'too_close')  { setRoutes([]); note = 'too_close'; }
      else if (code === 'no_coords')  { setRoutes([]); note = 'no_coords'; }
      else { setRoutes([]); note = 'error'; }                          // no_routes / upstream
    }
    setRouteNote(note);
    const dt = Date.now() - t0;        // 검색 화면이 깜빡이지 않도록 최소 표시시간
    if (dt < 500) await new Promise(r => setTimeout(r, 500 - dt));
    setScreen('routes');
  }

  // 지역 선택 — 지역이 바뀌면 그 지역의 새 검색이므로 검색 상태를 초기화(같은 지역 재진입은 입력 보존)
  function selectRegion(r) {
    if (!region || r.id !== region.id) {
      setOrigin(null); setDest(null); setRoutes([]); setRouteNote(null); setRoute(null);
    }
    setRegion(r);
    setScreen('input');
  }

  function resetHome() {
    setOrigin(null); setDest(null); setRoutes([]); setRouteNote(null); setRoute(null); setRegion(null); setScreen('region');
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
  }

  const st = statusTheme(screen);
  const regionRecents = (region && recents[region.id]) || [];   // 현재 지역의 최근 검색만

  let body;
  if (screen === 'region') body = <RegionScreen onSelect={selectRegion} onSettings={()=>setSettingsOpen(true)} />;
  else if (screen === 'input') body = <InputScreen region={region} origin={origin} dest={dest} recents={regionRecents}
    soundOn={soundOn} onBack={()=>setScreen('region')} onSet={setField} onSearch={doSearch} onRemoveRecent={removeRecent}
    onSettings={()=>setSettingsOpen(true)} />;
  else if (screen === 'searching') body = <Searching origin={origin && origin.name} dest={dest && dest.name} />;
  else if (screen === 'routes') body = <RoutesScreen origin={origin} dest={dest} routes={routes} note={routeNote}
    onBack={()=>setScreen('input')} onChoose={rt=>{ setRoute(rt); setScreen('nav'); }} />;
  else if (screen === 'nav') body = <NavScreen route={route} soundOn={soundOn} onToggleSound={()=>setSoundOn(s=>!s)}
    onExit={()=>{ try{window.speechSynthesis&&window.speechSynthesis.cancel();}catch(e){} setScreen('routes'); }}
    onArrive={()=>setScreen('done')} />;
  else if (screen === 'done') body = <DoneScreen dest={dest && dest.name} onHome={resetHome} />;

  return (
    <div style={{ width:W, height:H, background:T.paper, borderRadius:46, overflow:'hidden',
      display:'flex', flexDirection:'column', position:'relative',
      boxShadow:'0 40px 90px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.06)' }}>
      <StatusBar bg={st.bg} fg={st.fg} />
      <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>{body}</div>
        {settingsOpen && <SettingsSheet soundOn={soundOn} vibrateOn={vibrateOn} voiceVol={voiceVol} voiceRate={voiceRate}
          onChange={changeSetting} onClose={()=>setSettingsOpen(false)} />}
      </div>
      {/* home indicator */}
      <div style={{ height:24, background: st.bg==='#1B2A41'||screen==='nav'?T.ink:T.paper,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <div style={{ width:130, height:5, borderRadius:3, background: st.fg, opacity:0.35 }} />
      </div>
    </div>
  );
}

// ── Scaling stage ───────────────────────────────────────────
function Stage() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function fit() {
      const s = Math.min((window.innerWidth - 40) / W, (window.innerHeight - 40) / H, 1);
      setScale(s);
    }
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ position:'fixed', inset:0, background:'#23252B',
      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      <div style={{ transform:`scale(${scale})`, transformOrigin:'center center' }}>
        <App />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Stage />);
