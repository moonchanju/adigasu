# 어디가수? — 어르신 지상 대중교통 하차 알림

서울·부산·대구 등 전국 광역시의 **지상 버스** 중심으로, 실시간 GPS 지오펜싱으로 하차 시점을
"곧 내리세요 / 지금 내리세요"로 안내하는 앱(React, 빌드 없는 단일 페이지).

## 실행

```bash
cd adigasu
# 1) 실데이터(ODsay 연동) — 키를 .odsay_key 에 넣고:
echo '발급받은_원본_API키' > .odsay_key
node server.js
# 2) 키 없이 데모(대구 고정 데이터)로만 보기:
node server.js
```

접속: <http://localhost:8000/어디가수.html>

> 실폰에서 GPS를 쓰려면 **HTTPS 또는 localhost**(보안 컨텍스트)여야 합니다. `file://` 직접 열기는 위치 권한이 막힙니다.

## 구조

| 파일 | 역할 |
| --- | --- |
| `server.js` | 정적 서빙 + ODsay 프록시(키 보호·CORS 우회). 의존성 0, Node 내장 모듈만 |
| `app/data.jsx` | 디자인 토큰, 데모 데이터, 아이콘 |
| `app/regionart.jsx` | 8개 광역시 대표 일러스트 SVG (`RegionArt` 컴포넌트) |
| `app/geo.jsx` | Geolocation(`watchPosition`) + Haversine 거리 + 지오펜싱 + 화면 유지(`useWakeLock`) |
| `app/api.jsx` | 프록시 호출 + ODsay 응답 → 내부 경로 데이터 매핑 |
| `app/ui.jsx` / `screens.jsx` / `navigation.jsx` / `main.jsx` | UI · 화면 · 안내 엔진 · 앱 셸 |

데이터 흐름: 역 검색(`/api/stations`) → 좌표 확보 → 경로 탐색(`/api/routes`) →
경로의 정류장 좌표가 그대로 GPS 지오펜싱으로 연결되어 하차 알림.

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `ODSAY_API_KEY` | (없음) | ODsay 원본 인증키. 없으면 `.odsay_key` 파일을 읽고, 그것도 없으면 데모 모드 |
| `ODSAY_REFERER` | `http://localhost:8000` | ODsay에 등록한 URI. 서버 호출 Referer를 등록 URI와 맞춤 |
| `PORT` | `8000` | 서버 포트 |

## 배포(실사용 전환 시)

GPS는 HTTPS가 필수이므로 정적 호스팅(file://)만으론 안 되고, **Node 서버를 올릴 수 있는 호스트**가 필요합니다.

1. Render / Railway / Fly.io 등에 이 폴더를 올리고 시작 명령을 `node server.js` 로 지정
2. 환경변수에 `ODSAY_API_KEY`, `ODSAY_REFERER=https://배포도메인` 설정
3. ODsay LAB에서 **배포 도메인을 URI로 추가 등록**(프로토콜 제외, 예: `myapp.onrender.com`)

## 알려진 제약 및 선택 개선 사항

- **주소 검색**: 현재는 역/정류장 이름 검색만(ODsay). "○○동 △△아파트" 같은 주소→좌표는
  카카오 등 별도 지오코더 키가 추가로 필요.
- **iOS 진동**: iPhone Safari는 Vibration API 미지원 → 소리(TTS)+화면 색상반전+스크린리더(`aria-live`)로 보완됨.
- **지오펜싱 임계값 튜닝**: 도착 70m / 예고 450m / 지나침 판정 130m·여유 50m(`app/geo.jsx`의 `GEO`)는 실제 탑승 테스트로 보정 권장.
