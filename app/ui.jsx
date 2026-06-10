// ─────────────────────────────────────────────────────────────
// 어디가수? — shared UI building blocks
// ─────────────────────────────────────────────────────────────

// Navy top bar with optional back button + title/subtitle.
function TopBar({ title, subtitle, onBack, right, bg = T.ink }) {
  return (
    <div style={{ background:bg, padding:'14px 16px 18px', color:'#fff', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {onBack && (
          <button onClick={onBack} aria-label="뒤로" style={{
            width:48, height:48, borderRadius:24, border:'none', cursor:'pointer',
            background:'rgba(255,255,255,0.14)', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>
            <Icon name="back" size={26} />
          </button>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.15 }}>{title}</div>
          {subtitle && <div style={{ fontSize:16, fontWeight:600, color:'rgba(255,255,255,0.72)', marginTop:2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

// Full-width primary action button (gold). Large hit target.
function PrimaryButton({ children, onClick, disabled, tone = 'gold', icon }) {
  const tones = {
    gold:  { bg:T.gold, color:T.goldText, sh:'0 8px 20px rgba(217,150,28,0.35)' },
    ink:   { bg:T.ink,  color:'#fff',     sh:'0 8px 20px rgba(27,42,65,0.30)' },
    green: { bg:T.green,color:'#fff',     sh:'0 8px 20px rgba(30,122,82,0.30)' },
    white: { bg:'#fff', color:T.red,      sh:'0 8px 20px rgba(0,0,0,0.18)' },
  };
  const s = tones[tone];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:'100%', minHeight:72, border:'none', borderRadius:20, cursor:disabled?'default':'pointer',
      background: disabled ? T.line : s.bg, color: disabled ? T.muted : s.color,
      fontSize:24, fontWeight:800, letterSpacing:'-0.01em',
      display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      boxShadow: disabled ? 'none' : s.sh, transition:'transform .12s ease, background .2s',
      fontFamily:'inherit',
    }}
    onPointerDown={e=>{ if(!disabled) e.currentTarget.style.transform='scale(0.97)'; }}
    onPointerUp={e=>{ e.currentTarget.style.transform='scale(1)'; }}
    onPointerLeave={e=>{ e.currentTarget.style.transform='scale(1)'; }}>
      {icon && <Icon name={icon} size={26} />}
      {children}
    </button>
  );
}

// Small rounded chip (e.g. bus line, transfer count).
function Pill({ children, bg = T.green, color = '#fff', size = 18 }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:999,
      background:bg, color, fontSize:size, fontWeight:800, lineHeight:1, whiteSpace:'nowrap',
    }}>{children}</span>
  );
}

Object.assign(window, { TopBar, PrimaryButton, Pill });
