
const T = {
  paper:    '#F4EEE3',
  paperDeep:'#EBE3D4',
  ink:      '#1B2A41',
  inkSoft:  '#46566E',
  surface:  '#FFFFFF',
  gold:     '#F4B23E',
  goldDeep: '#D9961C',
  goldText: '#5A3D05',
  green:    '#1E7A52',
  greenSoft:'#E0EFE7',
  red:      '#D8392C',
  redDeep:  '#B22A1F',
  muted:    '#867C6D',
  line:     '#E7DFCF',
  shadow:   '0 6px 22px rgba(27,42,65,0.10)',
  shadowLg: '0 16px 40px rgba(27,42,65,0.18)',
};

const REGIONS = [
  { id:'seoul',   name:'서울', glyph:'서', tone:'#1B2A41', live:true },
  { id:'incheon', name:'인천', glyph:'인', tone:'#2E6CB5', live:true },
  { id:'busan',   name:'부산', glyph:'해', tone:'#256C8A', live:true },
  { id:'daegu',   name:'대구', glyph:'팔', tone:'#A14736', live:true },
  { id:'gwangju', name:'광주', glyph:'빛', tone:'#3F6B3A', live:true },
  { id:'daejeon', name:'대전', glyph:'한', tone:'#8A5A23', live:true },
  { id:'ulsan',   name:'울산', glyph:'울', tone:'#6B4FA0', live:true },
  { id:'sejong',  name:'세종', glyph:'세', tone:'#2E7D6B', live:true },
];

const PLACES = [
  '수성못', '동대구역', '대구역', '반월당', '중앙로', '두류공원', '서문시장',
  '동성로', '수성구청', '들안길', '황금네거리', '범어네거리', '만촌역',
  '경대병원', '칠성시장', '대구시청', '봉덕시장', '수성시장', '어린이회관',
];

const ROUTES = [
  {
    id: 'r1', recommended: true, transfers: 0, durationMin: 35,
    departAt: '16:10', arriveAt: '16:45', walkMin: 4,
    legs: [
      {
        mode:'bus', line:'급행1', color:T.red,
        stops:['수성못','들안길','수성구민운동장','수성구청','어린이회관','MBC네거리','동구청','동대구역'],
      },
    ],
  },
  {
    id: 'r2', recommended: false, transfers: 1, durationMin: 31,
    departAt: '16:08', arriveAt: '16:39', walkMin: 6,
    legs: [
      { mode:'bus', line:'234', color:'#2E6CB5',
        stops:['수성못','수성시장','경대병원','수성구청'] },
      { mode:'bus', line:'401', color:T.green,
        stops:['수성구청','범어네거리','만촌역','동대구역'] },
    ],
  },
  {
    id: 'r3', recommended: false, transfers: 1, durationMin: 38,
    departAt: '16:05', arriveAt: '16:43', walkMin: 9,
    legs: [
      { mode:'bus', line:'724', color:'#7A4FB0',
        stops:['수성못','황금네거리','범어네거리'] },
      { mode:'bus', line:'937', color:'#C9701F',
        stops:['범어네거리','만촌역','동촌','동대구역'] },
    ],
  },
];

const COORDS = {
  '수성못':        { lat:35.8240, lng:128.6190 },
  '들안길':        { lat:35.8330, lng:128.6210 },
  '수성구민운동장': { lat:35.8400, lng:128.6230 },
  '수성시장':      { lat:35.8470, lng:128.6155 },
  '경대병원':      { lat:35.8550, lng:128.6080 },
  '수성구청':      { lat:35.8570, lng:128.6260 },
  '황금네거리':    { lat:35.8400, lng:128.6320 },
  '범어네거리':    { lat:35.8570, lng:128.6360 },
  '만촌역':        { lat:35.8610, lng:128.6470 },
  '동촌':          { lat:35.8780, lng:128.6520 },
  '어린이회관':    { lat:35.8480, lng:128.6360 },
  'MBC네거리':     { lat:35.8600, lng:128.6300 },
  '동구청':        { lat:35.8750, lng:128.6380 },
  '동대구역':      { lat:35.8794, lng:128.6286 },
};

function flattenJourney(route) {
  const seq = [];
  route.legs.forEach((leg, li) => {
    leg.stops.forEach((name, si) => {
      if (li > 0 && si === 0) return;
      const isAlight = si === leg.stops.length - 1;
      const isLastLeg = li === route.legs.length - 1;
      seq.push({
        name,
        legIndex: li,
        line: leg.line,
        color: leg.color,
        isBoard: si === 0,
        isTransfer: isAlight && !isLastLeg,
        isFinal: isAlight && isLastLeg,
      });
    });
  });
  return seq;
}

function Icon({ name, size = 24, color = 'currentColor', stroke = 2.4 }) {
  const p = { fill:'none', stroke:color, strokeWidth:stroke, strokeLinecap:'round', strokeLinejoin:'round' };
  const paths = {
    back:    <path {...p} d="M15 5l-7 7 7 7" />,
    gear:    <g {...p}><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M6 6l-1.4-1.4M19.4 19.4L18 18M18 6l1.4-1.4M4.6 19.4L6 18"/></g>,
    pin:     <g {...p}><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></g>,
    nav:     <path {...p} d="M3 11l18-7-7 18-2.5-7.5L3 11z" />,
    clock:   <g {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></g>,
    bus:     <g {...p}><rect x="4" y="4" width="16" height="13" rx="2.5"/><path d="M4 12h16M8 17v2M16 17v2"/><circle cx="8.5" cy="14" r="0.4"/><circle cx="15.5" cy="14" r="0.4"/></g>,
    star:    <path {...p} d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />,
    bell:    <g {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8z"/><path d="M13.7 21a2 2 0 01-3.4 0"/></g>,
    alert:   <g {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.2"/></g>,
    check:   <path {...p} d="M4.5 12.5l5 5 10-11" />,
    chevron: <path {...p} d="M9 5l7 7-7 7" />,
    search:  <g {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></g>,
    x:       <path {...p} d="M6 6l12 12M18 6L6 18" />,
    forward: <g {...p}><path d="M5 5l7 7-7 7M13 5l7 7-7 7"/></g>,
    flag:    <g {...p}><path d="M5 21V4M5 4h13l-3 4 3 4H5"/></g>,
    sound:   <g {...p}><path d="M5 9v6h4l5 4V5L9 9H5z"/><path d="M17 8.5a5 5 0 010 7"/></g>,
    mute:    <g {...p}><path d="M5 9v6h4l5 4V5L9 9H5z"/><path d="M22 9l-5 6M17 9l5 6"/></g>,
    history: <g {...p}><path d="M3.5 9A9 9 0 1112 21"/><path d="M3 4v5h5M12 8v4l3 2"/></g>,
    walk:    <g {...p}><circle cx="13" cy="4.5" r="1.6"/><path d="M11 9l3 1.5 1 4M11 9l-1.5 5L7 21M14 14.5L16 21M11 9l-3 2"/></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display:'block', flexShrink:0 }}>
      {paths[name]}
    </svg>
  );
}

Object.assign(window, { T, REGIONS, PLACES, ROUTES, COORDS, flattenJourney, Icon });
