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

  const [screen, setScreen] = useState('region');
  const [region, setRegion] = useState(null);
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [route, setRoute] = useState(null);
  const [recents, setRecents] = useState(saved.recents || []);
  const [soundOn, setSoundOn] = useState(saved.soundOn ?? true);

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify({ recents, soundOn })); } catch(e){}
  }, [recents, soundOn]);

  function addRecent(...names) {
    setRecents(prev => {
      const merged = [...names.filter(Boolean), ...prev];
      return [...new Set(merged)].slice(0, 6);
    });
  }

  function setField(field, value) {
    if (field === 'origin') setOrigin(value); else setDest(value);
  }

  function doSearch() {
    addRecent(origin, dest);
    setScreen('searching');
    setTimeout(() => setScreen('routes'), 1300);
  }

  function resetHome() {
    setOrigin(''); setDest(''); setRoute(null); setRegion(null); setScreen('region');
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
  }

  const st = statusTheme(screen);

  let body;
  if (screen === 'region') body = <RegionScreen onSelect={r=>{ setRegion(r); setScreen('input'); }} />;
  else if (screen === 'input') body = <InputScreen region={region} origin={origin} dest={dest} recents={recents}
    onBack={()=>setScreen('region')} onSet={setField} onSearch={doSearch} />;
  else if (screen === 'searching') body = <Searching origin={origin} dest={dest} />;
  else if (screen === 'routes') body = <RoutesScreen origin={origin} dest={dest}
    onBack={()=>setScreen('input')} onChoose={rt=>{ setRoute(rt); setScreen('nav'); }} />;
  else if (screen === 'nav') body = <NavScreen route={route} soundOn={soundOn} onToggleSound={()=>setSoundOn(s=>!s)}
    onExit={()=>{ try{window.speechSynthesis&&window.speechSynthesis.cancel();}catch(e){} setScreen('routes'); }}
    onArrive={()=>setScreen('done')} />;
  else if (screen === 'done') body = <DoneScreen dest={dest} onHome={resetHome} />;

  return (
    <div style={{ width:W, height:H, background:T.paper, borderRadius:46, overflow:'hidden',
      display:'flex', flexDirection:'column', position:'relative',
      boxShadow:'0 40px 90px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.06)' }}>
      <StatusBar bg={st.bg} fg={st.fg} />
      <div style={{ flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch' }}>{body}</div>
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
