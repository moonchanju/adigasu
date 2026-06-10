// ─────────────────────────────────────────────────────────────
// 어디가수? — Region · Route Input · Route Recommendation screens
// ─────────────────────────────────────────────────────────────
const { useState, useMemo } = React;

// Bell mark (logo glyph) — simple bell silhouette
function BellMark({ size = 40, color = T.ink }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display:'block' }}>
      <path fill={color} d="M24 4c-1.4 0-2.5 1-2.7 2.4C15.6 7.7 12 12.7 12 19v8l-3.4 4.2c-.9 1.1-.1 2.8 1.3 2.8h28.2c1.4 0 2.2-1.7 1.3-2.8L36 27v-8c0-6.3-3.6-11.3-9.3-12.6C26.5 5 25.4 4 24 4z"/>
      <path fill={color} d="M19 38a5 5 0 0010 0h-3.2a1.8 1.8 0 01-3.6 0H19z"/>
    </svg>
  );
}

// ── Screen 1: Region selection ──────────────────────────────
function RegionScreen({ onSelect }) {
  return (
    <div style={{ background:T.paper, minHeight:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'28px 22px 14px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{
          width:60, height:60, borderRadius:18, background:T.gold,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 6px 16px rgba(217,150,28,0.4)',
        }}>
          <BellMark size={36} color={T.ink} />
        </div>
        <div>
          <div style={{ fontSize:34, fontWeight:800, color:T.ink, letterSpacing:'-0.03em', lineHeight:1 }}>어디가수?</div>
          <div style={{ fontSize:18, fontWeight:600, color:T.muted, marginTop:6 }}>내릴 곳, 놓치지 마세요</div>
        </div>
      </div>

      <div style={{ padding:'10px 22px 6px', fontSize:22, fontWeight:800, color:T.inkSoft }}>어디로 가시나요?</div>

      <div style={{ padding:'8px 18px 24px', display:'flex', flexDirection:'column', gap:14 }}>
        {REGIONS.map(r => (
          <button key={r.id} disabled={!r.live} onClick={()=>r.live && onSelect(r)} style={{
            display:'flex', alignItems:'center', gap:18, textAlign:'left',
            background:T.surface, border:`2px solid ${T.line}`, borderRadius:22,
            padding:'18px 20px', cursor:r.live?'pointer':'default', opacity:r.live?1:0.55,
            boxShadow:r.live?T.shadow:'none', fontFamily:'inherit', width:'100%',
          }}>
            <div style={{
              width:62, height:62, borderRadius:18, flexShrink:0,
              background:r.tone, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:30, fontWeight:800,
            }}>{r.glyph}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:28, fontWeight:800, color:T.ink, lineHeight:1.1 }}>{r.name}</div>
              <div style={{ fontSize:16, fontWeight:600, color:T.muted, marginTop:3 }}>{r.sub}</div>
            </div>
            {r.live
              ? <Icon name="chevron" size={26} color={T.muted} />
              : <Pill bg={T.paperDeep} color={T.muted} size={15}>준비 중</Pill>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Search overlay (shared by origin/destination) ───────────
function SearchPanel({ field, region, recents, onPick, onClose }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const t = q.trim();
    if (!t) return [];
    return PLACES.filter(p => p.includes(t)).slice(0, 8);
  }, [q]);
  const label = field === 'origin' ? '어디서 타시나요?' : '어디서 내리시나요?';
  const accent = field === 'origin' ? T.green : T.red;

  return (
    <div style={{ position:'absolute', inset:0, background:T.paper, zIndex:30, display:'flex', flexDirection:'column' }}>
      <div style={{ background:accent, padding:'16px 16px 20px', color:'#fff', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
          <button onClick={onClose} aria-label="닫기" style={{
            width:46, height:46, borderRadius:23, border:'none', cursor:'pointer',
            background:'rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
          }}><Icon name="back" size={24} /></button>
          <div style={{ fontSize:22, fontWeight:800 }}>{label}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, background:'#fff', borderRadius:16, padding:'0 16px' }}>
          <Icon name="search" size={24} color={T.muted} />
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)}
            placeholder={field==='origin'?'출발지 입력':'도착지 입력'}
            style={{ flex:1, border:'none', outline:'none', padding:'18px 0', fontSize:22, fontWeight:700,
              color:T.ink, background:'transparent', fontFamily:'inherit' }} />
          {q && <button onClick={()=>setQ('')} aria-label="지우기" style={{ border:'none', background:'none', cursor:'pointer', padding:6 }}>
            <Icon name="x" size={22} color={T.muted} /></button>}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
        {q.trim() === '' && recents.length > 0 && (
          <div style={{ padding:'8px 22px 4px', fontSize:16, fontWeight:800, color:T.muted, display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="history" size={20} color={T.muted} /> 최근 검색
          </div>
        )}
        {q.trim() === ''
          ? recents.map((p,i) => (
              <Row key={i} icon="history" iconColor={T.muted} text={p} onClick={()=>onPick(p)} />
            ))
          : results.length
            ? results.map((p,i) => (
                <Row key={i} icon="pin" iconColor={accent} text={p} q={q} onClick={()=>onPick(p)} />
              ))
            : (
              <div style={{ textAlign:'center', padding:'48px 30px', color:T.muted }}>
                <div style={{ fontSize:21, fontWeight:800, color:T.inkSoft }}>검색 결과가 없습니다</div>
                <div style={{ fontSize:16, fontWeight:600, marginTop:8 }}>다른 이름으로 검색해 보세요</div>
              </div>
            )}
        {q.trim() === '' && recents.length === 0 && (
          <div style={{ textAlign:'center', padding:'56px 30px', color:T.muted }}>
            <div style={{ fontSize:20, fontWeight:800, color:T.inkSoft }}>최근 검색 기록이 없습니다</div>
            <div style={{ fontSize:16, fontWeight:600, marginTop:8 }}>장소 이름을 입력해 보세요</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, iconColor, text, q, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', display:'flex', alignItems:'center', gap:16, padding:'16px 22px',
      background:'none', border:'none', borderBottom:`1px solid ${T.line}`, cursor:'pointer',
      textAlign:'left', fontFamily:'inherit',
    }}>
      <div style={{ width:42, height:42, borderRadius:21, background:T.paperDeep, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon name={icon} size={22} color={iconColor} />
      </div>
      <span style={{ fontSize:22, fontWeight:700, color:T.ink }}>{text}</span>
    </button>
  );
}

// ── Screen 2: Route input ───────────────────────────────────
function InputScreen({ region, origin, dest, recents, onBack, onSet, onSearch }) {
  const [panel, setPanel] = useState(null); // 'origin' | 'dest' | null

  const Field = ({ field, value, placeholder, dotColor, icon }) => (
    <button onClick={()=>setPanel(field)} style={{
      width:'100%', display:'flex', alignItems:'center', gap:16, background:T.surface,
      border:`2px solid ${value?dotColor:T.line}`, borderRadius:20, padding:'20px 20px',
      cursor:'pointer', boxShadow:T.shadow, textAlign:'left', fontFamily:'inherit',
    }}>
      <div style={{ width:46, height:46, borderRadius:23, background:dotColor, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon name={icon} size={24} />
      </div>
      <span style={{ fontSize:24, fontWeight:800, color:value?T.ink:T.muted }}>
        {value || placeholder}
      </span>
    </button>
  );

  return (
    <div style={{ background:T.paper, minHeight:'100%', display:'flex', flexDirection:'column', position:'relative' }}>
      <TopBar title={`${region.name} 경로 찾기`} onBack={onBack} />

      <div style={{ padding:'20px 18px', display:'flex', flexDirection:'column', gap:14 }}>
        <Field field="origin" value={origin} placeholder="출발지를 입력하세요" dotColor={T.green} icon="pin" />
        <Field field="dest"   value={dest}   placeholder="도착지를 입력하세요" dotColor={T.red}   icon="nav" />
      </div>

      <div style={{ flex:1 }} />
      <div style={{ padding:'18px 18px calc(18px + env(safe-area-inset-bottom))' }}>
        <PrimaryButton icon="search" disabled={!origin || !dest} onClick={onSearch}>경로 찾기</PrimaryButton>
      </div>

      {panel && (
        <SearchPanel
          field={panel} region={region} recents={recents}
          onClose={()=>setPanel(null)}
          onPick={(p)=>{ onSet(panel, p); setPanel(null); }}
        />
      )}
    </div>
  );
}

// ── Screen 3: Route recommendation ──────────────────────────
function RoutesScreen({ origin, dest, onBack, onChoose }) {
  return (
    <div style={{ background:T.paper, minHeight:'100%', display:'flex', flexDirection:'column' }}>
      <TopBar title={`${origin} → ${dest}`} subtitle="환승 적은 순" onBack={onBack} />
      <div style={{ padding:'18px 18px 26px', display:'flex', flexDirection:'column', gap:16 }}>
        {ROUTES.map(rt => <RouteCard key={rt.id} rt={rt} onChoose={()=>onChoose(rt)} />)}
      </div>
    </div>
  );
}

function RouteCard({ rt, onChoose }) {
  const rec = rt.recommended;
  return (
    <div style={{
      background:T.surface, borderRadius:24, padding:'20px 20px 22px',
      border:`3px solid ${rec?T.gold:T.line}`, boxShadow:rec?T.shadowLg:T.shadow,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        {rec
          ? <Pill bg={T.gold} color={T.goldText} size={17}><Icon name="star" size={18} color={T.goldText} /> 추천</Pill>
          : <span style={{ fontSize:16, fontWeight:700, color:T.muted }}>대체 경로</span>}
        <Pill bg={rt.transfers===0?T.green:T.inkSoft} size={17}>
          {rt.transfers===0 ? '환승 없음' : `환승 ${rt.transfers}회`}
        </Pill>
      </div>

      <div style={{ display:'flex', alignItems:'baseline', gap:12, marginTop:4 }}>
        <span style={{ fontSize:52, fontWeight:800, color:T.ink, letterSpacing:'-0.03em', lineHeight:1 }}>{rt.durationMin}분</span>
        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:18, fontWeight:700, color:T.muted }}>
          <Icon name="clock" size={20} color={T.muted} /> {rt.departAt} → {rt.arriveAt}
        </span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', margin:'16px 0 4px' }}>
        {rt.legs.map((leg,i) => (
          <React.Fragment key={i}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 13px', borderRadius:12,
              background:leg.color, color:'#fff', fontSize:19, fontWeight:800 }}>
              <Icon name="bus" size={20} /> {leg.line}
            </span>
            {i < rt.legs.length-1 && <Icon name="chevron" size={20} color={T.muted} />}
          </React.Fragment>
        ))}
        <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:16, fontWeight:700, color:T.muted, marginLeft:2 }}>
          <Icon name="walk" size={18} color={T.muted} /> 도보 {rt.walkMin}분
        </span>
      </div>

      <div style={{ marginTop:16 }}>
        <PrimaryButton tone={rec?'gold':'ink'} icon="nav" onClick={onChoose}>이 경로로 안내</PrimaryButton>
      </div>
    </div>
  );
}

Object.assign(window, { RegionScreen, InputScreen, RoutesScreen, BellMark });
