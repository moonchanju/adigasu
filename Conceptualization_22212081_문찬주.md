![logo](images/logo.png)

# [Conceptualization Report] 어르신 지상 대중교통 보조 시스템: 어디가수?

## Revision History

| Revision date | Version # | Description | Author |
|--------------|----------|------------|--------|
| 2026-04-19 | 0.0.1 | 초기 개념화 문서 작성 완료 | 문찬주 |

---

## Contents

1. Introduction
2. Use Case Analysis
3. Domain Analysis
4. User Interface Prototype
5. Glossary
6. References

---

## 1. Introduction

### 1) Summary

대중교통을 이용하는 노인 사용자는 하차 시점을 놓치거나 안내 방송을 듣지 못해 불안과 불편을 겪는다. 이에 따라 앱 **"어디가수?"**는 출발지와 도착지를 입력하면 경로를 탐색하고, 도착 알림과 진동 피드백을 제공하여 노인의 이동 안전을 보조하는 시스템이다.

### 2) Project Purpose

- Open API를 통해 위치 정보를 변환하고 경로를 탐색한다.
- 남은 정류장 수와 예상 도착 시간을 제공한다.
- 목적지 근접 시 알림과 진동을 통해 하차 시점을 안내한다.
- 사용자가 직관적으로 이해할 수 있는 화면을 제공한다.

### 3) Target Market

대중교통 이용 중 하차 정보를 놓치기 쉬운 노인 사용자.

### 4) Implementation Constraints

- 웹/모바일 환경에서 백그라운드 알람이 제한될 수 있다.
- GPS 기반 자동 탑승 감지의 오차가 발생할 수 있다.
- 실시간 교통 정보를 완전히 반영하기 어렵다.
- 외부 API 의존성으로 인해 호출 제한 및 지연이 발생할 수 있다.

---

## 2. Use Case Analysis

### 1) Use Case List

#### Use Case #1 : Input Route
- Actor: User
- Description: 사용자가 출발지와 도착지를 입력하면 시스템이 위치 정보로 변환하고 경로 탐색을 준비한다.

#### Use Case #2 : Calculate Route
- Actor: System
- Description: 외부 API를 호출하여 지상 대중교통 중심의 최적 경로 및 환승 정보를 계산한다.

#### Use Case #3 : Start Navigation
- Actor: User
- Description: 사용자가 탑승 시작 버튼을 누르면 위치 추적과 안내가 시작된다.

#### Use Case #4 : Track Location
- Actor: System / Device
- Description: GPS를 활용하여 실시간 위치를 추적하고 현재/다음 정류장을 판단한다.

#### Use Case #5 : Provide Alert
- Actor: System
- Description: 목적지 또는 환승 지점 근접 시 알림과 진동을 제공한다.

#### Use Case #6 : Display Route Info
- Actor: System
- Description: 현재 위치, 다음 정류장, 남은 정류장 수 등을 화면에 표시한다.

---

## 3. Domain Analysis

### 1) System Context Diagram

![System Context Diagram](images/systemContextDiagram.png)

### 2) Major System Components

- Origin / Destination Input: 출발지와 도착지를 입력받고 위치 정보를 변환한다.
- Route Calculation: 외부 API를 통해 경로 데이터를 수집하고 환승 정보를 구성한다.
- Location Tracking: GPS 데이터를 수집하여 현재 위치와 진도 상태를 판단한다.
- Alert Notification: 근접 알림과 진동 피드백을 제공하여 하차 시점을 안내한다.
- Route Display: 현재 위치, 다음 정류장, 남은 정류장 수 등 정보를 시각화한다.

### 3) Concept of Operation

#### 1) Input Origin / Destination
| 항목 | 내용 |
|------|------|
| Purpose | 출발지와 도착지를 설정 |
| Approach | 사용자 입력 → API 호출 → 좌표 변환 |
| Dynamics | 경로 탐색 시 발생 |
| Goals | 정확한 위치 확보 |

#### 2) Calculate Route
| 항목 | 내용 |
|------|------|
| Purpose | 최적 경로 제공 |
| Approach | API 호출 → 경로 데이터 수집 |
| Dynamics | 입력 후 자동 실행 |
| Goals | 이해하기 쉬운 경로 제공 |

#### 3) Start Trip
| 항목 | 내용 |
|------|------|
| Purpose | 안내 시작 |
| Approach | 버튼 클릭 → 위치 추적 시작 |
| Dynamics | 이동 시작 시 |
| Goals | 정확한 안내 시작 |

#### 4) Track Location
| 항목 | 내용 |
|------|------|
| Purpose | 위치 기반 이동 상태 파악 |
| Approach | GPS 데이터 수집 |
| Dynamics | 이동 중 지속 |
| Goals | 실시간 정보 반영 |

#### 5) Provide Route Information
| 항목 | 내용 |
|------|------|
| Purpose | 이동 정보 제공 |
| Approach | 현재 위치 및 정류장 정보 표시 |
| Dynamics | 실시간 업데이트 |
| Goals | 직관적인 정보 제공 |

#### 6) Alert Notification
| 항목 | 내용 |
|------|------|
| Purpose | 하차 시점 알림 |
| Approach | 거리/정류장 기준 알림 |
| Dynamics | 목적지 근접 시 |
| Goals | 하차 놓침 방지 |

---

## 4. User Interface Prototype

### 1) UI Flow Diagram

지역 선택 → 출발지/도착지 입력 → 경로 목록 / 경로 정보 표시 → 실시간 안내 시작 → 도착 알림 및 진동 제공

### 2) Screen Descriptions

- Screen 1: 출발지와 도착지 입력 화면
- Screen 2: 경로 목록 및 환승 정보 표시 화면
- Screen 3: 실시간 안내 화면(현재 위치, 다음 정류장, 남은 정류장 수 표시)
- Screen 4: 목적지 근접 알림 화면(진동과 함께 시각적 알림 제공)

---

## 5. Glossary

| 용어 | 설명 |
| --- | --- |
| Origin | 출발 위치 |
| Destination | 도착 위치 |
| Route | 이동 경로 |
| Location Data | 위치 정보 |
| Tracking | 위치 추적 |
| External API | 외부 서비스 |
| Alert | 알림 |

---

## 6. References

1. ODsay API
	https://www.odsay.com

2. W3C – Geolocation API
	https://www.w3.org/TR/geolocation-API/

3. Google Web Storage
	https://developers.google.com/web/fundamentals/instant-and-offline/web-storage
