function statusTheme(screen) {
  if (screen === 'region' || screen === 'done') return { bg:T.paper, fg:T.ink };
  return { bg:T.ink, fg:'#fff' };
}

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

  const sr = saved.recents;
  const initialRecents = (sr && !Array.isArray(sr) && typeof sr === 'object') ? sr : {};

  const [screen, setScreen] = useState('region');
  const [region, setRegion] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [dest, setDest] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [routeNote, setRouteNote] = useState(null);
  const [route, setRoute] = useState(null);
  const [recents, setRecents] = useState(initialRecents);
  const [soundOn, setSoundOn] = useState(saved.soundOn ?? true);
  const [vibrateOn, setVibrateOn] = useState(saved.vibrateOn ?? true);
  const [voiceVol, setVoiceVol] = useState(saved.voiceVol ?? 'normal');
  const [voiceRate, setVoiceRate] = useState(saved.voiceRate ?? 'normal');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ recents, soundOn, vibrateOn, voiceVol, voiceRate })); } catch(e){}
  }, [recents, soundOn, vibrateOn, voiceVol, voiceRate]);

  useEffect(() => { setFeedbackSettings({ soundOn, vibrateOn, voiceVol, voiceRate }); }, [soundOn, vibrateOn, voiceVol, voiceRate]);

  function changeSetting(key, val) {
    if (key === 'soundOn') setSoundOn(val);
    else if (key === 'vibrateOn') setVibrateOn(val);
    else if (key === 'voiceVol') setVoiceVol(val);
    else if (key === 'voiceRate') setVoiceRate(val);
  }

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

  function removeRecent(name) {
    if (!region) return;
    setRecents(prev => ({ ...prev, [region.id]: (prev[region.id] || []).filter(r => r.name !== name) }));
  }

  function setField(field, value) {
    if (field === 'origin') setOrigin(value); else setDest(value);
  }

  async function doSearch() {
    addRecent(origin, dest);
    setScreen('searching');
    const t0 = Date.now();
    let note = null;
    try {
      const { routes: found, coords, note: okNote } = await searchRoutes(origin, dest);
      Object.assign(COORDS, coords);
      setRoutes(found);
      note = okNote || null;
    } catch (e) {
      const code = e && e.code;
      if (code === 'no_api') { setRoutes(ROUTES); note = 'demo'; }
      else if (code === 'too_close')  { setRoutes([]); note = 'too_close'; }
      else if (code === 'no_coords')  { setRoutes([]); note = 'no_coords'; }
      else { setRoutes([]); note = 'error'; }
    }
    setRouteNote(note);
    const dt = Date.now() - t0;
    if (dt < 500) await new Promise(r => setTimeout(r, 500 - dt));
    setScreen('routes');
  }

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
  const regionRecents = (region && recents[region.id]) || [];

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
    <div style={{ position:'fixed', inset:0, background:st.bg, display:'flex', flexDirection:'column',
      paddingTop:'env(safe-area-inset-top)' }}>
      <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column', background:st.bg }}>
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>{body}</div>
        {settingsOpen && <SettingsSheet soundOn={soundOn} vibrateOn={vibrateOn} voiceVol={voiceVol} voiceRate={voiceRate}
          onChange={changeSetting} onClose={()=>setSettingsOpen(false)} />}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
