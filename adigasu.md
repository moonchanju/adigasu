# [Project] 어디가수? 
> **노인 대상 대중교통 이용 편의 향상을 위한 실시간 경로 안내 및 도착 알림 서비스**

---

## 0. Revision History

| Revision date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-03-18 | 0.0.1 | First Documentation | Moon Chan-ju |

---

## 1. Business Purpose

### 1.1. Project Background
지하철 이용 중 노인 좌석에서 들려온 "어이쿠, 놓쳤다"라는 한마디에서 시작되었습니다. 일상 속에서 노인들이 승·하차 시 발을 헛디디거나, 환승 노선을 놓쳐 당황하는 모습을 목격하며 **"누군가 미리 도착 정보를 알려준다면 어떨까?"**라는 질문을 던지게 되었습니다.

**"어디가수?"**는 사용자가 입력한 목적지를 기반으로 실시간 위치를 추적하여, 하차 시점에 맞춰 화면 알림과 진동을 제공함으로써 노인들이 보다 안전하고 편리하게 대중교통을 이용하도록 지원합니다.

### 1.2. App Structure & Constraints
![App Structure](images/structure.png)

**[현실적 구현 제약 사항]**
* **백그라운드 실행**: 브라우저 환경의 특성상 앱 이탈 시 지속 동작의 한계 존재.
* **GPS 정확도**: 지하철 내부 등 실시간 위치 추적의 기술적 불안정성.
* **데이터 실시간성**: 공공 API의 데이터 갱신 범위에 따른 정확도 확보의 어려움.
> 본 프로젝트는 위 제약 사항을 고려하여 **프론트엔드 단에서 처리 가능한 핵심 기능**에 집중하여 구현합니다.

### 1.3. Target Market
* 대중교통 이용 시 어려움이나 불안함을 느끼는 노인 계층

### 1.4. Goals
* 대중교통 노선 데이터를 활용한 최적 환승 경로 계산
* 현재 위치 기반의 실시간 정류장(역) 판단
* 목적지 근접 시 시각적 알람 및 진동 피드백 발생

---

## 2. System Context Diagram
![System Context Diagram](images/systemContextDiagram.png)

| Interaction | Description |
| :--- | :--- |
| **User Input** | 출발지/도착지 입력 및 탑승 시작 명령 |
| **System Display** | 경로 정보, 현재/다음 역 정보 표시 |
| **Feedback** | 알림 메시지 제공 및 진동 피드백 실행 |
| **Data Interaction** | 외부 API를 통한 경로/위치 데이터 송수신 |

---

## 3. Use Case List

### 1) Input Route
* **Actor**: User
* **Description**: 사용자는 홈 화면에서 출발지와 도착지를 입력한다. 시스템은 텍스트를 기반으로 위치 정보를 변환하고 데이터를 준비한다.

### 2) Calculate Route
* **Actor**: System
* **Description**: 외부 교통 API를 호출하여 최적 경로, 환승 정보, 정류장 목록, 예상 소요 시간을 수집한다.

### 3) Start Navigation
* **Actor**: User
* **Description**: 경로 확인 후 "탑승 시작" 버튼을 클릭하면 시스템이 위치 수집 및 이동 추적을 시작한다.

### 4) Track Location
* **Actor**: System / Device
* **Description**: 디바이스 GPS를 활용해 일정 주기로 위치를 수집하고 현재/다음 정류장을 판단한다.

### 5) Provide Alert
* **Actor**: System
* **Description**: 목적지 또는 하차 지점 근접 시 화면 표시 및 진동으로 알림을 전달한다.

### 6) Display Route Info
* **Actor**: System
* **Description**: 현재 위치, 남은 정류장 수, 예상 도착 시간을 실시간으로 계산하여 화면에 표시한다.

---

## 4. Concept of Operation (ConOps)

| Phase | Approach | Goals |
| :--- | :--- | :--- |
| **입력 (Input)** | 좌표 변환 API를 통한 위치 정보(좌표) 확보 | 경로 탐색의 정확도 향상 |
| **계산 (Calculate)** | 외부 API 응답 데이터를 기반으로 경로 가공 | 사용자에게 최적화된 경로 정보 제공 |
| **시작 (Start)** | "탑승 시작" 버튼으로 추적 기능 활성화 | 안내 기능의 정확한 타이밍 제어 |
| **추적 (Track)** | 일정 주기로 수집된 GPS와 정류장 데이터 비교 | 실시간 이동 상황 반영 |
| **안내 (Display)** | 단순하고 명확한 UI로 현재 이동 현황 표시 | 노인 사용자의 정보 직관성 확보 |
| **알림 (Alert)** | 잔여 거리 및 정류장 수 기준 알림 조건 판단 | 하차 및 환승 방치 상황 예방 |

---

## 5. Problem Statement

1. **백그라운드 실행 제한**: 웹 브라우저 비활성화 시 위치 추적 및 알림 중단 가능성.
2. **GPS 위치 정확도**: 지하철 내부, 터널 등 음영 지역에서의 데이터 오차 발생.
3. **API 의존성**: 외부 데이터 제공처의 호출 제한 및 실시간 지연 정보 반영의 한계.
4. **상태 판단 불확실성**: 사용자의 실제 탑승 여부를 판단하기 위해 버튼 입력과 위치 데이터를 결합하는 로직 필요.

---

## 6. Glossary

| Term | Description |
| :--- | :--- |
| **Origin / Destination** | 출발 위치 / 도착 위치 |
| **Route** | 이동 경로 (Path) |
| **Location Data** | 위도/경도 기반의 좌표 정보 |
| **Tracking** | 실시간 위치 지속 확인 과정 |
| **External API** | 외부 교통 정보 제공 서비스 (예: ODsay) |
| **Alert** | 도착 전 제공되는 시각적/촉각적 알림 |

---

## 7. References
* [ODsay API](https://www.odsay.com)
* [W3C - Geolocation API Specification](https://www.w3.org/TR/geolocation-API/)
* [Google Developers - Web Storage](https://developers.google.com/web/fundamentals/instant-and-offline/web-storage)