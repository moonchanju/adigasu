// ─────────────────────────────────────────────────────────────
// 어디가수? — Navigation engine + live guide + alerts + done
// ─────────────────────────────────────────────────────────────
const { useEffect, useRef } = React;

// feedback helpers(vibrate, speak)는 geo.jsx에서 전역으로 제공된다.

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
  const [mode, setMode] = useState('gps');     // 'gps' (실시간 위치) | 'sim' (데모)
  const preFired = useRef(-1);
  const geo = useGeolocation(mode === 'gps');  // 실시간 GPS 구독 (gps 모드일 때만)

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

  // 현재 leg 안에서 target 정류장 인덱스까지 진행시키고, 임계 도달 시 알림 발생.
  // GPS(거리 기반)와 데모(타이머·버튼) 양쪽이 공유하는 단일 진행 함수.
  function arriveAt(target) {
    setStopIdx(prev => {
      if (target <= prev) return prev;          // 뒤로/제자리 이동 무시
      const idx = Math.min(target, alightIdx);
      const rem = alightIdx - idx;
      if (rem <= 0) {
        if (isLastLeg) { setPhase('finalAlert'); fireFinal(); }
        else { setPhase('transfer'); fireTransfer(); }
        return alightIdx;
      }
      if (rem <= 1 && preFired.current !== legIdx) {
        preFired.current = legIdx;
        setPhase('preAlert'); firePre();
      }
      return idx;
    });
  }
  function advance() { arriveAt(stopIdx + 1); }  // 데모: 한 정류장 전진

  function firePre()   { vibrate([200,100,200]); speak(`곧 내리세요. 다음 정류장은 ${alightName} 입니다.`, soundOn); }
  function fireTransfer(){ const nl = route.legs[legIdx+1]; vibrate([300,120,300]); speak(`환승입니다. ${nl.line}번 버스로 갈아타세요.`, soundOn); }
  function fireFinal()  { vibrate([400,150,400,150,500]); speak(`지금 내리세요! ${alightName} 입니다.`, soundOn); }

  // ── GPS 엔진: 실시간 위치 → 지오펜싱 → 진행/알림 ──────────────
  useEffect(() => {
    if (mode !== 'gps' || phase !== 'riding' || !geo.coords) return;
    const g = geofenceLeg(leg.stops, geo.coords);
    if (!g) return;
    if (g.alightDist < GEO.ARRIVE_R) { arriveAt(alightIdx); return; }          // 하차역 도착
    if (g.alightDist < GEO.PRE_R)    { arriveAt(Math.max(stopIdx, alightIdx - 1)); return; } // 곧 내리세요
    if (g.nearestDist < GEO.ARRIVE_R && g.nearestIdx > stopIdx) arriveAt(g.nearestIdx); // 중간 정류장 통과
  }, [geo.coords, mode, phase, stopIdx, legIdx]);

  // ── 데모 모드 타이머 (이동 없이 흐름 확인용) ─────────────────
  useEffect(() => {
    if (mode !== 'sim' || phase !== 'riding' || paused) return;
    const id = setTimeout(advance, TICK_MS);
    return () => clearTimeout(id);
  }, [mode, phase, paused, stopIdx, legIdx]);

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

      {/* GPS status banner */}
      <GpsStatus mode={mode} geo={geo} />

      {/* controls */}
      <div style={{ padding:'0 18px calc(20px + env(safe-area-inset-bottom))', display:'flex', gap:12 }}>
        {mode === 'sim' && (
          <button onClick={()=>setPaused(p=>!p)} aria-label="일시정지" style={ctrlBtn(false)}>
            <Icon name={paused?'nav':'clock'} size={24} color="#fff" />
          </button>
        )}
        <button onClick={advance} title="다음 정류장 (데모)" style={ctrlBtn(true)}>
          <Icon name="forward" size={22} color={T.goldText} />
        </button>
        <button onClick={onExit} style={{ flex:1, minHeight:64, borderRadius:18, border:'2px solid rgba(255,255,255,0.25)',
          background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:20, fontWeight:800, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit' }}>
          <Icon name="x" size={22} /> 여기서 내릴게요
        </button>
      </div>

      {/* mode toggle: 실시간 GPS ↔ 데모 */}
      <div style={{ textAlign:'center', padding:'2px 0 10px' }}>
        <button onClick={()=>{ setPaused(false); setMode(m => m === 'gps' ? 'sim' : 'gps'); }}
          style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
            fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.6)', textDecoration:'underline', padding:6 }}>
          {mode === 'gps' ? '위치 없이 데모로 보기 ⏩' : '실시간 GPS로 전환'}
        </button>
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

// ── GPS 상태 배너 ───────────────────────────────────────────
function GpsStatus({ mode, geo }) {
  let dot = T.muted, text = '', sub = '';
  if (mode === 'sim') {
    dot = T.gold; text = '데모 모드'; sub = '⏩ 버튼으로 정류장을 넘겨 흐름을 확인하세요';
  } else if (geo.status === 'active') {
    dot = T.green; text = '실시간 위치로 안내 중';
    sub = geo.accuracy != null ? `GPS 정확도 ±${Math.round(geo.accuracy)}m` : '';
  } else if (geo.status === 'locating') {
    dot = T.gold; text = '위치를 찾는 중…'; sub = '잠시만 기다려 주세요';
  } else if (geo.status === 'denied') {
    dot = T.red; text = '위치 권한이 꺼져 있어요'; sub = '설정에서 권한을 켜거나 데모로 보세요';
  } else if (geo.status === 'unsupported') {
    dot = T.red; text = '이 기기는 위치 기능 미지원'; sub = '데모 모드로 확인하세요';
  } else {
    dot = T.red; text = '위치를 가져오지 못했어요'; sub = geo.error || '';
  }
  return (
    <div style={{ margin:'0 18px 10px', display:'flex', alignItems:'center', gap:10,
      background:'rgba(255,255,255,0.07)', borderRadius:14, padding:'10px 14px' }}>
      <span style={{ width:11, height:11, borderRadius:'50%', background:dot, flexShrink:0,
        boxShadow:`0 0 0 4px ${dot}22` }} />
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{text}</div>
        {sub && <div style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,0.55)', marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Progress bar ────────────────────────────────────────────
// 점은 정류장 인덱스 비율(0~1)로 트랙 위에 절대배치한다 → 정류장 수에 상관없이
// 항상 바 폭 안에 들어와 화면을 넘치지 않는다. 정류장이 많아 빽빽해지면
// 핵심 지점(출발·환승·도착·현재·다음)만 점으로 남겨 가독성을 지킨다.
const BAR_MAX_DOTS = 14;
function ProgressBar({ barStops, pos }) {
  const n = barStops.length;
  const frac = i => n > 1 ? i / (n - 1) : 0;
  const dense = n > BAR_MAX_DOTS;
  const keep = (s, i) =>
    !dense || i === 0 || i === n - 1 ||
    s.board || s.transfer || s.final ||
    i === pos || i === pos + 1;
  return (
    <div style={{ padding:'22px 24px 8px' }}>
      <div style={{ position:'relative', height:26 }}>
        <div style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', left:6, right:6, height:6, borderRadius:3, background:'rgba(255,255,255,0.18)' }} />
        <div style={{ position:'absolute', top:'50%', transform:'translateY(-50%)', left:6, height:6, borderRadius:3, background:T.gold,
          width:`calc((100% - 12px) * ${frac(pos)})`, transition:'width .5s ease' }} />
        {barStops.map((s,i) => {
          if (!keep(s,i)) return null;
          const done = i < pos, here = i === pos;
          let bg = 'rgba(255,255,255,0.35)';
          if (done) bg = T.gold;
          if (s.board) bg = T.green;
          if (s.final) bg = here?T.red:(done?T.gold:'rgba(255,255,255,0.35)');
          const sz = here?22:14;
          return (
            <div key={i} style={{ position:'absolute', top:'50%',
              left:`calc(6px + (100% - 12px) * ${frac(i)})`,
              transform:'translate(-50%, -50%)', transition:'left .5s ease' }}>
              {here && <div className="ag-ping" style={{ position:'absolute', inset:-7, borderRadius:'50%', background:T.gold, opacity:0.5 }} />}
              <div style={{ width:sz, height:sz, borderRadius:'50%',
                background: here?T.gold:bg, border: s.transfer?`3px solid #fff`:'none',
                position:'relative', transition:'all .3s' }} />
            </div>
          );
        })}
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
