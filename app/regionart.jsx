const REGION_ART = {
  seoul: (
    <g>
      <g fill="currentColor">
        <rect x="12" y="52" width="13" height="20" rx="1" />
        <rect x="27" y="46" width="11" height="26" rx="1" />
        <rect x="82" y="49" width="11" height="23" rx="1" />
        <rect x="95" y="44" width="13" height="28" rx="1" />
        <rect x="58" y="34" width="4" height="38" />
        <ellipse cx="60" cy="35" rx="9" ry="4" />
        <rect x="59.1" y="14" width="1.8" height="20" />
        <circle cx="60" cy="13" r="2.4" />
      </g>
    </g>
  ),
  incheon: (
    <g>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M60 20 L52 50 M60 20 L68 50" />
        <path d="M60 24 L30 50 M60 24 L90 50" />
        <path d="M60 32 L40 50 M60 32 L80 50" />
      </g>
      <g fill="currentColor">
        <rect x="10" y="50" width="100" height="5" rx="2" />
        <path d="M58 18 h4 l-2 -6 z" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7">
        <path d="M12 64 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0" />
      </g>
    </g>
  ),
  busan: (
    <g>
      <g fill="currentColor">
        <rect x="30" y="26" width="4" height="30" />
        <rect x="86" y="26" width="4" height="30" />
        <rect x="8" y="52" width="104" height="4.5" rx="2" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10 40 Q32 22 32 22 Q60 40 88 22 Q88 22 110 40" />
        <path d="M16 52 V44 M24 52 V40 M48 52 V42 M60 52 V40 M72 52 V42 M96 52 V40 M104 52 V44" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7">
        <path d="M10 64 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0" />
      </g>
    </g>
  ),
  daegu: (
    <g fill="currentColor">
      <path d="M6 66 Q40 54 60 56 Q86 58 114 66 Z" />
      <rect x="57" y="20" width="6" height="40" />
      <path d="M54 30 q6 -8 12 0 q-2 7 -6 7 q-4 0 -6 -7 z" />
      <rect x="59.2" y="8" width="1.6" height="12" />
      <circle cx="60" cy="7" r="2" />
    </g>
  ),
  gwangju: (
    <g>
      <g fill="currentColor">
        <path d="M4 70 L34 40 L52 56 L74 28 L116 70 Z" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.45">
        <path d="M70 34 V28 M74 32 V26 M78 34 V30 M82 38 V32" />
      </g>
    </g>
  ),
  daejeon: (
    <g fill="currentColor">
      <path d="M55 60 L57 24 L63 24 L65 60 Z" />
      <rect x="52" y="22" width="16" height="4" rx="2" />
      <path d="M56 22 L60 10 L64 22 Z" />
      <rect x="40" y="60" width="40" height="5" rx="2" />
      <rect x="58.6" y="4" width="2.8" height="8" />
    </g>
  ),
  ulsan: (
    <g>
      <g fill="currentColor">
        <rect x="26" y="22" width="5" height="38" />
        <rect x="84" y="22" width="5" height="38" />
        <rect x="20" y="20" width="76" height="6" rx="1" />
        <rect x="54" y="26" width="6" height="12" />
        <path d="M14 58 L102 58 L94 70 L22 70 Z" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.6">
        <path d="M30 26 L52 26 M63 26 L86 26" />
      </g>
    </g>
  ),
  sejong: (
    <g>
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 46 q14 -16 28 -2 q14 14 28 -2 q14 -16 28 0" />
      </g>
      <g fill="currentColor">
        <rect x="12" y="50" width="96" height="20" rx="2" />
      </g>
      <g fill="rgba(0,0,0,0.18)">
        <rect x="20" y="56" width="4" height="9" rx="1" /><rect x="30" y="56" width="4" height="9" rx="1" />
        <rect x="40" y="56" width="4" height="9" rx="1" /><rect x="50" y="56" width="4" height="9" rx="1" />
        <rect x="60" y="56" width="4" height="9" rx="1" /><rect x="70" y="56" width="4" height="9" rx="1" />
        <rect x="80" y="56" width="4" height="9" rx="1" /><rect x="90" y="56" width="4" height="9" rx="1" />
      </g>
    </g>
  ),
};

function RegionArt({ id, color = '#fff', style }) {
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMax meet"
      style={{ display:'block', color, ...style }}>
      {REGION_ART[id] || REGION_ART.seoul}
    </svg>
  );
}

Object.assign(window, { RegionArt });
