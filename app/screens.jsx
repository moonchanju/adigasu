// ─────────────────────────────────────────────────────────────
// 어디가수? — Region · Route Input · Route Recommendation screens
// ─────────────────────────────────────────────────────────────
const { useState, useMemo } = React;

// 브랜드 마크 — 친근한 정면 버스 + 목적지 핀 (images/logo.svg 와 동일)
function BrandMark({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" style={{ display:'block' }}>
      <defs>
        <linearGradient id="agGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7C25A" /><stop offset="1" stopColor="#E0A12A" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="88" height="88" rx="26" fill="url(#agGold)" />
      <rect x="4" y="4" width="88" height="42" rx="26" fill="#fff" opacity="0.10" />
      <g>
        <rect x="27" y="29" width="42" height="43" rx="12" fill="#FFFDF8" />
        <rect x="33" y="36" width="12" height="12" rx="3.5" fill="#1B2A41" />
        <rect x="51" y="36" width="12" height="12" rx="3.5" fill="#1B2A41" />
        <rect x="31" y="60" width="34" height="6" rx="3" fill="#1B2A41" />
        <circle cx="36" cy="72" r="5" fill="#1B2A41" /><circle cx="60" cy="72" r="5" fill="#1B2A41" />
      </g>
      <g>
        <path d="M70 17.5c-6 0-10.5 4.5-10.5 10.5 0 7 10.5 15.5 10.5 15.5S80.5 35 80.5 28c0-6-4.5-10.5-10.5-10.5z"
          fill="#D8392C" stroke="#FFFDF8" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="70" cy="28" r="3.8" fill="#FFFDF8" />
      </g>
    </svg>
  );
}

// ── Screen 1: Region selection ──────────────────────────────
function RegionScreen({ onSelect }) {
  return (
    <div style={{ background:T.paper, minHeight:'100%', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'28px 22px 14px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ borderRadius:17, lineHeight:0, boxShadow:'0 6px 16px rgba(217,150,28,0.38)' }}>
          <BrandMark size={62} />
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
              width:66, height:66, borderRadius:18, flexShrink:0, overflow:'hidden',
              background:r.tone, display:'flex', alignItems:'flex-end', justifyContent:'center',
            }}><RegionArt id={r.id} color="#fff" style={{ width:'100%', height:'86%' }} /></div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:28, fontWeight:800, color:T.ink, lineHeight:1.1 }}>{r.name}</div>
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

// 데모 폴백: 정적 PLACES를 역 객체로 변환
function staticStations(t) {
  return PLACES.filter(p => p.includes(t)).slice(0, 8)
    .map(name => ({ name, lat: (COORDS[name]||{}).lat, lng: (COORDS[name]||{}).lng, cls:'bus' }));
}

