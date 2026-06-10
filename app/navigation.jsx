// ─────────────────────────────────────────────────────────────
// 어디가수? — Navigation engine + live guide + alerts + done
// ─────────────────────────────────────────────────────────────
const { useEffect, useRef } = React;

// ── feedback helpers ────────────────────────────────────────
function vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch(e){} }
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

const TICK_MS = 3000; // simulated time between stops

// ── Build a flat bar of the whole journey + position map ────
function buildBar(route) {
  const barStops = [];
  const posMap = {};
  route.legs.forEach((leg, li) => {
    leg.stops.forEach((name, si) => {
      if (li > 0 && si === 0) { posMap[`${li}-0`] = barStops.length - 1; return; }
      const isAlight = si === leg.stops.length - 1;
      const isLast = li === route.legs.length - 1;
      posMap[`${li}-${si}`] = barStops.length;
      barStops.push({ name, legIdx: li, color: leg.color,
        transfer: isAlight && !isLast, final: isAlight && isLast, board: li === 0 && si === 0 });
    });
  });
  return { barStops, posMap };
}

// ── Live guide screen ───────────────────────────────────────
function NavScreen({ route, soundOn, onToggleSound, onExit, onArrive }) {
  const { barStops, posMap } = useMemo(() => buildBar(route), [route]);
  const [legIdx, setLegIdx] = useState(0);
  const [stopIdx, setStopIdx] = useState(0);   // index within current leg
  const [phase, setPhase] = useState('riding'); // riding | preAlert | transfer | finalAlert | done
  const [paused, setPaused] = useState(false);
  const preFired = useRef(-1);

  const leg = route.legs[legIdx];
  const alightIdx = leg.stops.length - 1;
  const remaining = alightIdx - stopIdx;
  const isLastLeg = legIdx === route.legs.length - 1;
  const alightName = leg.stops[alightIdx];
  const nextName = remaining > 0 ? leg.stops[stopIdx + 1] : alightName;
  const barPos = posMap[`${legIdx}-${stopIdx}`] ?? 0;

  // total stops remaining across whole journey (for ETA)
  const totalRemain = (barStops.length - 1) - barPos;
  const minsLeft = Math.max(1, Math.round(totalRemain * (route.durationMin / (barStops.length - 1))));

  // advance one stop
  function advance() {
    setStopIdx(prev => {
      const next = prev + 1;
      const rem = alightIdx - next;
      if (rem <= 0) {
        if (isLastLeg) { setPhase('finalAlert'); fireFinal(); }
        else { setPhase('transfer'); fireTransfer(); }
        return alightIdx;
      }
      if (rem === 1 && preFired.current !== legIdx) {
        preFired.current = legIdx;
        setPhase('preAlert'); firePre();
      }
      return next;
    });
  }

  function firePre()   { vibrate([200,100,200]); speak(`곧 내리세요. 다음 정류장은 ${alightName} 입니다.`, soundOn); }
  function fireTransfer(){ const nl = route.legs[legIdx+1]; vibrate([300,120,300]); speak(`환승입니다. ${nl.line}번 버스로 갈아타세요.`, soundOn); }
  function fireFinal()  { vibrate([400,150,400,150,500]); speak(`지금 내리세요! ${alightName} 입니다.`, soundOn); }

  // auto timer (paused during alerts)
  useEffect(() => {
    if (phase !== 'riding' || paused) return;
    const id = setTimeout(advance, TICK_MS);
    return () => clearTimeout(id);
  }, [phase, paused, stopIdx, legIdx]);

  function dismissPre() { setPhase('riding'); }
  function doTransfer() {
    setLegIdx(l => l + 1); setStopIdx(0); setPhase('riding');
    speak(`${route.legs[legIdx+1].line}번 버스 탑승. 안내를 이어갑니다.`, soundOn);
  }

  return (
    <div style={{ background:T.ink, minHeight:'100%', display:'flex', flexDirection:'column', position:'relative', color:'#fff' }}>
      <TopBar title="안내 중" subtitle={`${leg.line}번 버스 탑승 중`} onBack={onExit} bg={T.ink}
        right={
          <button onClick={onToggleSound} aria-label="음성 안내" style={{
            width:48, height:48, borderRadius:24, border:'none', cursor:'pointer',
            background: soundOn?T.gold:'rgba(255,255,255,0.14)', color: soundOn?T.goldText:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}><Icon name={soundOn?'sound':'mute'} size={24} /></button>
        } />

      {/* progress bar */}
      <ProgressBar barStops={barStops} pos={barPos} />

      {/* main info card */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'8px 20px 16px' }}>
        <div style={{ background:'#fff', borderRadius:28, padding:'30px 26px 32px', color:T.ink, boxShadow:T.shadowLg, textAlign:'center' }}>
          <div style={{ fontSize:20, fontWeight:800, color:T.muted }}>다음 정류장</div>
          <div style={{ fontSize:46, fontWeight:800, color:T.ink, letterSpacing:'-0.03em', margin:'4px 0 18px', lineHeight:1.1 }}>{nextName}</div>
          <div style={{ background: remaining<=2?'#FCEAD0':T.paperDeep, borderRadius:20, padding:'18px 0',
            color: remaining<=2?T.goldDeep:T.ink, display:'flex', alignItems:'baseline', justifyContent:'center', gap:6 }}>
            <span style={{ fontSize:64, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1 }}>{remaining}</span>
            <span style={{ fontSize:28, fontWeight:800 }}>정거장 남음</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18, marginTop:18, color:T.inkSoft }}>
            <span style={{ display:'flex', alignItems:'center', gap:7, fontSize:19, fontWeight:700 }}>
              <Icon name="flag" size={20} color={T.red} /> {route.arriveAt} 도착
            </span>
            <span style={{ width:1, height:18, background:T.line }} />
            <span style={{ fontSize:19, fontWeight:700 }}>약 {minsLeft}분 남음</span>
          </div>
        </div>
      </div>

      {/* controls */}
      <div style={{ padding:'0 18px calc(20px + env(safe-area-inset-bottom))', display:'flex', gap:12 }}>
        <button onClick={()=>setPaused(p=>!p)} aria-label="일시정지" style={ctrlBtn(false)}>
          <Icon name={paused?'nav':'clock'} size={24} color="#fff" />
        </button>
        <button onClick={advance} title="다음 정류장 (데모)" style={ctrlBtn(true)}>
          <Icon name="forward" size={22} color={T.goldText} />
        </button>
        <button onClick={onExit} style={{ flex:1, minHeight:64, borderRadius:18, border:'2px solid rgba(255,255,255,0.25)',
          background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:20, fontWeight:800, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit' }}>
          <Icon name="x" size={22} /> 여기서 내릴게요
        </button>
      </div>

      {/* simulated-GPS hint */}
      <div style={{ textAlign:'center', fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.45)', padding:'2px 0 8px' }}>
        실시간 위치로 자동 안내 중 · ⏩ 로 빨리 보기
      </div>

      {phase==='preAlert' && <PreAlert name={alightName} onConfirm={dismissPre} />}
      {phase==='transfer' && <TransferSheet from={alightName} nextLeg={route.legs[legIdx+1]} soundOn={soundOn} onBoard={doTransfer} />}
      {phase==='finalAlert' && <FinalAlert name={alightName} onConfirm={onArrive} />}
    </div>
  );
}

function ctrlBtn(gold) {
  return { width:64, minHeight:64, borderRadius:18, border:'none', cursor:'pointer', flexShrink:0,
    background: gold?T.gold:'rgba(255,255,255,0.12)',
    display:'flex', alignItems:'center', justifyContent:'center' };
}

// ── Progress bar ────────────────────────────────────────────
function ProgressBar({ barStops, pos }) {
  const n = barStops.length;
  return (
    <div style={{ padding:'22px 24px 8px' }}>
      <div style={{ position:'relative', height:26, display:'flex', alignItems:'center' }}>
        <div style={{ position:'absolute', left:6, right:6, height:6, borderRadius:3, background:'rgba(255,255,255,0.18)' }} />
        <div style={{ position:'absolute', left:6, height:6, borderRadius:3, background:T.gold,
          width:`calc((100% - 12px) * ${n>1?pos/(n-1):0})`, transition:'width .5s ease' }} />
        <div style={{ position:'absolute', left:0, right:0, display:'flex', justifyContent:'space-between' }}>
          {barStops.map((s,i) => {
            const done = i < pos, here = i === pos;
            let bg = 'rgba(255,255,255,0.35)';
            if (done) bg = T.gold;
            if (s.board) bg = T.green;
            if (s.final) bg = here?T.red:(done?T.gold:'rgba(255,255,255,0.35)');
            return (
              <div key={i} style={{ position:'relative' }}>
                {here && <div className="ag-ping" style={{ position:'absolute', inset:-7, borderRadius:'50%', background:T.gold, opacity:0.5 }} />}
                <div style={{ width: here?22:14, height: here?22:14, borderRadius:'50%',
                  background: here?T.gold:bg, border: s.transfer?`3px solid #fff`:'none',
                  position:'relative', transition:'all .3s', margin: here?0:4 }} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:15, fontWeight:800 }}>
        <span style={{ color:T.gold }}>{barStops[0].name}</span>
        <span style={{ color:'rgba(255,255,255,0.85)' }}>{barStops[n-1].name}</span>
      </div>
    </div>
  );
}

// ── Pre-alert bottom sheet (곧 내리세요) ────────────────────
function PreAlert({ name, onConfirm }) {
  return (
    <div style={{ position:'absolute', inset:0, zIndex:40, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div onClick={onConfirm} style={{ position:'absolute', inset:0, background:'rgba(15,23,38,0.45)' }} />
      <div className="ag-sheet" style={{ position:'relative', background:T.gold, borderRadius:'32px 32px 0 0',
        padding:'26px 24px calc(26px + env(safe-area-inset-bottom))', textAlign:'center', boxShadow:T.shadowLg }}>
        <div className="ag-bell" style={{ display:'flex', justifyContent:'center', marginBottom:6 }}>
          <Icon name="bell" size={52} color={T.ink} />
        </div>
        <div style={{ fontSize:44, fontWeight:800, color:T.ink, letterSpacing:'-0.03em' }}>곧 내리세요!</div>
        <div style={{ background:'#fff', borderRadius:20, padding:'18px 0', margin:'18px 0 22px' }}>
          <div style={{ fontSize:18, fontWeight:800, color:T.muted }}>다음 정류장</div>
          <div style={{ fontSize:38, fontWeight:800, color:T.ink, marginTop:2 }}>{name}</div>
        </div>
        <PrimaryButton tone="ink" onClick={onConfirm}>확인했어요</PrimaryButton>
      </div>
    </div>
  );
}

// ── Transfer sheet (갈아타세요) ─────────────────────────────
function TransferSheet({ from, nextLeg, onBoard }) {
  const [count, setCount] = useState(8);
  useEffect(() => {
    if (count <= 0) { onBoard(); return; }
    const id = setTimeout(()=>setCount(c=>c-1), 1000);
    return () => clearTimeout(id);
  }, [count]);
  return (
    <div style={{ position:'absolute', inset:0, zIndex:40, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(15,23,38,0.5)' }} />
      <div className="ag-sheet" style={{ position:'relative', background:'#fff', borderRadius:'32px 32px 0 0',
        padding:'28px 24px calc(26px + env(safe-area-inset-bottom))', textAlign:'center', boxShadow:T.shadowLg }}>
        <Pill bg={T.inkSoft} size={17}>환승</Pill>
        <div style={{ fontSize:34, fontWeight:800, color:T.ink, margin:'14px 0 4px', letterSpacing:'-0.02em' }}>여기서 갈아타세요</div>
        <div style={{ fontSize:18, fontWeight:700, color:T.muted, marginBottom:18 }}>{from} 정류장에서 내려요</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, background:T.paper, borderRadius:20, padding:'18px 0', marginBottom:8 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:14,
            background:nextLeg.color, color:'#fff', fontSize:26, fontWeight:800 }}>
            <Icon name="bus" size={26} /> {nextLeg.line}번
          </span>
          <span style={{ fontSize:22, fontWeight:800, color:T.ink }}>버스로</span>
        </div>
        <div style={{ fontSize:15, fontWeight:600, color:T.muted, margin:'10px 0 18px' }}>
          버스에 타면 <b style={{color:T.green}}>{count}초</b> 후 자동으로 안내가 이어집니다
        </div>
        <PrimaryButton tone="green" icon="check" onClick={onBoard}>갈아탔어요</PrimaryButton>
      </div>
    </div>
  );
}

// ── Final alert (지금 내리세요) — full red ───────────────────
function FinalAlert({ name, onConfirm }) {
  return (
    <div className="ag-flash" style={{ position:'absolute', inset:0, zIndex:50, background:T.red,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'24px', textAlign:'center', color:'#fff' }}>
      <div className="ag-bell" style={{ marginBottom:8 }}><Icon name="alert" size={76} color="#fff" stroke={2.6} /></div>
      <div style={{ fontSize:64, fontWeight:800, lineHeight:1.05, letterSpacing:'-0.03em' }}>지금<br/>내리세요!</div>
      <div style={{ background:'rgba(255,255,255,0.22)', borderRadius:18, padding:'12px 26px', margin:'24px 0 36px' }}>
        <span style={{ fontSize:34, fontWeight:800 }}>{name}</span>
      </div>
      <div style={{ width:'100%', maxWidth:340 }}>
        <PrimaryButton tone="white" onClick={onConfirm}>확인</PrimaryButton>
      </div>
    </div>
  );
}

// ── Done screen ─────────────────────────────────────────────
function DoneScreen({ dest, onHome }) {
  useEffect(()=>{ vibrate(80); }, []);
  return (
    <div style={{ background:T.paper, minHeight:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'30px', textAlign:'center' }}>
      <div className="ag-pop" style={{ width:118, height:118, borderRadius:'50%', background:T.green,
        display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 12px 30px rgba(30,122,82,0.35)' }}>
        <Icon name="check" size={62} color="#fff" stroke={3} />
      </div>
      <div style={{ fontSize:42, fontWeight:800, color:T.ink, marginTop:28, letterSpacing:'-0.03em' }}>도착했어요!</div>
      <div style={{ fontSize:21, fontWeight:700, color:T.muted, marginTop:10 }}>
        <b style={{ color:T.green }}>{dest}</b> 에 안전하게 도착했습니다
      </div>
      <div style={{ width:'100%', maxWidth:330, marginTop:40 }}>
        <PrimaryButton tone="ink" icon="back" onClick={onHome}>처음으로</PrimaryButton>
      </div>
    </div>
  );
}

Object.assign(window, { NavScreen, DoneScreen });
