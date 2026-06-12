<div align="center">
  <img src="images/logo.svg" width="96" height="96" alt="어디가수 로고" />
  <h1>어디가수?</h1>
  <p><b>어르신을 위한 지상 대중교통 하차 알림 앱</b></p>
  <p>GPS 지오펜싱으로 내릴 정류장이 가까워지면 자동으로 알려줍니다</p>
  <br/>

  <a href="https://adigasu.onrender.com"><img src="https://img.shields.io/badge/웹으로_바로_열기-F4B23E?style=for-the-badge&logo=googlechrome&logoColor=white" alt="웹 앱 열기"/></a>
  <a href="https://github.com/moonchanju/adigasu/releases"><img src="https://img.shields.io/badge/APK_다운로드-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="APK 다운로드"/></a>

  <br/><br/>

  ![PWA](https://img.shields.io/badge/PWA-설치_가능-5A0FC8?style=flat-square&logo=pwa&logoColor=white)
  ![Node](https://img.shields.io/badge/Node-내장_모듈만-339933?style=flat-square&logo=node.js&logoColor=white)
  ![React](https://img.shields.io/badge/React_18-빌드_없음-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![ODsay](https://img.shields.io/badge/ODsay-대중교통_API-0066CC?style=flat-square)
</div>

---

## 화면

| 지역 선택 | 출발·도착 입력 | 경로 추천 | 하차 안내 |
|:---------:|:--------------:|:---------:|:---------:|
| ![지역 선택](images/regionSelect.png) | ![경로 입력](images/routeInput.png) | ![경로 추천](images/routeRecommendation.png) | ![하차 알림](images/routeAlarm.png) |

---

## 주요 기능

- **GPS 지오펜싱 하차 알림** — 정류장 450m 앞부터 예고, 70m 진입 시 "지금 내리세요" 알림
- **TTS + 진동 + 화면 강조** — 소리(Web Speech API), 진동, 전체화면 점멸로 세 가지 동시 안내
- **iOS 대응** — iPhone Safari는 Vibration API 미지원 → TTS + 화면 색반전 + `aria-live` 스크린리더로 보완
- **지역별 일러스트** — 서울·부산·대구 등 8개 광역시 대표 SVG 삽화 내장
- **최근 정류장 기억** — 지역별 최대 6개 자동 저장 (localStorage)
- **PWA 설치** — 홈 화면에 추가하면 전체화면 앱처럼 동작, 오프라인 캐시 지원

---

## 사용하기

**👉 [https://adigasu.onrender.com](https://adigasu.onrender.com) 에서 바로 이용할 수 있습니다.**

Android는 위 링크 또는 [APK 다운로드](https://github.com/moonchanju/adigasu/releases)로 설치하세요.

---

## 모바일에 앱으로 설치하기

| Android (Chrome) | iOS (Safari) |
|:---:|:---:|
| 주소창 오른쪽 **설치** 버튼 탭 | 공유 버튼 → **홈 화면에 추가** |

---

## 구조

```
adigasu/
├── 어디가수.html       # 앱 진입점 (PWA 메타, CDN React 로드)
├── server.js           # 정적 서빙 + ODsay 프록시 (Node 내장 모듈만, 의존성 0)
├── sw.js               # 서비스 워커 (오프라인 캐시)
├── manifest.json       # PWA 매니페스트
└── app/
    ├── data.jsx        # 디자인 토큰, 지역 목록, 데모 데이터
    ├── regionart.jsx   # 광역시별 SVG 일러스트
    ├── geo.jsx         # GPS watchPosition + Haversine + 지오펜싱 + WakeLock
    ├── api.jsx         # ODsay 프록시 호출 → 내부 경로 포맷 변환
    ├── ui.jsx          # 공용 UI 컴포넌트
    ├── screens.jsx     # 화면별 컴포넌트 (지역·입력·경로·안내·완료)
    ├── navigation.jsx  # 하차 안내 엔진 (TTS·진동·지오펜싱 조율)
    └── main.jsx        # 앱 루트, 화면 전환 상태 관리
```

---

## 배포 (Render)

`render.yaml`이 포함되어 있어 Render에서 바로 배포할 수 있습니다.

1. 이 레포를 Render에 연결하고 시작 명령 `node server.js` 확인
2. 환경변수 설정:

   | 키 | 설명 |
   |---|---|
   | `ODSAY_API_KEY` | ODsay 원본 인증키 |
   | `ODSAY_REFERER` | `https://배포도메인` (ODsay에 URI 등록 필요) |

3. ODsay LAB에서 배포 도메인을 허용 URI로 추가

---

## 알려진 제약

- 역/정류장 **이름 검색만** 지원 (주소 검색은 별도 지오코더 키 필요)
- 지오펜싱 임계값(도착 70m / 예고 450m)은 실제 탑승 테스트로 보정 권장
- **지하철·지하 노선 미지원** — 지상 버스 전용