// ── Search overlay (shared by origin/destination) ───────────
function SearchPanel({ field, region, recents, soundOn, onPick, onClose, onRemove }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);   // 폴백(데모 데이터) 사용 중 여부

  // 입력 디바운스 후 프록시 검색 → 실패 시 정적 데이터로 폴백
  useEffect(() => {
    const t = q.trim();
    if (!t) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const list = await searchStations(t, region);
        setResults(list); setDemo(false);
      } catch (e) {
        setResults(staticStations(t)); setDemo(true);
      } finally { setLoading(false); }
    }, 280);
    return () => clearTimeout(id);
  }, [q]);

  const label = field === 'origin' ? '어디서 타시나요?' : '어디서 내리시나요?';
  const accent = field === 'origin' ? T.green : T.red;

  // 역 선택 시 피드백: 짧은 진동 + (음성 안내 설정 시) 선택 안내 발화
  function handlePick(p) {
    vibrate(35);
    speak(`${p.name}, ${field === 'origin' ? '출발지로' : '도착지로'} 선택했습니다`, soundOn);
    onPick(p);
  }

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
              <RecentRow key={p.name||i} text={p.name} onClick={()=>handlePick(p)} onRemove={()=>onRemove(p.name)} />
            ))
          : loading
            ? (
              <div style={{ textAlign:'center', padding:'40px 30px', color:T.muted }}>
                <div className="ag-spin" style={{ width:38, height:38, margin:'0 auto 14px', borderRadius:'50%',
                  border:`5px solid ${T.line}`, borderTopColor:accent }} />
                <div style={{ fontSize:17, fontWeight:700 }}>검색 중…</div>
              </div>
            )
            : results.length
              ? results.map((p,i) => (
                  <Row key={p.id||i} icon={p.cls==='subway'?'nav':'pin'} iconColor={accent}
                    text={p.name} sub={p.cls==='subway'?'이 위치에서 버스로 안내':undefined}
                    badge={p.cls==='subway'?'🚇':'🚌'} onClick={()=>handlePick(p)} />
                ))
              : (
                <div style={{ textAlign:'center', padding:'48px 30px', color:T.muted }}>
                  <div style={{ fontSize:21, fontWeight:800, color:T.inkSoft }}>검색 결과가 없습니다</div>
                  <div style={{ fontSize:16, fontWeight:600, marginTop:8 }}>다른 이름으로 검색해 보세요</div>
                </div>
              )}
        {demo && results.length > 0 && (
          <div style={{ textAlign:'center', padding:'10px 30px 4px', fontSize:13, fontWeight:700, color:T.muted }}>
            · 데모 데이터(대구) — ODsay 키 설정 시 실데이터로 전환 ·
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

function Row({ icon, iconColor, text, sub, badge, onClick }) {
  return (
    // onMouseDown preventDefault: 포커스된 입력창의 blur가 첫 탭을 먹는 것을 막아 단일 탭 선택
    <button onClick={onClick} onMouseDown={e=>e.preventDefault()} style={{
      width:'100%', display:'flex', alignItems:'center', gap:16, padding:'16px 22px',
      background:'none', border:'none', borderBottom:`1px solid ${T.line}`, cursor:'pointer',
      textAlign:'left', fontFamily:'inherit',
    }}>
      <div style={{ width:42, height:42, borderRadius:21, background:T.paperDeep, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon name={icon} size={22} color={iconColor} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <span style={{ display:'block', fontSize:22, fontWeight:700, color:T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{text}</span>
        {sub && <span style={{ display:'block', fontSize:14, fontWeight:600, color:T.muted, marginTop:2 }}>{sub}</span>}
      </div>
      {badge && (
        <span aria-label={badge==='🚇'?'지하철':'버스'} title={badge==='🚇'?'지하철':'버스'}
          style={{ flexShrink:0, fontSize:26, lineHeight:1 }}>{badge}</span>
      )}
    </button>
  );
}

// 최근 검색 행 — 본문(선택) + 삭제(X) 두 버튼 분리 (버튼 중첩 회피)
function RecentRow({ text, onClick, onRemove }) {
  return (
    <div style={{ display:'flex', alignItems:'center', borderBottom:`1px solid ${T.line}` }}>
      <button onClick={onClick} onMouseDown={e=>e.preventDefault()} style={{
        flex:1, minWidth:0, display:'flex', alignItems:'center', gap:16, padding:'16px 8px 16px 22px',
        background:'none', border:'none', cursor:'pointer', textAlign:'left', fontFamily:'inherit',
      }}>
        <div style={{ width:42, height:42, borderRadius:21, background:T.paperDeep, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name="history" size={22} color={T.muted} />
        </div>
        <span style={{ flex:1, minWidth:0, fontSize:22, fontWeight:700, color:T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{text}</span>
      </button>
      <button onClick={onRemove} onMouseDown={e=>e.preventDefault()} aria-label={`${text} 삭제`} style={{
        flexShrink:0, padding:'16px 20px', background:'none', border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <Icon name="x" size={22} color={T.muted} />
      </button>
    </div>
  );
}

// 출발/도착 입력 필드 — 모듈 레벨 고정 컴포넌트(매 렌더 remount 방지 → 단일 클릭 동작)
function RouteField({ value, placeholder, dotColor, icon, onClick }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', display:'flex', alignItems:'center', gap:16, background:T.surface,
      border:`2px solid ${value?dotColor:T.line}`, borderRadius:20, padding:'20px 20px',
      cursor:'pointer', boxShadow:T.shadow, textAlign:'left', fontFamily:'inherit',
    }}>
      <div style={{ width:46, height:46, borderRadius:23, background:dotColor, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon name={icon} size={24} />
      </div>
      <span style={{ fontSize:24, fontWeight:800, color:value?T.ink:T.muted }}>
        {(value && value.name) || placeholder}
      </span>
    </button>
  );
}

// ── Screen 2: Route input ───────────────────────────────────
function InputScreen({ region, origin, dest, recents, soundOn, onBack, onSet, onSearch, onRemoveRecent }) {
  const [panel, setPanel] = useState(null); // 'origin' | 'dest' | null

  // 출발지·도착지가 같은 곳이면 검색 전에 차단(있으면 id, 없으면 이름으로 비교)
  const sameSpot = origin && dest &&
    (origin.id && dest.id ? origin.id === dest.id : origin.name === dest.name);

  return (
    <div style={{ background:T.paper, minHeight:'100%', display:'flex', flexDirection:'column', position:'relative' }}>
      {/* 지역 대표 이미지가 반투명하게 깔린 헤더 */}
      <div style={{ position:'relative', background:region.tone, overflow:'hidden' }}>
        <div aria-hidden style={{ position:'absolute', right:-4, top:6, bottom:-6, width:165,
          opacity:0.22, color:'#fff', pointerEvents:'none', display:'flex', alignItems:'flex-end' }}>
          <RegionArt id={region.id} color="#fff" style={{ width:'100%', height:'100%' }} />
        </div>
        <TopBar title={`${region.name} 경로 찾기`} onBack={onBack} bg="transparent" />
      </div>

      <div style={{ padding:'20px 18px', display:'flex', flexDirection:'column', gap:14 }}>
        <RouteField value={origin} placeholder="출발지를 입력하세요" dotColor={T.green} icon="pin" onClick={()=>setPanel('origin')} />
        <RouteField value={dest}   placeholder="도착지를 입력하세요" dotColor={T.red}   icon="nav" onClick={()=>setPanel('dest')} />
        {sameSpot && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'2px 4px',
            color:T.red, fontSize:16, fontWeight:700 }}>
            <Icon name="alert" size={20} color={T.red} /> 출발지와 도착지가 같아요. 다른 곳을 선택해 주세요.
          </div>
        )}
      </div>

      <div style={{ flex:1 }} />
      <div style={{ padding:'18px 18px calc(18px + env(safe-area-inset-bottom))' }}>
        <PrimaryButton icon="search" disabled={!origin || !dest || sameSpot} onClick={onSearch}>경로 찾기</PrimaryButton>
      </div>

      {panel && (
        <SearchPanel
          field={panel} region={region} recents={recents} soundOn={soundOn}
          onClose={()=>setPanel(null)}
          onPick={(p)=>{ onSet(panel, p); setPanel(null); }}
          onRemove={onRemoveRecent}
        />
      )}
    </div>
  );
}

// ── Screen 3: Route recommendation ──────────────────────────
// 경로 화면 빈 상태 메시지 (상황별)
const ROUTE_EMPTY = {
  too_close: { title:'출발지와 도착지가 너무 가까워요', sub:'조금 더 떨어진 곳으로 다시 검색해 보세요' },
  no_coords: { title:'위치 정보를 찾지 못했어요',       sub:'출발지·도착지를 검색해서 다시 선택해 주세요' },
  error:     { title:'경로를 찾지 못했어요',             sub:'출발지·도착지를 바꿔 다시 검색해 보세요' },
};

function RoutesScreen({ origin, dest, routes, note, onBack, onChoose }) {
  const o = (origin && origin.name) || origin, d = (dest && dest.name) || dest;
  const empty = ROUTE_EMPTY[note] || ROUTE_EMPTY.error;
  return (
    <div style={{ background:T.paper, minHeight:'100%', display:'flex', flexDirection:'column' }}>
      <TopBar title={`${o} → ${d}`} subtitle="환승 적은 순" onBack={onBack} />
      <div style={{ padding:'18px 18px 26px', display:'flex', flexDirection:'column', gap:16 }}>
        {note === 'demo' && (
          <div style={{ background:'#FCEAD0', color:T.goldDeep, borderRadius:16, padding:'12px 16px',
            fontSize:15, fontWeight:700, textAlign:'center' }}>
            데모 데이터(대구) · ODsay 키 설정 시 실제 경로로 전환됩니다
          </div>
        )}
        {routes && routes.length
          ? routes.map(rt => <RouteCard key={rt.id} rt={rt} onChoose={()=>onChoose(rt)} />)
          : (
            <div style={{ textAlign:'center', padding:'52px 30px', color:T.muted }}>
              <div style={{ width:84, height:84, borderRadius:'50%', background:T.paperDeep, margin:'0 auto 20px',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="search" size={40} color={T.muted} />
              </div>
              <div style={{ fontSize:21, fontWeight:800, color:T.inkSoft }}>{empty.title}</div>
              <div style={{ fontSize:16, fontWeight:600, marginTop:8 }}>{empty.sub}</div>
              <div style={{ marginTop:28 }}>
                <PrimaryButton tone="ink" icon="back" onClick={onBack}>다시 입력하기</PrimaryButton>
              </div>
            </div>
          )}
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

Object.assign(window, { RegionScreen, InputScreen, RoutesScreen, BrandMark });
